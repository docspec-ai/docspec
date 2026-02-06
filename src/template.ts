import * as fs from "fs";
import * as path from "path";

interface ParsedSection {
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
 * Parse the docspec template file (.docspec/docspec.md) into structure and sections.
 */
export function parseFormatFile(formatFilePath: string): ParsedFormat {
  const content = fs.readFileSync(formatFilePath, "utf-8");
  return parseFormatContent(content);
}

function parseFormatContent(content: string): ParsedFormat {
  const lines = content.split("\n");

  // Look for AGENT INSTRUCTIONS section first
  let agentInstructions: string | undefined;
  let agentInstructionsStart = -1;
  let agentInstructionsEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "## AGENT INSTRUCTIONS") {
      agentInstructionsStart = i;
      break;
    }
  }

  if (agentInstructionsStart >= 0) {
    for (let i = agentInstructionsStart + 1; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (trimmedLine.match(/^##\s+/)) {
        agentInstructionsEnd = i;
        break;
      }
    }
    if (agentInstructionsEnd < 0) agentInstructionsEnd = lines.length;
    const agentLines = lines.slice(agentInstructionsStart + 1, agentInstructionsEnd);
    let agentContent = agentLines.join("\n");
    agentContent = agentContent
      .split("\n")
      .filter((line) => line.trim() !== "---")
      .join("\n")
      .trim();
    if (agentContent) agentInstructions = agentContent;
  }

  // Find all section headers: ## N. Section Name
  const sectionHeaderRegex = /^##\s+(\d+)\.\s+(.+)$/;
  const sectionHeaders: Array<{ lineIndex: number; number: number; name: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "## AGENT INSTRUCTIONS") continue;
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
    throw new Error("No section headers found in template. Expected format: ## N. Section Name");
  }

  const firstSectionLine = sectionHeaders[0].lineIndex;
  const templateBeforeSections =
    agentInstructionsStart >= 0 && agentInstructionsStart < firstSectionLine
      ? lines.slice(0, agentInstructionsStart).join("\n").trim()
      : lines.slice(0, firstSectionLine).join("\n").trim();
  const template = templateBeforeSections + "\n\n{{AGENT_INSTRUCTIONS}}\n\n{{SECTIONS}}\n";

  const sections: ParsedSection[] = [];
  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i];
    const nextHeaderLine =
      i < sectionHeaders.length - 1 ? sectionHeaders[i + 1].lineIndex : lines.length;
    const sectionLines = lines.slice(header.lineIndex + 1, nextHeaderLine);
    let sectionContent = sectionLines.join("\n");
    sectionContent = sectionContent
      .split("\n")
      .filter((line) => line.trim() !== "---")
      .join("\n")
      .trim();
    sections.push({
      name: header.name,
      boilerplate: sectionContent,
      number: header.number,
    });
  }
  sections.sort((a, b) => a.number - b.number);

  return {
    sections,
    template,
    agentInstructions,
  };
}

/**
 * Seed .docspec/docspec.md from the bundled docspec-format.md if it doesn't exist.
 */
function seedDefaultFormatFile(): string {
  const cwd = process.cwd();
  const userPath = path.join(cwd, ".docspec", "docspec.md");
  const defaultPath = path.join(__dirname, "..", "docspec-format.md");
  if (!fs.existsSync(defaultPath)) {
    throw new Error(
      `Default template not found at ${defaultPath}. ` +
        `Create .docspec/docspec.md in your project or ensure the docspec package is installed correctly.`
    );
  }
  fs.mkdirSync(path.join(cwd, ".docspec"), { recursive: true });
  fs.copyFileSync(defaultPath, userPath);
  return userPath;
}

/**
 * Path to the template file (.docspec/docspec.md). Seeds from bundled default if missing.
 */
export function getFormatFilePath(): string {
  const cwd = process.cwd();
  const userPath = path.join(cwd, ".docspec", "docspec.md");
  if (fs.existsSync(userPath)) return userPath;
  return seedDefaultFormatFile();
}
