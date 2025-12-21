import * as fs from "fs/promises";
import { ValidationResult, DocspecSection } from "./types";
import { REQUIRED_SECTIONS, SECTION_BOILERPLATE } from "./constants";
import { logger } from "./logger";

/**
 * Validate a docspec file
 * @param filePath Path to the docspec file to validate
 */
export async function validateDocspec(filePath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  
  logger.debug(`Reading file: ${filePath}`);
  
  try {
    const content = await fs.readFile(filePath, "utf-8");
    logger.debug(`File read successfully, ${content.length} characters`);
    
    logger.debug("Parsing sections from content");
    const sections = parseSections(content);
    logger.debug(`Found ${sections.length} section(s)`);
    
    // Check for all required sections
    const foundSections = new Set<string>();
    
    for (const section of sections) {
      foundSections.add(section.name);
      logger.debug(`Found section: "${section.name}" (line ${section.lineNumber})`);
    }
    
    logger.debug(`Checking for ${REQUIRED_SECTIONS.length} required section(s)`);
    // Check for missing sections
    for (const requiredSection of REQUIRED_SECTIONS) {
      if (!foundSections.has(requiredSection)) {
        logger.debug(`Missing required section: "${requiredSection}"`);
        errors.push(`Missing required section: "${requiredSection}"`);
      } else {
        logger.debug(`✓ Required section found: "${requiredSection}"`);
      }
    }
    
    // Validate each section's content
    logger.debug("Validating section content");
    for (const section of sections) {
      if (REQUIRED_SECTIONS.includes(section.name as any)) {
        logger.debug(`Validating content for section: "${section.name}"`);
        const validationError = validateSectionContent(section);
        if (validationError) {
          logger.debug(`Validation error for "${section.name}": ${validationError}`);
          errors.push(validationError);
        } else {
          logger.debug(`✓ Section "${section.name}" content is valid`);
        }
      }
    }
    
    const isValid = errors.length === 0;
    logger.debug(`Validation ${isValid ? "passed" : "failed"} with ${errors.length} error(s)`);
    
    return {
      valid: isValid,
      errors,
    };
  } catch (error) {
    logger.debug(`Error reading file: ${error instanceof Error ? error.message : String(error)}`);
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
  
  logger.debug(`Parsing ${lines.length} lines for sections`);
  
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
        logger.debug(`Closing section "${currentSection.name}" with ${currentSection.content.length} characters`);
        sections.push(currentSection);
      }
      
      // Extract section name (remove section number if present)
      let sectionName = headerMatch[1].trim();
      
      // Skip AGENT INSTRUCTIONS section - don't validate it
      if (sectionName === "AGENT INSTRUCTIONS") {
        logger.debug("Skipping AGENT INSTRUCTIONS section");
        currentSection = null;
        continue;
      }
      
      // Remove leading number and period (e.g., "1. Purpose" -> "Purpose")
      sectionName = sectionName.replace(/^\d+\.\s*/, "");
      
      logger.debug(`Found section header: "${sectionName}" at line ${i + 1}`);
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
    logger.debug(`Closing final section "${currentSection.name}" with ${currentSection.content.length} characters`);
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
    logger.debug(`No boilerplate found for section "${section.name}", skipping content validation`);
    return null; // Not a required section, skip validation
  }
  
  logger.debug(`Validating content for "${section.name}" (boilerplate length: ${boilerplate.length})`);
  
  // Clean content: remove separator lines (---) and trim
  let content = section.content
    .split("\n")
    .filter(line => line.trim() !== "---")
    .join("\n")
    .trim();
  const boilerplateTrimmed = boilerplate.trim();
  
  logger.debug(`Section content length: ${content.length} characters`);
  
  // Check if content is empty
  if (!content) {
    logger.debug(`Section "${section.name}" is empty`);
    return `Section "${section.name}" (line ${section.lineNumber}) is empty`;
  }
  
  // Check if content matches boilerplate exactly
  if (content === boilerplateTrimmed) {
    logger.debug(`Section "${section.name}" matches boilerplate exactly`);
    return `Section "${section.name}" (line ${section.lineNumber}) contains only boilerplate text and has not been customized`;
  }
  
  // Check if content is too similar to boilerplate (only whitespace differences)
  const normalizedContent = normalizeWhitespace(content);
  const normalizedBoilerplate = normalizeWhitespace(boilerplateTrimmed);
  
  if (normalizedContent === normalizedBoilerplate) {
    logger.debug(`Section "${section.name}" is too similar to boilerplate (only whitespace differences)`);
    return `Section "${section.name}" (line ${section.lineNumber}) is too similar to boilerplate (only whitespace differences)`;
  }
  
  // Check if content is just a subset of boilerplate (very short)
  if (content.length < 50) {
    logger.debug(`Section "${section.name}" is too short (${content.length} < 50 characters)`);
    return `Section "${section.name}" (line ${section.lineNumber}) appears to be incomplete (too short)`;
  }
  
  logger.debug(`Section "${section.name}" content validation passed`);
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

