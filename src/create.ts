/**
 * Creates docspec files and optionally markdown files from the template.
 */
import { getDocspecTemplate } from "./constants";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";
import { markdownToDocspecPath } from "./path-utils";

const EMPTY_MARKDOWN_CONTENT = "";

/** Path to bundled boilerplate (package root when running from dist/). */
const BUNDLE_DIR = path.join(__dirname, "..");

export interface CopyLatestBoilerplateResult {
  promptCopied: boolean;
  templateCopied: boolean;
}

/**
 * Copy the latest bundled docspec-prompt.md and docspec-template.md into .docspec/.
 * Overwrites existing files so the project gets the current boilerplate.
 */
export async function copyLatestBoilerplate(repoRoot: string): Promise<CopyLatestBoilerplateResult> {
  const docspecDir = path.join(repoRoot, ".docspec");
  const promptSrc = path.join(BUNDLE_DIR, "docspec-prompt.md");
  const templateSrc = path.join(BUNDLE_DIR, "docspec-template.md");
  const promptDest = path.join(docspecDir, "docspec-prompt.md");
  const templateDest = path.join(docspecDir, "docspec-template.md");

  let promptCopied = false;
  let templateCopied = false;

  await fs.mkdir(docspecDir, { recursive: true });

  try {
    const promptContent = await fs.readFile(promptSrc, "utf-8");
    await fs.writeFile(promptDest, promptContent, "utf-8");
    promptCopied = true;
    logger.debug(`Copied docspec-prompt.md to .docspec/`);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(
        `Bundled docspec-prompt.md not found at ${promptSrc}. Ensure the docspec package is installed correctly.`
      );
    }
    throw e;
  }

  try {
    const templateContent = await fs.readFile(templateSrc, "utf-8");
    await fs.writeFile(templateDest, templateContent, "utf-8");
    templateCopied = true;
    logger.debug(`Copied docspec-template.md to .docspec/`);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(
        `Bundled docspec-template.md not found at ${templateSrc}. Ensure the docspec package is installed correctly.`
      );
    }
    throw e;
  }

  return { promptCopied, templateCopied };
}

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
