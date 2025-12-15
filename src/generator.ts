import { getDocspecTemplate } from "./constants";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Generate a new docspec file at the specified path
 * @param filePath Path where the docspec file should be created (must end with .docspec.md)
 */
export async function generateDocspec(filePath: string): Promise<void> {
  // Extract target file path (replace .docspec.md with .md)
  const targetFilePath = filePath.replace(/\.docspec\.md$/, ".md");
  const targetFileName = path.basename(targetFilePath);
  
  // Generate the template content
  const content = getDocspecTemplate(targetFileName);
  
  // Ensure the directory exists (recursive: true is safe even if dir exists)
  const dir = path.dirname(filePath);
  if (dir !== ".") {
    await fs.mkdir(dir, { recursive: true });
  }
  
  // Write the file
  await fs.writeFile(filePath, content, "utf-8");
}

/**
 * Generate docspec content as a string (for library use)
 * @param targetFilePath Path to the target markdown file (e.g., "README.md")
 */
export function generateDocspecContent(targetFilePath: string): string {
  return getDocspecTemplate(targetFilePath);
}

