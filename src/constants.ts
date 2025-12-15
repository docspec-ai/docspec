import { parseFormatFile, getFormatFilePath, ParsedFormat } from "./format-parser";

let cachedFormat: ParsedFormat | null = null;

/**
 * Load and cache the format definition
 */
function loadFormat(): ParsedFormat {
  if (cachedFormat) {
    return cachedFormat;
  }
  
  try {
    const formatPath = getFormatFilePath();
    cachedFormat = parseFormatFile(formatPath);
    return cachedFormat;
  } catch (error) {
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
  const format = loadFormat();
  
  // Replace {{TARGET_FILE}} in template
  let template = format.template.replace(/\{\{TARGET_FILE\}\}/g, targetFilePath);
  
  // Handle agent instructions if present
  let agentInstructionsSection = "";
  if (format.agentInstructions) {
    // Replace {{TARGET_FILE}} in agent instructions
    const agentContent = format.agentInstructions.replace(/\{\{TARGET_FILE\}\}/g, targetFilePath);
    agentInstructionsSection = `## AGENT INSTRUCTIONS\n\n${agentContent}\n\n`;
  }
  
  // Replace {{AGENT_INSTRUCTIONS}} placeholder
  template = template.replace(/\{\{AGENT_INSTRUCTIONS\}\}/g, agentInstructionsSection);
  
  // Generate sections
  const sections = format.sections.map((section) => {
    return `## ${section.number}. ${section.name}\n\n${section.boilerplate}`;
  }).join("\n\n");
  
  // Replace {{SECTIONS}} placeholder
  template = template.replace(/\{\{SECTIONS\}\}/g, sections);
  
  return template;
}

