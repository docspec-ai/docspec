#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import { copyLatestBoilerplate, ensureDocAndDocspec } from "./create";
import { logger } from "./logger";
import { markdownToDocspecPath } from "./path-utils";
import { buildDocspecReviewPrompt, ensureDocspecPromptFile } from "./review";
const program = new Command();

program
  .name("docspec")
  .description("Generate docspec files and prompts under .docspec/")
  .version("0.4.0")
  .option("-v, --verbose", "Enable verbose output with detailed logging");

const createCmd = program
  .command("create")
  .description("Create markdown and docspec files from the template. With no arguments, copies the latest boilerplate (docspec-prompt.md, docspec-template.md) into .docspec/. With <markdown_path>, creates the file and .docspec/<path>.docspec.md if missing.")
  .option("--overwrite", "Overwrite existing docspec file only (markdown is never overwritten); default is to skip when docspec exists")
  .argument("[markdown_path]", "Path to markdown file (e.g. README.md, docs/deploy.md). Omit to only copy latest boilerplate into .docspec/.")
  .action(async (markdownPath: string | undefined) => {
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    const cwd = process.cwd().replace(/\\/g, "/");
    try {
      if (markdownPath === undefined || markdownPath === "") {
        const { promptCopied, templateCopied } = await copyLatestBoilerplate(cwd);
        const parts: string[] = [];
        if (promptCopied) parts.push(".docspec/docspec-prompt.md");
        if (templateCopied) parts.push(".docspec/docspec-template.md");
        logger.success(`Copied latest boilerplate: ${parts.join(", ")}`);
        return;
      }
      const overwrite = Boolean(createCmd.opts().overwrite);
      const resolved = path.resolve(cwd, markdownPath).replace(/\\/g, "/");
      const relativeMd = resolved.startsWith(cwd)
        ? path.relative(cwd, resolved).replace(/\\/g, "/")
        : markdownPath;
      await ensureDocspecPromptFile(cwd);
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
  .option("--base-ref <branch>", "Base branch name (e.g. main, develop). Used to tell the agent which branch to target when creating PRs.")
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
    const baseRef = cmdOpts.baseRef as string | undefined;
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
        baseRef,
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
