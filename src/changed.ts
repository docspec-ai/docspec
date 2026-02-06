import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { docspecToMarkdownPath, isDocspecPath } from "./path-utils";

const DEFAULT_MAX_DOCSPECS = 10;
const DEFAULT_MAX_DIFF_CHARS = 120000;

export interface DocspecChangedOptions {
  /** List of changed file paths (repo-relative). If not set, base and merge must be set. */
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
 * Build the changed prompt (sync markdown with docspecs from PR changes) and return it.
 * If options.outputPath is set, writes the prompt to that file.
 */
export async function buildDocspecChangedPrompt(
  options: DocspecChangedOptions & { outputPath?: string }
): Promise<{ prompt: string; outputPath: string | null }> {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const docspecDir = path.join(repoRoot, ".docspec");

  let changedFiles = options.changedFiles ?? [];
  let diffText = "";

  if (changedFiles.length === 0 && options.base && options.merge) {
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

  const candidates = findCandidateDocspecs(
    repoRoot,
    docspecWithTargets,
    changedFiles,
    options.maxDocspecs ?? DEFAULT_MAX_DOCSPECS
  );

  const parts: string[] = [
    "Merged PR diff (context):",
    "<diff>",
    diffText || "(no diff available)",
    "</diff>",
    "",
    "The following docspec files were discovered based on the PR changes. For each docspec, check if its target markdown file needs to be updated based on the code changes:",
    "",
  ];

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
    const docspecContent = await fs.readFile(docspecPath, "utf-8");
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

  if (added === 0) {
    return { prompt: "", outputPath: null };
  }

  parts.push(
    "Task:",
    "1. Explore the repository using your available tools to understand the codebase context",
    "2. Understand how the code changes in the diff relate to each docspec's requirements",
    "3. For each markdown file listed above, check if it already satisfies its docspec given the code changes",
    "4. Only update markdown files if changes are actually necessary to satisfy their docspecs - avoid making unnecessary changes",
    "5. Use the Edit tool to modify markdown files directly if changes are needed",
    "6. Do not provide any text output - files are modified directly using tools"
  );

  const prompt = parts.join("\n");
  const outPath = options.outputPath ? path.resolve(repoRoot, options.outputPath) : null;
  if (outPath && prompt) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, prompt, "utf-8");
  }
  return { prompt, outputPath: outPath };
}
