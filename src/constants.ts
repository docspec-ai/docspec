import { parseFormatFile, getFormatFilePath, ParsedFormat } from "./format-parser";
import { logger } from "./logger";

let cachedFormat: ParsedFormat | null = null;
let cachedRequiredSections: readonly string[] | null = null;
let cachedSectionBoilerplate: Record<string, string> | null = null;

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
 * Get required sections (lazy-loaded)
 */
function getRequiredSections(): readonly string[] {
  if (cachedRequiredSections === null) {
    const format = loadFormat();
    cachedRequiredSections = format.sections.map(s => s.name) as readonly string[];
  }
  return cachedRequiredSections;
}

/**
 * Get section boilerplate (lazy-loaded)
 */
function getSectionBoilerplate(): Record<string, string> {
  if (cachedSectionBoilerplate === null) {
    const format = loadFormat();
    cachedSectionBoilerplate = {};
    for (const section of format.sections) {
      cachedSectionBoilerplate[section.name] = section.boilerplate;
    }
  }
  return cachedSectionBoilerplate;
}

/**
 * Required section headers for docspec files
 * Lazily loaded on first access to ensure logger is configured
 */
export const REQUIRED_SECTIONS = new Proxy([] as readonly string[], {
  get(target, prop) {
    const sections = getRequiredSections();
    if (typeof prop === 'string') {
      const index = parseInt(prop, 10);
      if (!isNaN(index)) {
        return sections[index];
      }
      if (prop === 'length') {
        return sections.length;
      }
      if (prop === 'forEach' || prop === 'map' || prop === 'filter' || prop === 'includes' || prop === 'indexOf' || prop === 'slice' || prop === 'join') {
        return (sections as any)[prop].bind(sections);
      }
    }
    return (sections as any)[prop];
  },
  ownKeys() {
    return Object.keys(getRequiredSections());
  },
  getOwnPropertyDescriptor(target, prop) {
    const sections = getRequiredSections();
    if (typeof prop === 'string') {
      const index = parseInt(prop, 10);
      if (!isNaN(index) && index >= 0 && index < sections.length) {
        return { enumerable: true, configurable: true, value: sections[index] };
      }
      if (prop === 'length') {
        return { enumerable: false, configurable: false, value: sections.length };
      }
    }
    return undefined;
  },
  has(target, prop) {
    const sections = getRequiredSections();
    if (typeof prop === 'string') {
      const index = parseInt(prop, 10);
      if (!isNaN(index) && index >= 0 && index < sections.length) {
        return true;
      }
      if (prop === 'length') {
        return true;
      }
    }
    return prop in sections;
  }
}) as readonly string[];

/**
 * Boilerplate template text for each section
 * Lazily loaded on first access to ensure logger is configured
 */
export const SECTION_BOILERPLATE: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(target, prop) {
    const boilerplate = getSectionBoilerplate();
    return boilerplate[prop as string];
  },
  set(target, prop, value) {
    const boilerplate = getSectionBoilerplate();
    boilerplate[prop as string] = value;
    return true;
  },
  ownKeys() {
    return Object.keys(getSectionBoilerplate());
  },
  getOwnPropertyDescriptor(target, prop) {
    const boilerplate = getSectionBoilerplate();
    if (prop in boilerplate) {
      return { enumerable: true, configurable: true, value: boilerplate[prop as string] };
    }
    return undefined;
  },
  has(target, prop) {
    const boilerplate = getSectionBoilerplate();
    return prop in boilerplate;
  }
});

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

