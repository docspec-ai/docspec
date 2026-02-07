/**
 * Creates docspec files and optionally markdown files from the template.
 */
import { getDocspecTemplate } from "./constants";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";
import { markdownToDocspecPath } from "./path-utils";

const EMPTY_MARKDOWN_CONTENT = "";

export interface EnsureDocAndDocspecOptions {
  /** If true, overwrite existing docspec file (markdown is never overwritten). If false, skip when docspec exists. */
  overwrite?: boolean;
}

export interface EnsureDocAndDocspecResult {
  markdownCreated: boolean;
  docspecCreated: boolean;
}

/**
 * Ensure both the markdown file and its docspec exist. Creates an empty markdown file and a
 * docspec from the template when missing. Markdown is only created when missing (never overwritten).
 * Docspec is overwritten when options.overwrite is true.
 * @param markdownPath Repo-relative markdown path (e.g. README.md, docs/deploy.md).
 * @param repoRoot Repo root directory.
 * @param options.overwrite If true, overwrite existing docspec; if false, skip when docspec exists. Does not affect markdown.
 * @returns Which files were created or overwritten.
 */
export async function ensureDocAndDocspec(
  markdownPath: string,
  repoRoot: string,
  options: EnsureDocAndDocspecOptions = {}
): Promise<EnsureDocAndDocspecResult> {
  const overwrite = options.overwrite ?? false;
  const normalized = path.normalize(markdownPath).replace(/\\/g, "/");
  const mdPath = normalized.endsWith(".md") ? normalized : normalized + ".md";
  const docspecPath = markdownToDocspecPath(mdPath);
  const baseDir = path.resolve(repoRoot);
  const mdFull = path.join(baseDir, mdPath);
  const docspecFull = path.join(baseDir, docspecPath);

  let markdownCreated = false;
  let docspecCreated = false;

  const mdExists = await fs.access(mdFull).then(() => true, () => false);
  if (!mdExists) {
    await fs.mkdir(path.dirname(mdFull), { recursive: true });
    await fs.writeFile(mdFull, EMPTY_MARKDOWN_CONTENT, "utf-8");
    markdownCreated = true;
    logger.debug(`Created markdown: ${mdPath}`);
  }

  const docspecExists = await fs.access(docspecFull).then(() => true, () => false);
  if (!docspecExists || overwrite) {
    const content = getDocspecTemplate(mdPath);
    await fs.mkdir(path.dirname(docspecFull), { recursive: true });
    await fs.writeFile(docspecFull, content, "utf-8");
    docspecCreated = true;
    logger.debug(`Created or overwrote docspec: ${docspecPath}`);
  }

  return { markdownCreated, docspecCreated };
}

/**
 * Generate docspec content as a string (for library use)
 * @param targetFilePath Path to the target markdown file (e.g., "README.md")
 */
export function generateDocspecContent(targetFilePath: string): string {
  return getDocspecTemplate(targetFilePath);
}
