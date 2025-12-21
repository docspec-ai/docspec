#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import { validateDocspec } from "./validator";
import { generateDocspec } from "./generator";
import { logger } from "./logger";

const program = new Command();

program
  .name("docspec")
  .description("Generate and validate docspec files (*.docspec.md)")
  .version("0.1.0")
  .option("-v, --verbose", "Enable verbose output with detailed logging");

program
  .command("validate")
  .description("Validate docspec files")
  .argument("[paths...]", "Paths to docspec files (if not provided, finds all *.docspec.md files)")
  .action(async (filePaths: string[]) => {
    // Enable verbose mode if flag is set
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    
    logger.debug("Starting validation process");
    
    let filesToValidate: string[] = [];
    
    if (filePaths.length > 0) {
      // Use provided file paths (from pre-commit or user)
      logger.debug(`Using provided file paths: ${filePaths.join(", ")}`);
      filesToValidate = filePaths;
    } else {
      // Find all *.docspec.md files in current directory tree
      logger.debug(`Searching for *.docspec.md files in: ${process.cwd()}`);
      filesToValidate = await findDocspecFiles(process.cwd());
      logger.debug(`Found ${filesToValidate.length} docspec file(s)`);
    }
    
    if (filesToValidate.length === 0) {
      logger.info("No docspec files found to validate.");
      process.exit(0);
    }
    
    logger.info(`Validating ${filesToValidate.length} file(s)...`);
    let hasErrors = false;
    
    for (const filePath of filesToValidate) {
      logger.debug(`Validating file: ${filePath}`);
      const result = await validateDocspec(filePath);
      
      if (!result.valid) {
        hasErrors = true;
        logger.error(`\n${filePath}:`);
        for (const error of result.errors) {
          logger.error(`  - ${error}`);
        }
      } else {
        logger.success(filePath);
      }
    }
    
    if (hasErrors) {
      logger.debug("Validation completed with errors");
      process.exit(1);
    } else {
      logger.debug("Validation completed successfully");
      logger.info(`\nAll ${filesToValidate.length} file(s) validated successfully.`);
    }
  });

program
  .command("generate")
  .description("Generate a new docspec file")
  .argument("<path>", "Path where the docspec file should be created (must end with .docspec.md)")
  .action(async (filePath: string) => {
    // Enable verbose mode if flag is set
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    
    logger.debug("Starting generation process");
    
    try {
      // Ensure the path ends with .docspec.md
      if (!filePath.endsWith(".docspec.md")) {
        logger.debug(`Appending .docspec.md extension to: ${filePath}`);
        filePath = filePath + ".docspec.md";
      }
      
      logger.debug(`Generating docspec file at: ${filePath}`);
      await generateDocspec(filePath);
      logger.success(`Generated docspec file: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to generate docspec file: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

/**
 * Recursively find all *.docspec.md files in a directory
 */
async function findDocspecFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  logger.debug(`Scanning directory: ${dir}`);
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    logger.debug(`Found ${entries.length} entries in ${dir}`);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and .git directories
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
        logger.debug(`Skipping directory: ${entry.name}`);
        continue;
      }
      
      if (entry.isDirectory()) {
        logger.debug(`Recursing into directory: ${fullPath}`);
        const subFiles = await findDocspecFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".docspec.md")) {
        logger.debug(`Found docspec file: ${fullPath}`);
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
    if (error instanceof Error && "code" in error && error.code !== "EACCES") {
      logger.warn(`Error reading directory ${dir}: ${error.message}`);
      throw error;
    } else if (error instanceof Error && "code" in error && error.code === "EACCES") {
      logger.debug(`Permission denied for directory ${dir}, skipping`);
    }
  }
  
  return files;
}

