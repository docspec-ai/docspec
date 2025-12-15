#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import { validateDocspec } from "./validator";
import { generateDocspec } from "./generator";

const program = new Command();

program
  .name("docspec")
  .description("Generate and validate docspec files (*.docspec.md)")
  .version("0.1.0");

program
  .command("validate")
  .description("Validate docspec files")
  .argument("[paths...]", "Paths to docspec files (if not provided, finds all *.docspec.md files)")
  .action(async (filePaths: string[]) => {
    let filesToValidate: string[] = [];
    
    if (filePaths.length > 0) {
      // Use provided file paths (from pre-commit or user)
      filesToValidate = filePaths;
    } else {
      // Find all *.docspec.md files in current directory tree
      filesToValidate = await findDocspecFiles(process.cwd());
    }
    
    if (filesToValidate.length === 0) {
      console.log("No docspec files found to validate.");
      process.exit(0);
    }
    
    let hasErrors = false;
    
    for (const filePath of filesToValidate) {
      const result = await validateDocspec(filePath);
      
      if (!result.valid) {
        hasErrors = true;
        console.error(`\n❌ ${filePath}:`);
        for (const error of result.errors) {
          console.error(`  - ${error}`);
        }
      } else {
        console.log(`✅ ${filePath}`);
      }
    }
    
    if (hasErrors) {
      process.exit(1);
    }
  });

program
  .command("generate")
  .description("Generate a new docspec file")
  .argument("<path>", "Path where the docspec file should be created")
  .option("-n, --name <name>", "Name of the document (defaults to filename)")
  .action(async (filePath: string, options: { name?: string }) => {
    try {
      // Ensure the path ends with .docspec.md
      if (!filePath.endsWith(".docspec.md")) {
        filePath = filePath + ".docspec.md";
      }
      
      await generateDocspec(filePath, options.name);
      console.log(`✅ Generated docspec file: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to generate docspec file: ${error instanceof Error ? error.message : String(error)}`);
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
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and .git directories
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await findDocspecFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".docspec.md")) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
    if (error instanceof Error && "code" in error && error.code !== "EACCES") {
      throw error;
    }
  }
  
  return files;
}

