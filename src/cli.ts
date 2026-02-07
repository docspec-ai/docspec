#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import { ensureDocAndDocspec } from "./create";
import { logger } from "./logger";
import { markdownToDocspecPath } from "./path-utils";
import { buildDocspecReviewPrompt } from "./review";
const program = new Command();

program
  .name("docspec")
  .description("Generate docspec files and prompts under .docspec/")
  .version("0.4.0")
  .option("-v, --verbose", "Enable verbose output with detailed logging")
  .option("--overwrite", "Overwrite existing docspec file only (markdown is never overwritten); default is to skip when docspec exists")
  .argument("<markdown_path>", "Path to markdown file (e.g. README.md, docs/deploy.md). Creates the file and .docspec/<path>.docspec.md if missing.")
  .action(async (markdownPath: string) => {
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    const overwrite = Boolean(opts.overwrite);
    try {
      const resolved = path.resolve(process.cwd(), markdownPath).replace(/\\/g, "/");
      const cwd = process.cwd().replace(/\\/g, "/");
      const relativeMd = resolved.startsWith(cwd)
        ? path.relative(cwd, resolved).replace(/\\/g, "/")
        : markdownPath;
      const { markdownCreated, docspecCreated } = await ensureDocAndDocspec(relativeMd, cwd, { overwrite });
      if (markdownCreated || docspecCreated) {
        const parts: string[] = [];
        if (markdownCreated) parts.push(relativeMd);
        if (docspecCreated) parts.push(markdownToDocspecPath(relativeMd));
        logger.success(`Created or updated: ${parts.join(", ")}`);
      } else {
        logger.info("Both files already exist; nothing to do. Use --overwrite to replace them.");
      }
    } catch (error) {
      logger.error(
        `Failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

program
  .command("review")
  .description(
    "Generate a prompt to review/sync markdown with docspecs (for use with an external LLM). Use PR context (--base/--merge) or specify markdown file(s) to review."
  )
  .argument("[markdown_paths...]", "Markdown file(s) to review (e.g. README.md). If omitted, use --base/--merge or --changed-files for PR-based discovery.")
  .option(
    "--changed-files <paths>",
    "Comma-separated list of changed file paths (or omit and use --base/--merge for git diff)"
  )
  .option("--base <sha>", "Base SHA for git diff (e.g. PR base)")
  .option("--merge <sha>", "Merge SHA for git diff (e.g. PR merge commit)")
  .option("--output <file>", "Write prompt to this file", "prompt.txt")
  .option("--max-docspecs <n>", "Max docspecs to include", "10")
  .option("--max-diff-chars <n>", "Max characters of diff to include", "120000")
  .action(async function (this: { opts: () => Record<string, unknown> }, markdownPaths: string[] = []) {
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    const cmdOpts = this.opts();
    const reviewFiles = markdownPaths.length > 0 ? markdownPaths : undefined;
    const changedFiles = cmdOpts.changedFiles
      ? String(cmdOpts.changedFiles).split(",").map((s: string) => s.trim()).filter(Boolean)
      : undefined;
    const base = cmdOpts.base as string | undefined;
    const merge = cmdOpts.merge as string | undefined;
    if (!reviewFiles?.length && !changedFiles?.length && (!base || !merge)) {
      logger.error(
        "Provide markdown file(s) to review (e.g. docspec review README.md), or --changed-files, or both --base and --merge for git diff."
      );
      process.exit(1);
    }
    try {
      const { prompt, outputPath } = await buildDocspecReviewPrompt({
        reviewFiles,
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

program.parse();
