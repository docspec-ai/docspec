import { getDocspecTemplate } from "./constants";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Generate a new docspec file at the specified path
 * @param filePath Path where the docspec file should be created
 * @param name Name of the document (used in the header)
 */
export async function generateDocspec(filePath: string, name?: string): Promise<void> {
  // Extract name from file path if not provided
  const docName = name || extractNameFromPath(filePath);
  
  // Generate the template content
  const content = getDocspecTemplate(docName);
  
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
 * @param name Name of the document
 */
export function generateDocspecContent(name: string): string {
  return getDocspecTemplate(name);
}

/**
 * Extract a document name from a file path
 */
function extractNameFromPath(filePath: string): string {
  const basename = path.basename(filePath, ".docspec.md");
  // Convert kebab-case, snake_case, or camelCase to Title Case
  return basename
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

