import { parseFormatFile, getFormatFilePath, ParsedFormat } from "./format-parser";
import { logger } from "./logger";

let cachedFormat: ParsedFormat | null = null;

/**
 * Load and cache the format definition
 */
function loadFormat(): ParsedFormat {
  if (cachedFormat) {
    logger.debug("Using cached format definition");
    return cachedFormat;
  }
  
  try {
    logger.debug("Loading format definition");
    const formatPath = getFormatFilePath();
    logger.debug(`Format file path: ${formatPath}`);
    cachedFormat = parseFormatFile(formatPath);
    logger.debug(`Format loaded: ${cachedFormat.sections.length} section(s) found`);
    return cachedFormat;
  } catch (error) {
    logger.debug(`Error loading format: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(
      `Failed to load docspec format file: ${error instanceof Error ? error.message : String(error)}\n` +
      `Make sure docspec-format.md exists in the project root.`
    );
  }
}

/**
 * Required section headers for docspec files
 */
export const REQUIRED_SECTIONS = (() => {
  const format = loadFormat();
  return format.sections.map(s => s.name) as readonly string[];
})();

/**
 * Boilerplate template text for each section
 */
export const SECTION_BOILERPLATE: Record<string, string> = (() => {
  const format = loadFormat();
  const boilerplate: Record<string, string> = {};
  for (const section of format.sections) {
    boilerplate[section.name] = section.boilerplate;
  }
  return boilerplate;
})();

/**
 * Generate the full docspec template
 * @param targetFilePath The path to the target markdown file (e.g., "README.md")
 */
export function getDocspecTemplate(targetFilePath: string): string {
  logger.debug(`Generating template for target file: ${targetFilePath}`);
  const format = loadFormat();
  
  // Replace {{TARGET_FILE}} in template
  let template = format.template.replace(/\{\{TARGET_FILE\}\}/g, targetFilePath);
  logger.debug("Replaced {{TARGET_FILE}} placeholder in template");
  
  // Handle agent instructions if present
  let agentInstructionsSection = "";
  if (format.agentInstructions) {
    logger.debug("Agent instructions found, including in template");
    // Replace {{TARGET_FILE}} in agent instructions
    const agentContent = format.agentInstructions.replace(/\{\{TARGET_FILE\}\}/g, targetFilePath);
    agentInstructionsSection = `## AGENT INSTRUCTIONS\n\n${agentContent}\n\n`;
  } else {
    logger.debug("No agent instructions found");
  }
  
  // Replace {{AGENT_INSTRUCTIONS}} placeholder
  template = template.replace(/\{\{AGENT_INSTRUCTIONS\}\}/g, agentInstructionsSection);
  logger.debug("Replaced {{AGENT_INSTRUCTIONS}} placeholder");
  
  // Generate sections
  logger.debug(`Generating ${format.sections.length} section(s)`);
  const sections = format.sections.map((section) => {
    return `## ${section.number}. ${section.name}\n\n${section.boilerplate}`;
  }).join("\n\n");
  
  // Replace {{SECTIONS}} placeholder
  template = template.replace(/\{\{SECTIONS\}\}/g, sections);
  logger.debug("Replaced {{SECTIONS}} placeholder");
  
  logger.debug(`Template generation complete: ${template.length} characters`);
  return template;
}

