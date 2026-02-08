import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { docspecToMarkdownPath, isDocspecPath, markdownToDocspecPath } from "./path-utils";

const DEFAULT_MAX_DOCSPECS = 10;
const DEFAULT_MAX_DIFF_CHARS = 120000;

const DOCSPEC_PROMPT_FILENAME = "docspec-prompt.md";
const LEGACY_AGENT_PROMPT_FILENAME = "agent-prompt.md";
const LEGACY_REVIEW_TASK_FILENAME = "review-task.md";

/**
 * Strip the ## AGENT INSTRUCTIONS section from docspec markdown so the prompt
 * does not repeat the same text for each docspec (it appears once in docspec-prompt.md).
 */
function stripAgentInstructionsSection(docspecContent: string): string {
  const heading = "## AGENT INSTRUCTIONS";
  const idx = docspecContent.indexOf(heading);
  if (idx < 0) return docspecContent;
  const afterHeading = idx + heading.length;
  const nextSectionMatch = docspecContent.slice(afterHeading).match(/\n## \d+\. /);
  const endOfBlock = nextSectionMatch
    ? afterHeading + nextSectionMatch.index!
    : docspecContent.length;
  const before = docspecContent.slice(0, idx).trimEnd();
  const after = docspecContent.slice(endOfBlock).replace(/^\n+/, "");
  return (before + (after ? "\n\n" + after : "")).trim();
}

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

export interface DocspecReviewOptions {
  /** Markdown file path(s) to review (repo-relative). When set, only these docspecs are included; no PR diff. */
  reviewFiles?: string[];
  /** List of changed file paths (repo-relative). If not set and no reviewFiles, base and merge must be set. */
  changedFiles?: string[];
  /** Base SHA for git diff (e.g. PR base). */
  base?: string;
  /** Merge SHA for git diff (e.g. PR merge commit). */
  merge?: string;
  /** Max number of docspecs to include. */
  maxDocspecs?: number;
  /** Max characters of diff to include. */
  maxDiffChars?: number;
  /** Repo root (default process.cwd()). */
  repoRoot?: string;
}

/**
 * List changed files via git diff --name-only base...merge
 */
function listChangedFiles(base: string, merge: string, repoRoot: string): string[] {
  const out = execSync(`git diff --name-only ${base}...${merge}`, {
    encoding: "utf-8",
    cwd: repoRoot,
  }).trim();
  return out ? out.split("\n").map((line) => line.trim()).filter(Boolean) : [];
}

/**
 * Get diff text via git diff base...merge, truncated if needed.
 */
function getDiffText(base: string, merge: string, repoRoot: string, maxChars: number): string {
  let diff: string;
  try {
    diff = execSync(`git diff ${base}...${merge}`, { encoding: "utf-8", cwd: repoRoot });
  } catch {
    return "";
  }
  if (diff.length > maxChars) {
    diff = diff.slice(0, maxChars) + "\n\n[DIFF TRUNCATED]\n";
  }
  return diff;
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
 * Find candidate docspec files to process given changed files.
 * Strategy:
 * 1) Changed files that are under .docspec/ and end with .docspec.md are included.
 * 2) For each other changed file, walk up from its directory to repo root; at each level,
 *    include docspecs whose target markdown lives in that directory.
 */
