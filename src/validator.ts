import * as fs from "fs/promises";
import { ValidationResult, DocspecSection } from "./types";
import { REQUIRED_SECTIONS, SECTION_BOILERPLATE } from "./constants";

/**
 * Validate a docspec file
 * @param filePath Path to the docspec file to validate
 */
export async function validateDocspec(filePath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const sections = parseSections(content);
    
    // Check for all required sections
    const foundSections = new Set<string>();
    
    for (const section of sections) {
      foundSections.add(section.name);
    }
    
    // Check for missing sections
    for (const requiredSection of REQUIRED_SECTIONS) {
      if (!foundSections.has(requiredSection)) {
        errors.push(`Missing required section: "${requiredSection}"`);
      }
    }
    
    // Validate each section's content
    for (const section of sections) {
      if (REQUIRED_SECTIONS.includes(section.name as any)) {
        const validationError = validateSectionContent(section);
        if (validationError) {
          errors.push(validationError);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        valid: false,
        errors: [`Failed to read file: ${error.message}`],
      };
    }
    return {
      valid: false,
      errors: [`Failed to read file: ${String(error)}`],
    };
  }
}

/**
 * Parse markdown content into sections
 */
function parseSections(content: string): DocspecSection[] {
  const sections: DocspecSection[] = [];
  const lines = content.split("\n");
  
  let currentSection: DocspecSection | null = null;
  let lineNumber = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for section headers (## or ###)
    const headerMatch = trimmedLine.match(/^#{2,}\s+(.+)$/);
    if (headerMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Extract section name (remove section number if present)
      let sectionName = headerMatch[1].trim();
      // Remove leading number and period (e.g., "1. Purpose" -> "Purpose")
      sectionName = sectionName.replace(/^\d+\.\s*/, "");
      
      currentSection = {
        name: sectionName,
        content: "",
        lineNumber: i + 1,
      };
    } else if (currentSection) {
      // Accumulate content for current section
      if (currentSection.content) {
        currentSection.content += "\n";
      }
      currentSection.content += line;
    }
    
    lineNumber++;
  }
  
  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Validate that section content differs from boilerplate
 */
function validateSectionContent(section: DocspecSection): string | null {
  const boilerplate = SECTION_BOILERPLATE[section.name];
  if (!boilerplate) {
    return null; // Not a required section, skip validation
  }
  
  // Clean content: remove separator lines (---) and trim
  let content = section.content
    .split("\n")
    .filter(line => line.trim() !== "---")
    .join("\n")
    .trim();
  const boilerplateTrimmed = boilerplate.trim();
  
  // Check if content is empty
  if (!content) {
    return `Section "${section.name}" (line ${section.lineNumber}) is empty`;
  }
  
  // Check if content matches boilerplate exactly
  if (content === boilerplateTrimmed) {
    return `Section "${section.name}" (line ${section.lineNumber}) contains only boilerplate text and has not been customized`;
  }
  
  // Check if content is too similar to boilerplate (only whitespace differences)
  const normalizedContent = normalizeWhitespace(content);
  const normalizedBoilerplate = normalizeWhitespace(boilerplateTrimmed);
  
  if (normalizedContent === normalizedBoilerplate) {
    return `Section "${section.name}" (line ${section.lineNumber}) is too similar to boilerplate (only whitespace differences)`;
  }
  
  // Check if content is just a subset of boilerplate (very short)
  if (content.length < 50) {
    return `Section "${section.name}" (line ${section.lineNumber}) appears to be incomplete (too short)`;
  }
  
  return null;
}

/**
 * Normalize whitespace for comparison
 */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

