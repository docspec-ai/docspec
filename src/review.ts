import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { docspecToMarkdownPath, isDocspecPath, markdownToDocspecPath } from "./path-utils";

const DEFAULT_MAX_DOCSPECS = 10;
const DEFAULT_BATCH_MAX_DOCSPECS = 40;
const DEFAULT_MAX_DIFF_CHARS = 120000;
const DEFAULT_BATCH_MAX_DIFF_CHARS = 20000;
const DEFAULT_MAX_CHANGED_FILES = 400;
const DIRECT_HIT_SCORE = 100;
const DEEPEST_MATCH_SCORE = 1.0;
const ANCESTOR_MATCH_SCORE = 0.1;

const DOCSPEC_PROMPT_FILENAME = "docspec-prompt.md";
const LEGACY_AGENT_PROMPT_FILENAME = "agent-prompt.md";
const LEGACY_REVIEW_TASK_FILENAME = "review-task.md";

/**
 * Get docspec prompt content from .docspec/docspec-prompt.md (or .docspec/agent-prompt.md /
 * .docspec/review-task.md for backward compatibility), seeding from the bundled docspec-prompt.md if none exist.
 */
async function getDocspecPromptContent(repoRoot: string): Promise<string> {
  const docspecDir = path.join(repoRoot, ".docspec");
  const promptPath = path.join(docspecDir, DOCSPEC_PROMPT_FILENAME);
  const legacyAgentPath = path.join(docspecDir, LEGACY_AGENT_PROMPT_FILENAME);
  const legacyReviewPath = path.join(docspecDir, LEGACY_REVIEW_TASK_FILENAME);
  const defaultPath = path.join(__dirname, "..", "docspec-prompt.md");

  try {
    return await fs.readFile(promptPath, "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  for (const legacyPath of [legacyAgentPath, legacyReviewPath]) {
    try {
      const legacyContent = await fs.readFile(legacyPath, "utf-8");
      await fs.mkdir(docspecDir, { recursive: true });
      await fs.writeFile(promptPath, legacyContent, "utf-8");
      return legacyContent;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  const defaultContent = await fs.readFile(defaultPath, "utf-8");
  await fs.mkdir(docspecDir, { recursive: true });
  await fs.writeFile(promptPath, defaultContent, "utf-8");
  return defaultContent;
}

/**
 * Ensure .docspec/docspec-prompt.md exists, seeding from bundled default (or legacy agent-prompt.md /
 * review-task.md) if missing. Call this from `docspec create` so both template and prompt are seeded on first run.
 */
export async function ensureDocspecPromptFile(repoRoot: string): Promise<void> {
  await getDocspecPromptContent(repoRoot);
}

export type ReviewMode = "inline" | "batch";

export interface DocspecReviewOptions {
  /** Markdown file path(s) to review (repo-relative). When set, only these docspecs are included; no PR diff. */
  reviewFiles?: string[];
  /** List of changed file paths (repo-relative). If not set and no reviewFiles, base and merge must be set. */
  changedFiles?: string[];
  /** Base SHA for git diff (e.g. PR base or last-run marker). */
  base?: string;
  /** Merge SHA for git diff (e.g. PR merge commit or HEAD). */
  merge?: string;
  /** Base branch name (e.g. main, develop). Used to tell the agent which branch to target when creating PRs. */
  baseRef?: string;
  /** Max number of docspecs to include. */
  maxDocspecs?: number;
  /** Max characters of diff/diffstat to include. */
  maxDiffChars?: number;
  /** Max number of changed file paths to list in batch mode. */
  maxChangedFiles?: number;
  /** Repo root (default process.cwd()). */
  repoRoot?: string;
  /**
   * Prompt shape. "inline" (default) embeds full diff + docspec/markdown content.
   * "batch" emits a compact summary (diffstat + path pairs) for daily multi-commit windows.
   */
  mode?: ReviewMode;
  /**
   * Commit SHAs to exclude when computing the changed-file set (e.g. previous docspec-bot
   * squash merges). Files touched only by excluded commits are dropped; files also touched
   * by a non-excluded commit stay in scope.
   */
  excludeCommits?: string[];
}

interface DocspecEntry {
  docspecPath: string;
  targetMdPath: string;
  /** Repo-relative directory of the target markdown ('.' for root). */
  targetDir: string;
}

interface RankedCandidate {
  docspecPath: string;
  targetMdPath: string;
  score: number;
  relatedFiles: string[];
}

/**
 * Normalize a path to forward-slash form.
 */
function norm(p: string): string {
  return path.normalize(p).replace(/\\/g, "/");
}

/**
 * List changed files via git diff --name-only base...merge (no exclusion).
 */
function listChangedFiles(base: string, merge: string, repoRoot: string): string[] {
  try {
    const out = execSync(`git diff --name-only ${base}...${merge}`, {
      encoding: "utf-8",
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out ? out.split("\n").map((line) => line.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * List changed files in base..merge, excluding commits in excludeSet.
 * Uses a single `git log --name-only` walk. A file stays in scope if any
 * non-excluded commit in the window touched it.
 */
function listChangedFilesExcluding(
  base: string,
  merge: string,
  repoRoot: string,
  excludeSet: Set<string>
): string[] {
  if (excludeSet.size === 0) {
    return listChangedFiles(base, merge, repoRoot);
  }
  let out: string;
  try {
    // %x00%H separates commits; --name-only lists files under each commit.
    out = execSync(`git log ${base}..${merge} --name-only --format='%x00%H'`, {
      encoding: "utf-8",
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return listChangedFiles(base, merge, repoRoot);
  }
  const files = new Set<string>();
  // Split on NUL; first chunk may be empty if log starts with NUL.
  const chunks = out.split("\0");
  for (const chunk of chunks) {
    if (!chunk) continue;
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const sha = lines[0];
    if (excludeSet.has(sha)) continue;
    for (let i = 1; i < lines.length; i++) {
      files.add(lines[i]);
    }
  }
  return Array.from(files).sort();
}

/**
 * Get diff text via git diff base...merge, truncated if needed.
 * Excludes common non-code files (lock files, generated files) to reduce diff size.
 */
function getDiffText(base: string, merge: string, repoRoot: string, maxChars: number): string {
  let diff: string;
  try {
    // Exclude common lock files and generated files that inflate diff size
    // Using :! shorthand to avoid shell metacharacter issues with :(exclude)
    // Each pattern is quoted to prevent shell glob expansion
    const excludePatterns = [
      ':!package-lock.json',
      ':!yarn.lock',
      ':!pnpm-lock.yaml',
      ':!poetry.lock',
      ':!Pipfile.lock',
      ':!Gemfile.lock',
      ':!composer.lock',
      ':!Cargo.lock',
      ':!go.sum',
      ':!*.min.js',
      ':!*.min.css',
      ':!dist/',
      ':!build/',
    ].map(p => `'${p}'`).join(' ');
    diff = execSync(`git diff ${base}...${merge} -- . ${excludePatterns}`, {
      encoding: "utf-8",
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
  if (diff.length > maxChars) {
    diff = diff.slice(0, maxChars) + "\n\n[DIFF TRUNCATED]\n";
  }
  return diff;
}

/**
 * Get a compact diffstat for base..merge, optionally restricted to a file list.
 */
function getDiffStat(
  base: string,
  merge: string,
  repoRoot: string,
  maxChars: number,
  paths?: string[]
): string {
  try {
    const pathArgs =
      paths && paths.length > 0
        ? " -- " + paths.map((p) => `'${p.replace(/'/g, "'\\''")}'`).join(" ")
        : "";
    let stat = execSync(`git diff --stat ${base}...${merge}${pathArgs}`, {
      encoding: "utf-8",
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (stat.length > maxChars) {
      stat = stat.slice(0, maxChars) + "\n\n[DIFFSTAT TRUNCATED]\n";
    }
    return stat;
  } catch {
    return "";
  }
}

/**
 * Find all docspec paths under .docspec/ in the repo.
 */
async function findAllDocspecPaths(docspecDir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await fs.readdir(docspecDir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(docspecDir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findAllDocspecPaths(full)));
      } else if (entry.isFile() && entry.name.endsWith(".docspec.md")) {
        files.push(full);
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return files;
}

/**
 * Build DocspecEntry list from absolute docspec paths.
 */
function buildDocspecEntries(
  repoRoot: string,
  allDocspecPaths: string[]
): DocspecEntry[] {
  return allDocspecPaths
    .map((p) => {
      const rel = norm(path.relative(repoRoot, p));
      const targetMd = docspecToMarkdownPath(rel);
      const targetDir = path.dirname(targetMd).replace(/\\/g, "/") || ".";
      return {
        docspecPath: p,
        targetMdPath: targetMd,
        targetDir: targetDir === "" ? "." : targetDir,
      };
    })
    .filter(({ docspecPath }) => fsSync.existsSync(docspecPath));
}

/**
 * True if `dir` is an ancestor of (or equal to) `fileDir`. Both are repo-relative
 * forward-slash paths; '.' means repo root.
 */
function isAncestorDir(dir: string, fileDir: string): boolean {
  if (dir === ".") return true;
  if (fileDir === ".") return false;
  return fileDir === dir || fileDir.startsWith(dir + "/");
}

/**
 * Depth of a repo-relative directory ('.' = 0, 'a' = 1, 'a/b' = 2).
 */
function dirDepth(dir: string): number {
  if (dir === "." || dir === "") return 0;
  return dir.split("/").filter(Boolean).length;
}

/**
 * Rank candidate docspecs for a set of changed files.
 *
 * Scoring:
 * - Direct hit (changed file is the docspec itself, or is the target markdown): DIRECT_HIT_SCORE
 * - Deepest ancestor match (docspec target dir is the deepest ancestor of the changed file): DEEPEST_MATCH_SCORE
 * - Shallower ancestor match: ANCESTOR_MATCH_SCORE
 *
 * Each changed file contributes to every ancestor-matching docspec (deepest + shallower).
 * Sort by score desc, then by docspec path asc for determinism. Cap at maxDocspecs.
 */
function rankCandidateDocspecs(
  repoRoot: string,
  entries: DocspecEntry[],
  changedFiles: string[],
  maxDocspecs: number
): RankedCandidate[] {
  const scores = new Map<string, { entry: DocspecEntry; score: number; related: Set<string> }>();

  const ensure = (entry: DocspecEntry) => {
    const key = norm(entry.docspecPath);
    let rec = scores.get(key);
    if (!rec) {
      rec = { entry, score: 0, related: new Set() };
      scores.set(key, rec);
    }
    return rec;
  };

  // Index entries by target dir for fast ancestor lookup.
  const byDir = new Map<string, DocspecEntry[]>();
  for (const entry of entries) {
    const list = byDir.get(entry.targetDir) ?? [];
    list.push(entry);
    byDir.set(entry.targetDir, list);
  }

  for (const f of changedFiles) {
    const normalized = norm(f);

    // Direct hit: changed file is a docspec.
    if (isDocspecPath(normalized)) {
      const full = path.join(repoRoot, normalized);
      const entry = entries.find((e) => norm(e.docspecPath) === norm(full));
      if (entry) {
        const rec = ensure(entry);
        rec.score += DIRECT_HIT_SCORE;
        rec.related.add(normalized);
      }
      continue;
    }

    // Direct hit: changed file is a target markdown.
    for (const entry of entries) {
      if (norm(entry.targetMdPath) === normalized) {
        const rec = ensure(entry);
        rec.score += DIRECT_HIT_SCORE;
        rec.related.add(normalized);
      }
    }

    // Ancestor matches: every entry whose targetDir is an ancestor of the file's dir.
    const fileDir = path.dirname(normalized).replace(/\\/g, "/") || ".";
    const matching: DocspecEntry[] = [];
    for (const [dir, list] of byDir) {
      if (isAncestorDir(dir, fileDir === "" ? "." : fileDir)) {
        matching.push(...list);
      }
    }
    if (matching.length === 0) continue;

    // Find the deepest matching targetDir depth.
    let maxDepth = -1;
    for (const entry of matching) {
      const d = dirDepth(entry.targetDir);
      if (d > maxDepth) maxDepth = d;
    }
    for (const entry of matching) {
      const d = dirDepth(entry.targetDir);
      const weight = d === maxDepth ? DEEPEST_MATCH_SCORE : ANCESTOR_MATCH_SCORE;
      const rec = ensure(entry);
      rec.score += weight;
      rec.related.add(normalized);
    }
  }

  const ranked: RankedCandidate[] = Array.from(scores.values()).map((rec) => ({
    docspecPath: rec.entry.docspecPath,
    targetMdPath: rec.entry.targetMdPath,
    score: rec.score,
    relatedFiles: Array.from(rec.related).sort(),
  }));

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return norm(a.docspecPath).localeCompare(norm(b.docspecPath));
  });

  return ranked.slice(0, maxDocspecs);
}

/**
 * Find markdown files in scope that have no docspec (Case C).
 * From the given paths, include .md files that are not under .docspec/ and for which
 * the corresponding .docspec/<path>.docspec.md does not exist. Capped at maxDocspecs.
 */
function findMarkdownWithoutDocspec(
  repoRoot: string,
  paths: string[],
  maxDocspecs: number
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const f of paths) {
    const normalized = norm(f);
    if (!normalized.endsWith(".md") || normalized.startsWith(".docspec/") || normalized.endsWith(".docspec.md")) {
      continue;
    }
    const docspecRel = markdownToDocspecPath(normalized);
    const docspecFull = path.join(repoRoot, docspecRel);
    if (fsSync.existsSync(docspecFull)) continue;
    const mdFull = path.join(repoRoot, normalized);
    if (!fsSync.existsSync(mdFull)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= maxDocspecs) break;
  }
  return result;
}

/**
 * Build the batch-mode preamble: git range, how to inspect, incremental commit protocol.
 * Appended AFTER the user-customizable docspec-prompt so it supersedes step-7 timing.
 */
function buildBatchPreamble(options: {
  base?: string;
  merge?: string;
  baseRef?: string;
  ranked: RankedCandidate[];
}): string {
  const base = options.base ?? "<base>";
  const merge = options.merge ?? "<head>";
  const baseRef = options.baseRef ?? "main";
  const total = options.ranked.length;

  return [
    "## Batch mode instructions",
    "",
    "This is a **daily batch** review covering a multi-commit window. The full diff and",
    "markdown contents are NOT inlined below (they would exceed context limits). You must",
    "inspect the repository yourself.",
    "",
    `**Git range**: \`${base}..${merge}\``,
    `**Base branch for PR**: \`${baseRef}\``,
    `**Docspecs in scope (ranked, most-affected first)**: ${total}`,
    "",
    "### How to inspect changes",
    "",
    `- Changed files are listed below. For detail on a path: \`git diff ${base}..${merge} -- <path>\``,
    `- Diffstat of the window is included below as a summary only.`,
    "- Read each docspec and its target markdown with the Read tool before deciding whether to edit.",
    "- Work the ranked list **in order**. If you run out of time, the least-affected tail is dropped;",
    "  the next code change in that area will re-surface it.",
    "",
    "### Incremental commit protocol (REQUIRED — supersedes step 7 timing above)",
    "",
    "The run may be cut off mid-way. Commit and push frequently so work is never lost, and",
    "open the PR **immediately after the first commit** so a PR always exists if the run fails:",
    "",
    "1. **Before any edits**, create the working branch locally (do not push yet):",
    "   ```",
    `   git fetch origin ${baseRef}`,
    `   git checkout -b docspec/docs-sync-$(date +%Y%m%d-%H%M%S) origin/${baseRef}`,
    "   ```",
    "   Never reuse an existing `docspec/` branch. If you make no file changes at all, do not",
    "   push the branch and do not open a PR.",
    "2. After **each** docspec is brought into compliance (or you decide no change is needed",
    "   and move on after an actual edit batch): if you have uncommitted edits, commit them",
    "   with a scoped message (e.g. `docs: sync WORKFLOWS.md with docspec`) and `git push -u origin HEAD`.",
    "3. **On the very first push**, immediately open a **draft** PR before reviewing any further",
    "   docspecs. This guarantees a PR exists even if the job is killed mid-run:",
    "   ```",
    `   gh pr create --draft --base ${baseRef} --title "docs: docspec daily sync" --body "$(cat <<'EOF'`,
    "   ## Docspec daily sync",
    "",
    "   ### Reviewed",
    "   - [x] <path>",
    "",
    "   ### Changed",
    "   - <path>",
    "",
    "   ### Remaining",
    "   - [ ] <path>",
    "   EOF",
    "   )\"",
    "   ```",
    "4. Keep the PR body updated as a running checklist (reviewed / changed / remaining) after",
    "   each subsequent commit. Push checklist updates too.",
    "5. When the ranked list is exhausted (or you stop), run `gh pr ready` to un-draft. If you",
    "   made no file changes at all, do not create a branch or PR.",
    "6. Do not provide any text output beyond tool use — files are modified directly.",
    "",
  ].join("\n");
}

/**
 * Build the review prompt (sync markdown with docspecs). When reviewFiles is set, only those
 * docspecs are included (no diff). Otherwise uses PR/window changed files and diff.
 * Covers Case A (existing docspec+markdown), Case B (new docs from changes), Case C (existing markdown without docspec).
 * If options.outputPath is set, writes the prompt to that file.
 */
export async function buildDocspecReviewPrompt(
  options: DocspecReviewOptions & { outputPath?: string }
): Promise<{ prompt: string; outputPath: string | null }> {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const docspecDir = path.join(repoRoot, ".docspec");
  const mode: ReviewMode = options.mode ?? "inline";
  const isBatch = mode === "batch";

  const defaultMaxDocspecs = isBatch ? DEFAULT_BATCH_MAX_DOCSPECS : DEFAULT_MAX_DOCSPECS;
  const defaultMaxDiffChars = isBatch ? DEFAULT_BATCH_MAX_DIFF_CHARS : DEFAULT_MAX_DIFF_CHARS;
  const maxDocspecs = options.maxDocspecs ?? defaultMaxDocspecs;
  const maxDiffChars = options.maxDiffChars ?? defaultMaxDiffChars;
  const maxChangedFiles = options.maxChangedFiles ?? DEFAULT_MAX_CHANGED_FILES;

  let changedFiles = options.changedFiles ?? [];
  let diffText = "";
  const useReviewFiles = options.reviewFiles && options.reviewFiles.length > 0;
  const excludeSet = new Set((options.excludeCommits ?? []).filter(Boolean));

  if (useReviewFiles) {
    diffText = "(no diff available)";
  } else if (changedFiles.length === 0 && options.base && options.merge) {
    changedFiles =
      excludeSet.size > 0
        ? listChangedFilesExcluding(options.base, options.merge, repoRoot, excludeSet)
        : listChangedFiles(options.base, options.merge, repoRoot);
    if (isBatch) {
      diffText = getDiffStat(
        options.base,
        options.merge,
        repoRoot,
        maxDiffChars,
        excludeSet.size > 0 ? changedFiles : undefined
      );
    } else {
      diffText = getDiffText(options.base, options.merge, repoRoot, maxDiffChars);
    }
  } else if (options.changedFiles && options.changedFiles.length > 0 && options.base && options.merge) {
    if (isBatch) {
      diffText = getDiffStat(options.base, options.merge, repoRoot, maxDiffChars, options.changedFiles);
    } else {
      diffText = getDiffText(options.base, options.merge, repoRoot, maxDiffChars);
    }
  }

  const allDocspecPaths = await findAllDocspecPaths(docspecDir);
  const entries = buildDocspecEntries(repoRoot, allDocspecPaths);

  let ranked: RankedCandidate[] = [];
  if (useReviewFiles) {
    for (const mdPath of options.reviewFiles!) {
      const relMd = norm(mdPath);
      const docspecRel = markdownToDocspecPath(relMd);
      const docspecFull = path.join(repoRoot, docspecRel);
      if (fsSync.existsSync(docspecFull)) {
        ranked.push({
          docspecPath: docspecFull,
          targetMdPath: relMd,
          score: DIRECT_HIT_SCORE,
          relatedFiles: [relMd],
        });
        if (ranked.length >= maxDocspecs) break;
      }
    }
  } else {
    ranked = rankCandidateDocspecs(repoRoot, entries, changedFiles, maxDocspecs);
  }

  const scopePaths = useReviewFiles
    ? (options.reviewFiles!.map((p) => norm(p)) as string[])
    : changedFiles;
  const markdownWithoutDocspec = findMarkdownWithoutDocspec(repoRoot, scopePaths, maxDocspecs);

  const parts: string[] = [];

  if (isBatch) {
    // Compact batch prompt: range + changed files + diffstat + path pairs.
    parts.push(
      "Context (recent changes, batch summary):",
      "",
      `Git range: ${options.base ?? "?"}..${options.merge ?? "?"}`,
      ""
    );

    const listedFiles = changedFiles.slice(0, maxChangedFiles);
    parts.push(
      `## Changed files (${changedFiles.length}${changedFiles.length > maxChangedFiles ? `, showing first ${maxChangedFiles}` : ""})`,
      "",
      ...listedFiles.map((f) => `- ${f}`),
      ""
    );
    if (changedFiles.length > maxChangedFiles) {
      parts.push(
        `... and ${changedFiles.length - maxChangedFiles} more. Use \`git diff --name-only ${options.base}..${options.merge}\` for the full list.`,
        ""
      );
    }

    parts.push(
      "## Diffstat",
      "",
      "<diffstat>",
      diffText || "(empty)",
      "</diffstat>",
      ""
    );

    if (ranked.length > 0) {
      parts.push(
        "## Ranked docspecs to review (most-affected first)",
        "",
        "For each entry, read the docspec and target markdown, compare against Expected Structure",
        "and Document Purpose, and update the markdown if needed. Related files are the changed",
        "files that contributed to this docspec's score.",
        ""
      );
      for (const c of ranked) {
        const relDocspec = norm(path.relative(repoRoot, c.docspecPath));
        // Only include candidates whose target markdown currently exists.
        const targetFull = path.join(repoRoot, c.targetMdPath);
        if (!fsSync.existsSync(targetFull)) continue;
        const relatedSample = c.relatedFiles.slice(0, 8);
        const relatedExtra =
          c.relatedFiles.length > 8 ? ` (+${c.relatedFiles.length - 8} more)` : "";
        parts.push(
          `### ${relDocspec}`,
          `- Target markdown: \`${c.targetMdPath}\``,
          `- Score: ${c.score}`,
          `- Related changed files: ${relatedSample.map((f) => `\`${f}\``).join(", ")}${relatedExtra}`,
          ""
        );
      }
    } else if (markdownWithoutDocspec.length > 0 || (diffText && diffText !== "(no diff available)")) {
      parts.push(
        "No existing docspec+markdown pairs in scope for this run. Use the changed-file list and",
        "the task list below to assess whether to add new documentation (Case B) or add docspecs",
        "for existing markdown (Case C).",
        "",
        ""
      );
    }
  } else {
    // Inline mode: full diff + inlined docspec/markdown content (legacy shape).
    const introLine =
      "For each docspec below, compare its target markdown to the docspec (Expected Structure and Document Purpose) and update the markdown if it does not satisfy the docspec. Any diff or change list is context only.";

    parts.push(
      "Context (recent changes, if any):",
      "<diff>",
      diffText,
      "</diff>",
      "",
    );

    if (ranked.length > 0) {
      parts.push(introLine, "", "");
    } else if (markdownWithoutDocspec.length > 0 || (diffText && diffText !== "(no diff available)")) {
      parts.push(
        "No existing docspec+markdown pairs in scope for this run. Use the diff and the task list below to assess whether to add new documentation (Case B) or add docspecs for existing markdown (Case C).",
        "",
        ""
      );
    }

    for (const c of ranked) {
      const relDocspec = norm(path.relative(repoRoot, c.docspecPath));
      const targetFull = path.join(repoRoot, c.targetMdPath);
      try {
        await fs.access(targetFull);
      } catch {
        continue;
      }
      const docspecContent = await fs.readFile(c.docspecPath, "utf-8");
      const mdContent = await fs.readFile(targetFull, "utf-8");
      parts.push(
        `## Docspec: ${relDocspec}`,
        `Target markdown: ${c.targetMdPath}`,
        "",
        "<docspec>",
        docspecContent,
        "</docspec>",
        "",
        "<markdown>",
        mdContent,
        "</markdown>",
        ""
      );
    }
  }

  // Count how many candidates actually have existing target markdown (for hasContent).
  let added = 0;
  for (const c of ranked) {
    if (fsSync.existsSync(path.join(repoRoot, c.targetMdPath))) added++;
  }

  const hasContent =
    added > 0 ||
    markdownWithoutDocspec.length > 0 ||
    (diffText.length > 0 && diffText !== "(no diff available)" && diffText !== "(empty)");

  if (!hasContent) {
    return { prompt: "", outputPath: null };
  }

  if (markdownWithoutDocspec.length > 0) {
    parts.push(
      "## Markdown files in scope without a docspec",
      "",
      "The following markdown files are in scope but have no corresponding .docspec file. Consider whether each should have a docspec; if so, run `docspec create <path>` and include the new docspec file in your PR.",
      "",
      ...markdownWithoutDocspec.map((md) => `- ${md}`),
      "",
      ""
    );
  }

  const docspecPromptContent = await getDocspecPromptContent(repoRoot);
  parts.push(docspecPromptContent.trim());

  // Include base branch info if provided (inline mode; batch preamble also states it).
  if (options.baseRef && !isBatch) {
    parts.push("", `**Base branch for PR**: ${options.baseRef}`);
  }

  // Batch preamble goes AFTER the user prompt so the incremental-commit protocol
  // supersedes step 7's end-of-run branch/PR timing.
  if (isBatch) {
    parts.push(
      "",
      buildBatchPreamble({
        base: options.base,
        merge: options.merge,
        baseRef: options.baseRef,
        ranked,
      })
    );
  }

  const prompt = parts.join("\n");
  const outPath = options.outputPath ? path.resolve(repoRoot, options.outputPath) : null;
  if (outPath && prompt) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, prompt, "utf-8");
  }
  return { prompt, outputPath: outPath };
}