function findCandidateDocspecs(
  repoRoot: string,
  docspecPaths: Array<{ docspecPath: string; targetMdPath: string }>,
  changedFiles: string[],
  maxDocspecs: number
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const add = (p: string) => {
    const norm = path.normalize(p).replace(/\\/g, "/");
    if (!seen.has(norm)) {
      seen.add(norm);
      candidates.push(p);
    }
  };

  // 1) Directly changed docspecs (under .docspec/)
  for (const f of changedFiles) {
    const normalized = path.normalize(f).replace(/\\/g, "/");
    if (isDocspecPath(normalized)) {
      const full = path.join(repoRoot, f);
      add(full);
    }
  }

  // 2) For each changed file, walk up directory and include docspecs whose target markdown is in that directory
  for (const f of changedFiles) {
    const normalized = path.normalize(f).replace(/\\/g, "/");
    if (normalized.startsWith(".docspec/")) continue; // already handled
    const fullPath = path.join(repoRoot, f);
    let dir = path.dirname(fullPath);
    while (true) {
      const relDir = path.relative(repoRoot, dir).replace(/\\/g, "/") || ".";
      for (const { docspecPath, targetMdPath } of docspecPaths) {
        const targetDir = path.dirname(targetMdPath).replace(/\\/g, "/") || ".";
        if (targetDir === relDir) {
          add(docspecPath);
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir || path.relative(repoRoot, parent).startsWith("..")) break;
      dir = parent;
    }
    // Include if the changed file is the target markdown
    for (const { docspecPath, targetMdPath } of docspecPaths) {
      if (path.normalize(f).replace(/\\/g, "/") === path.normalize(targetMdPath).replace(/\\/g, "/")) {
        add(docspecPath);
      }
    }
  }

  return candidates.slice(0, maxDocspecs);
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
    const normalized = path.normalize(f).replace(/\\/g, "/");
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
 * Build the review prompt (sync markdown with docspecs). When reviewFiles is set, only those
 * docspecs are included (no diff). Otherwise uses PR changed files and diff.
 * Covers Case A (existing docspec+markdown), Case B (new docs from changes), Case C (existing markdown without docspec).
 * If options.outputPath is set, writes the prompt to that file.
 */
export async function buildDocspecReviewPrompt(
  options: DocspecReviewOptions & { outputPath?: string }
): Promise<{ prompt: string; outputPath: string | null }> {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const docspecDir = path.join(repoRoot, ".docspec");

  let changedFiles = options.changedFiles ?? [];
  let diffText = "";
  const useReviewFiles = options.reviewFiles && options.reviewFiles.length > 0;

  if (useReviewFiles) {
    diffText = "(no diff available)";
  } else if (changedFiles.length === 0 && options.base && options.merge) {
    changedFiles = listChangedFiles(options.base, options.merge, repoRoot);
    diffText = getDiffText(
      options.base,
      options.merge,
      repoRoot,
      options.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS
    );
  } else if (options.changedFiles && options.changedFiles.length > 0 && options.base && options.merge) {
    diffText = getDiffText(
      options.base,
      options.merge,
      repoRoot,
      options.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS
    );
  }

  const allDocspecPaths = await findAllDocspecPaths(docspecDir);
  const docspecWithTargets = allDocspecPaths
    .map((p) => {
      const rel = path.relative(repoRoot, p).replace(/\\/g, "/");
      const targetMd = docspecToMarkdownPath(rel);
      return { docspecPath: p, targetMdPath: targetMd };
    })
    .filter(({ docspecPath }) => fsSync.existsSync(docspecPath));

  let candidates: string[];
  if (useReviewFiles) {
    const maxDocspecs = options.maxDocspecs ?? DEFAULT_MAX_DOCSPECS;
    candidates = [];
    for (const mdPath of options.reviewFiles!) {
      const relMd = path.normalize(mdPath).replace(/\\/g, "/");
      const docspecRel = markdownToDocspecPath(relMd);
      const docspecFull = path.join(repoRoot, docspecRel);
      if (fsSync.existsSync(docspecFull)) {
        candidates.push(docspecFull);
        if (candidates.length >= maxDocspecs) break;
      }
    }
  } else {
    candidates = findCandidateDocspecs(
      repoRoot,
      docspecWithTargets,
      changedFiles,
      options.maxDocspecs ?? DEFAULT_MAX_DOCSPECS
    );
  }

  const maxDocspecs = options.maxDocspecs ?? DEFAULT_MAX_DOCSPECS;
  const scopePaths = useReviewFiles ? (options.reviewFiles!.map((p) => path.normalize(p).replace(/\\/g, "/")) as string[]) : changedFiles;
  const markdownWithoutDocspec = findMarkdownWithoutDocspec(repoRoot, scopePaths, maxDocspecs);

  const introLine = useReviewFiles
    ? "Review the following docspec file(s) and their target markdown. For each, check if the markdown satisfies the docspec and update if needed:"
    : "The following docspec files were discovered based on the PR changes. For each docspec, check if its target markdown file needs to be updated based on the code changes:";

  const fileOnlyInstruction =
    useReviewFiles &&
    "When reviewing specific files (no PR diff), your primary task is to compare each target markdown below to its docspec's Expected Structure (section 3) and update the markdown so section order and content match the docspec. Do not skip this by analyzing only recent commits or other files.";

  const parts: string[] = [
    "Merged PR diff (context):",
    "<diff>",
    diffText,
    "</diff>",
    "",
  ];

  if (candidates.length > 0) {
    parts.push(introLine, "", "");
    if (fileOnlyInstruction) {
      parts.push(fileOnlyInstruction, "", "");
    }
  } else if (markdownWithoutDocspec.length > 0 || (diffText && diffText !== "(no diff available)")) {
    parts.push(
      "No existing docspec+markdown pairs in scope for this run. Use the diff and the task list below to assess whether to add new documentation (Case B) or add docspecs for existing markdown (Case C).",
      "",
      ""
    );
  }

  let added = 0;
  for (const docspecPath of candidates) {
    const relDocspec = path.relative(repoRoot, docspecPath).replace(/\\/g, "/");
    const targetMdPath = docspecToMarkdownPath(relDocspec);
    const targetFull = path.join(repoRoot, targetMdPath);
    try {
      await fs.access(targetFull);
    } catch {
      continue;
    }
    let docspecContent = await fs.readFile(docspecPath, "utf-8");
    docspecContent = stripAgentInstructionsSection(docspecContent);
    const mdContent = await fs.readFile(targetFull, "utf-8");
    parts.push(
      `## Docspec: ${relDocspec}`,
      `Target markdown: ${targetMdPath}`,
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
    added++;
  }

  const hasContent =
    added > 0 ||
    markdownWithoutDocspec.length > 0 ||
    (diffText.length > 0 && diffText !== "(no diff available)");

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

  const prompt = parts.join("\n");
  const outPath = options.outputPath ? path.resolve(repoRoot, options.outputPath) : null;
  if (outPath && prompt) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, prompt, "utf-8");
  }
  return { prompt, outputPath: outPath };
}
