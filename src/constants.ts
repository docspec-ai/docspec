import { getTemplateContent } from "./template";
import { logger } from "./logger";

/**
 * Generate docspec content from the template file by replacing {{TARGET_FILE}} with the target path.
 * @param targetFilePath The path to the target markdown file (e.g., "README.md")
 */
export function getDocspecTemplate(targetFilePath: string): string {
  logger.debug(`Generating template for target file: ${targetFilePath}`);
  const content = getTemplateContent();
  const result = content.replace(/\{\{TARGET_FILE\}\}/g, targetFilePath);
  logger.debug("Replaced {{TARGET_FILE}} placeholder in template");
  return result.trimEnd();
}
