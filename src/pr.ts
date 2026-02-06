/**
 * Create a new branch, commit files, push, and open a pull request.
 * Used for docspec overwrite (no LLM) and can be referenced by prompts for LLM-driven PRs.
 */

import { execSync } from "child_process";
import * as path from "path";

/**
 * Create a branch name slug from a markdown path (e.g. README.md -> readme, docs/deploy.md -> docs-deploy).
 */
export function branchSlugFromMarkdownPath(mdPath: string): string {
  const normalized = path.normalize(mdPath).replace(/\\/g, "/");
  const withoutExt = normalized.endsWith(".md") ? normalized.slice(0, -3) : normalized;
  return withoutExt.replace(/\//g, "-").replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").toLowerCase();
}

export interface CreatePROptions {
  /** Repo root (default process.cwd()). */
  repoRoot?: string;
  /** Path(s) to add and commit (repo-relative). */
  paths: string[];
  /** Branch name prefix (default "docspec/"). */
  branchPrefix?: string;
  /** Optional slug for branch name (e.g. "readme" for README.md). */
  branchSlug?: string;
  /** Commit message. */
  commitMessage: string;
  /** PR title. */
  prTitle: string;
  /** PR body (optional). */
  prBody?: string;
}

/**
 * Create a new branch, add and commit the given paths, push, and open a PR with gh.
 * Throws if not in a git repo, if gh is not available, or if any git/gh command fails.
 */
export function createBranchCommitAndOpenPR(options: CreatePROptions): void {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const branchPrefix = options.branchPrefix ?? "docspec/";
  const timestamp = Date.now();
  const slug = options.branchSlug ?? "update";
  const branchName = `${branchPrefix}${slug}-${timestamp}`;

  const run = (cmd: string, cwd: string = repoRoot): string => {
    return execSync(cmd, { encoding: "utf-8", cwd }).trim();
  };

  run("git rev-parse --git-dir"); // throws if not a git repo

  const status = run("git status --porcelain");
  const hasChange = options.paths.some(
    (p) => status.includes(p) || status.includes(path.normalize(p).replace(/\\/g, "/"))
  );
  if (!hasChange) {
    throw new Error(
      "No changes to commit. The specified paths are not modified or do not exist."
    );
  }

  run(`git checkout -b ${branchName}`);
  for (const p of options.paths) {
    run(`git add -- ${p}`);
  }
  run(`git commit -m ${JSON.stringify(options.commitMessage)}`);
  run(`git push -u origin ${branchName}`);

  const ghArgs = [
    "pr",
    "create",
    "--title",
    options.prTitle,
    "--body",
    options.prBody ?? options.commitMessage,
  ];
  execSync(`gh ${ghArgs.join(" ")}`, { encoding: "utf-8", cwd: repoRoot, stdio: "inherit" });
}
