/**
 * Creates docspec files from the template (file generation).
 * For the "docspec generate" command and prompt building, see generate.ts.
 */
import { getDocspecTemplate } from "./constants";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";
import {
  markdownToDocspecPath,
  docspecToMarkdownPath,
  isDocspecPath,
} from "./path-utils";

/**
 * Resolve input path to docspec path and markdown path.
 * Accepts either a markdown path (e.g. README.md, docs/deploy.md) or a docspec path under .docspec/.
 */
function resolveInput(inputPath: string): {
  docspecPath: string;
  markdownPath: string;
} {
  const normalized = path.normalize(inputPath).replace(/\\/g, "/");
  if (isDocspecPath(normalized)) {
    return {
      docspecPath: normalized,
      markdownPath: docspecToMarkdownPath(normalized),
    };
  }
  // Treat as markdown path (e.g. README.md or docs/deploy.md)
  const mdPath = normalized.endsWith(".md") ? normalized : normalized + ".md";
  return {
    docspecPath: markdownToDocspecPath(mdPath),
    markdownPath: mdPath,
  };
}

/**
 * Generate a new docspec file. Accepts either a markdown path (e.g. README.md, docs/deploy.md)
 * or a docspec path under .docspec/ (e.g. .docspec/README.docspec.md).
 * Writes to .docspec/ using the convention: markdown P.md -> .docspec/P.docspec.md
 * @param inputPath Markdown or docspec path (repo-relative).
 * @param repoRoot Optional repo root; when provided, the file is written under this directory instead of process.cwd().
 */
export async function generateDocspec(inputPath: string, repoRoot?: string): Promise<void> {
  logger.debug(`Generating docspec for: ${inputPath}`);
  const { docspecPath, markdownPath } = resolveInput(inputPath);
  logger.debug(`Docspec file: ${docspecPath}, target markdown: ${markdownPath}`);

  const content = getDocspecTemplate(markdownPath);
  logger.debug(`Generated template with ${content.length} characters`);

  const baseDir = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const docspecFull = path.join(baseDir, docspecPath);
  const dir = path.dirname(docspecFull);
  if (dir !== baseDir && dir !== ".") {
    logger.debug(`Creating directory: ${dir}`);
    await fs.mkdir(dir, { recursive: true });
  }

  logger.debug(`Writing file: ${docspecFull}`);
  await fs.writeFile(docspecFull, content, "utf-8");
  logger.debug(`File written successfully: ${docspecFull}`);
}

/**
 * Generate docspec content as a string (for library use)
 * @param targetFilePath Path to the target markdown file (e.g., "README.md")
 */
export function generateDocspecContent(targetFilePath: string): string {
  return getDocspecTemplate(targetFilePath);
}
