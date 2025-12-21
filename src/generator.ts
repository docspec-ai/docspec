import { getDocspecTemplate } from "./constants";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger";

/**
 * Generate a new docspec file at the specified path
 * @param filePath Path where the docspec file should be created (must end with .docspec.md)
 */
export async function generateDocspec(filePath: string): Promise<void> {
  logger.debug(`Generating docspec file: ${filePath}`);
  
  // Extract target file path (replace .docspec.md with .md)
  const targetFilePath = filePath.replace(/\.docspec\.md$/, ".md");
  const targetFileName = path.basename(targetFilePath);
  logger.debug(`Target file: ${targetFileName}`);
  
  // Generate the template content
  logger.debug("Generating template content");
  const content = getDocspecTemplate(targetFileName);
  logger.debug(`Generated template with ${content.length} characters`);
  
  // Ensure the directory exists (recursive: true is safe even if dir exists)
  const dir = path.dirname(filePath);
  if (dir !== ".") {
    logger.debug(`Creating directory: ${dir}`);
    await fs.mkdir(dir, { recursive: true });
    logger.debug(`Directory created or already exists: ${dir}`);
  }
  
  // Write the file
  logger.debug(`Writing file: ${filePath}`);
  await fs.writeFile(filePath, content, "utf-8");
  logger.debug(`File written successfully: ${filePath}`);
}

/**
 * Generate docspec content as a string (for library use)
 * @param targetFilePath Path to the target markdown file (e.g., "README.md")
 */
export function generateDocspecContent(targetFilePath: string): string {
  return getDocspecTemplate(targetFilePath);
}

