#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import { generateDocspec } from "./create";
import { logger } from "./logger";
import { markdownToDocspecPath } from "./path-utils";
import { buildDocspecChangedPrompt } from "./changed";
import { buildDocspecGeneratePrompts } from "./generate";

const program = new Command();

program
  .name("docspec")
  .description("Generate docspec files and prompts under .docspec/")
  .version("0.3.0")
  .option("-v, --verbose", "Enable verbose output with detailed logging")
  .argument("[markdown_path]", "Path to markdown file (creates .docspec/<path>.docspec.md)")
  .action(async (markdownPath: string) => {
    if (!markdownPath) return;
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    try {
      const resolved = path.resolve(process.cwd(), markdownPath).replace(/\\/g, "/");
      const cwd = process.cwd().replace(/\\/g, "/");
      const relativeMd = resolved.startsWith(cwd)
        ? path.relative(cwd, resolved).replace(/\\/g, "/")
        : markdownPath;
      await generateDocspec(relativeMd);
      logger.success(`Generated docspec file: ${markdownToDocspecPath(relativeMd)}`);
    } catch (error) {
      logger.error(
        `Failed to generate docspec file: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

program
  .command("changed")
  .description(
    "Generate a prompt to sync markdown files with their docspecs based on changed files (for use with an external LLM)"
  )
  .option(
    "--changed-files <paths>",
    "Comma-separated list of changed file paths (or omit and use --base/--merge for git diff)"
  )
  .option("--base <sha>", "Base SHA for git diff (e.g. PR base)")
  .option("--merge <sha>", "Merge SHA for git diff (e.g. PR merge commit)")
  .option("--output <file>", "Write prompt to this file", "prompt.txt")
  .option("--max-docspecs <n>", "Max docspecs to include", "10")
  .option("--max-diff-chars <n>", "Max characters of diff to include", "120000")
  .action(async function (this: { opts: () => Record<string, unknown> }) {
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    const cmdOpts = this.opts();
    const changedFiles = cmdOpts.changedFiles
      ? String(cmdOpts.changedFiles).split(",").map((s: string) => s.trim()).filter(Boolean)
      : undefined;
    const base = cmdOpts.base as string | undefined;
    const merge = cmdOpts.merge as string | undefined;
    if (!changedFiles?.length && (!base || !merge)) {
      logger.error("Either provide --changed-files or both --base and --merge for git diff.");
      process.exit(1);
    }
    try {
      const { prompt, outputPath } = await buildDocspecChangedPrompt({
        changedFiles,
        base,
        merge,
        outputPath: (cmdOpts.output as string) || "prompt.txt",
        maxDocspecs: parseInt(String(cmdOpts.maxDocspecs), 10),
        maxDiffChars: parseInt(String(cmdOpts.maxDiffChars), 10),
      });
      if (!prompt) {
        logger.info("No relevant docspec files found; no prompt written.");
        process.exit(0);
      }
      if (outputPath) {
        logger.success(`Prompt written to ${outputPath}`);
        console.log(outputPath);
      }
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("generate")
  .description(
    "Generate a new docspec for a markdown file and output a prompt for an external LLM to fill/improve it"
  )
  .argument("<markdown_path>", "Path to the markdown file (e.g. README.md, docs/deploy.md)")
  .option("--overwrite", "Overwrite existing docspec file")
  .option("--output-prompt <file>", "Write implementation prompt to this file", "prompt.txt")
  .option("--output-plan <file>", "Write plan prompt to this file (optional)")
  .action(async function (this: { opts: () => Record<string, unknown> }, markdownPath: string) {
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    const cmdOpts = this.opts();
    const resolvedMd = path.resolve(process.cwd(), markdownPath).replace(/\\/g, "/");
    const cwd = process.cwd().replace(/\\/g, "/");
    const relativeMd = resolvedMd.startsWith(cwd)
      ? path.relative(cwd, resolvedMd).replace(/\\/g, "/")
      : markdownPath;
    try {
      const result = await buildDocspecGeneratePrompts({
        markdownPath: relativeMd,
        overwrite: cmdOpts.overwrite === true,
        outputPromptPath: (cmdOpts.outputPrompt as string) || "prompt.txt",
        outputPlanPath: cmdOpts.outputPlan as string | undefined,
      });
      logger.success(`Docspec written to ${markdownToDocspecPath(relativeMd)}`);
      if (result.outputPromptPath) {
        logger.success(`Prompt written to ${result.outputPromptPath}`);
        console.log(result.outputPromptPath);
      }
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
