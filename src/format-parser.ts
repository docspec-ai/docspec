import * as fs from "fs";
import * as path from "path";

export interface ParsedSection {
  name: string;
  boilerplate: string;
  number: number;
}

export interface ParsedFormat {
  sections: ParsedSection[];
  template: string;
}

/**
 * Parse the docspec format file
 */
export function parseFormatFile(formatFilePath: string): ParsedFormat {
  const content = fs.readFileSync(formatFilePath, "utf-8");
  return parseFormatContent(content);
}

/**
 * Parse format content from a string
 */
export function parseFormatContent(content: string): ParsedFormat {
  const lines = content.split("\n");
  
  // Find all section headers: ## N. Section Name
  const sectionHeaderRegex = /^##\s+(\d+)\.\s+(.+)$/;
  const sectionHeaders: Array<{ lineIndex: number; number: number; name: string }> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(sectionHeaderRegex);
    if (match) {
      sectionHeaders.push({
        lineIndex: i,
        number: parseInt(match[1], 10),
        name: match[2].trim(),
      });
    }
  }
  
  if (sectionHeaders.length === 0) {
    throw new Error("No section headers found in format file. Expected format: ## N. Section Name");
  }
  
  // Extract template: everything before the first section header, plus {{SECTIONS}} placeholder
  const firstSectionLine = sectionHeaders[0].lineIndex;
  const templateBeforeSections = lines.slice(0, firstSectionLine).join("\n").trim();
  const template = templateBeforeSections + "\n\n{{SECTIONS}}\n";
  
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
    
    sections.push({
      name: header.name,
      boilerplate: sectionContent,
      number: header.number,
    });
  }
  
  // Sort sections by number to ensure correct order
  sections.sort((a, b) => a.number - b.number);
  
  return {
    sections,
    template,
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
  
  for (const formatPath of possiblePaths) {
    if (fs.existsSync(formatPath)) {
      return formatPath;
    }
  }
  
  // Default to root if none found (will throw error if file doesn't exist)
  return possiblePaths[0];
}

