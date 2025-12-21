import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";

export interface ParsedSection {
  name: string;
  boilerplate: string;
  number: number;
}

export interface ParsedFormat {
  sections: ParsedSection[];
  template: string;
  agentInstructions?: string;
}

/**
 * Parse the docspec format file
 */
export function parseFormatFile(formatFilePath: string): ParsedFormat {
  logger.debug(`Reading format file: ${formatFilePath}`);
  const content = fs.readFileSync(formatFilePath, "utf-8");
  logger.debug(`Format file read: ${content.length} characters`);
  return parseFormatContent(content);
}

/**
 * Parse format content from a string
 */
export function parseFormatContent(content: string): ParsedFormat {
  const lines = content.split("\n");
  logger.debug(`Parsing format content: ${lines.length} lines`);
  
  // Look for AGENT INSTRUCTIONS section first
  let agentInstructions: string | undefined;
  let agentInstructionsStart = -1;
  let agentInstructionsEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "## AGENT INSTRUCTIONS") {
      agentInstructionsStart = i;
      logger.debug(`Found AGENT INSTRUCTIONS section at line ${i + 1}`);
      break;
    }
  }
  
  // If AGENT INSTRUCTIONS section found, extract it
  if (agentInstructionsStart >= 0) {
    // Find the end of the AGENT INSTRUCTIONS section
    // It ends at the next section header (##) or end of file
    for (let i = agentInstructionsStart + 1; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      // Check if this is a section header (starts with ##)
      if (trimmedLine.match(/^##\s+/)) {
        agentInstructionsEnd = i;
        break;
      }
    }
    
    if (agentInstructionsEnd < 0) {
      agentInstructionsEnd = lines.length;
    }
    
    // Extract content between header and next section
    const agentLines = lines.slice(agentInstructionsStart + 1, agentInstructionsEnd);
    let agentContent = agentLines.join("\n");
    
    // Remove separator lines (---) from the content
    agentContent = agentContent
      .split("\n")
      .filter(line => line.trim() !== "---")
      .join("\n")
      .trim();
    
    if (agentContent) {
      agentInstructions = agentContent;
      logger.debug(`Extracted agent instructions: ${agentContent.length} characters`);
    }
  } else {
    logger.debug("No AGENT INSTRUCTIONS section found");
  }
  
  // Find all section headers: ## N. Section Name
  const sectionHeaderRegex = /^##\s+(\d+)\.\s+(.+)$/;
  const sectionHeaders: Array<{ lineIndex: number; number: number; name: string }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    // Skip the AGENT INSTRUCTIONS header if it exists
    if (lines[i].trim() === "## AGENT INSTRUCTIONS") {
      continue;
    }
    
    const match = lines[i].match(sectionHeaderRegex);
    if (match) {
      sectionHeaders.push({
        lineIndex: i,
        number: parseInt(match[1], 10),
        name: match[2].trim(),
      });
      logger.debug(`Found section header: ${match[1]}. ${match[2].trim()} at line ${i + 1}`);
    }
  }
  
  if (sectionHeaders.length === 0) {
    logger.debug("No section headers found in format file");
    throw new Error("No section headers found in format file. Expected format: ## N. Section Name");
  }
  
  logger.debug(`Found ${sectionHeaders.length} section header(s)`);
  
  // Extract template: everything before the first numbered section header
  // But exclude the AGENT INSTRUCTIONS section if it exists
  const firstSectionLine = sectionHeaders[0].lineIndex;
  let templateBeforeSections: string;
  
  if (agentInstructionsStart >= 0 && agentInstructionsStart < firstSectionLine) {
    // AGENT INSTRUCTIONS is between title and first section
    // Template is everything before AGENT INSTRUCTIONS
    templateBeforeSections = lines.slice(0, agentInstructionsStart).join("\n").trim();
    logger.debug("Template extracted before AGENT INSTRUCTIONS section");
  } else {
    // No AGENT INSTRUCTIONS, use everything before first section
    templateBeforeSections = lines.slice(0, firstSectionLine).join("\n").trim();
    logger.debug("Template extracted before first section");
  }
  
  const template = templateBeforeSections + "\n\n{{AGENT_INSTRUCTIONS}}\n\n{{SECTIONS}}\n";
  logger.debug(`Template length: ${template.length} characters`);
  
  // Extract sections
  const sections: ParsedSection[] = [];
  
  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i];
    const nextHeaderLine = i < sectionHeaders.length - 1 
      ? sectionHeaders[i + 1].lineIndex 
      : lines.length;
    
    // Extract content between this header and the next header
    const sectionLines = lines.slice(header.lineIndex + 1, nextHeaderLine);
    let sectionContent = sectionLines.join("\n");
    
    // Remove separator lines (---) from the content
    sectionContent = sectionContent
      .split("\n")
      .filter(line => line.trim() !== "---")
      .join("\n")
      .trim();
    
    logger.debug(`Extracted section "${header.name}": ${sectionContent.length} characters`);
    sections.push({
      name: header.name,
      boilerplate: sectionContent,
      number: header.number,
    });
  }
  
  // Sort sections by number to ensure correct order
  sections.sort((a, b) => a.number - b.number);
  logger.debug(`Parsed ${sections.length} section(s) from format file`);
  
  return {
    sections,
    template,
    agentInstructions,
  };
}

/**
 * Get the path to the format file
 */
export function getFormatFilePath(): string {
  // In development: use src/docspec-format.md
  // In built package: use dist/docspec-format.md or root docspec-format.md
  // Try multiple locations
  const possiblePaths = [
    path.join(__dirname, "..", "docspec-format.md"), // Root of project
    path.join(__dirname, "docspec-format.md"), // In dist/ if copied there
    path.join(process.cwd(), "docspec-format.md"), // Current working directory
  ];
  
  logger.debug(`Searching for format file in ${possiblePaths.length} possible location(s)`);
  for (const formatPath of possiblePaths) {
    logger.debug(`Checking: ${formatPath}`);
    if (fs.existsSync(formatPath)) {
      logger.debug(`Format file found: ${formatPath}`);
      return formatPath;
    }
  }
  
  logger.debug("Format file not found in any of the expected locations");
  // Default to root if none found (will throw error if file doesn't exist)
  return possiblePaths[0];
}

