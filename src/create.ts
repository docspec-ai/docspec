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
 */
export async function generateDocspec(inputPath: string): Promise<void> {
  logger.debug(`Generating docspec for: ${inputPath}`);
  const { docspecPath, markdownPath } = resolveInput(inputPath);
  logger.debug(`Docspec file: ${docspecPath}, target markdown: ${markdownPath}`);

  const content = getDocspecTemplate(markdownPath);
  logger.debug(`Generated template with ${content.length} characters`);

  const dir = path.dirname(docspecPath);
  if (dir !== ".") {
    logger.debug(`Creating directory: ${dir}`);
    await fs.mkdir(dir, { recursive: true });
  }

  logger.debug(`Writing file: ${docspecPath}`);
  await fs.writeFile(docspecPath, content, "utf-8");
  logger.debug(`File written successfully: ${docspecPath}`);
}

/**
 * Generate docspec content as a string (for library use)
 * @param targetFilePath Path to the target markdown file (e.g., "README.md")
 */
export function generateDocspecContent(targetFilePath: string): string {
  return getDocspecTemplate(targetFilePath);
}
