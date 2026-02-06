#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs/promises";
import * as path from "path";
import { generateDocspec } from "./create";
import { logger } from "./logger";
import { markdownToDocspecPath } from "./path-utils";
import { buildDocspecReviewPrompt } from "./review";
import {
  createBranchCommitAndOpenPR,
  branchSlugFromMarkdownPath,
} from "./pr";

const program = new Command();

program
  .name("docspec")
  .description("Generate docspec files and prompts under .docspec/")
  .version("0.4.0")
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

program
  .command("generate")
  .description(
    "Write or overwrite a docspec file from the template for a markdown file, then open a pull request so you can edit it."
  )
  .argument("<markdown_path>", "Path to the markdown file (e.g. README.md, docs/deploy.md)")
  .action(async function (this: { opts: () => Record<string, unknown> }, markdownPath: string) {
    const opts = program.opts();
    logger.setVerbose(opts.verbose || false);
    const resolvedMd = path.resolve(process.cwd(), markdownPath).replace(/\\/g, "/");
    const cwd = process.cwd().replace(/\\/g, "/");
    const relativeMd = resolvedMd.startsWith(cwd)
      ? path.relative(cwd, resolvedMd).replace(/\\/g, "/")
      : markdownPath;
    const docspecPath = markdownToDocspecPath(relativeMd);

    try {
      try {
        await fs.access(resolvedMd);
      } catch {
        logger.error(`Markdown file not found: ${resolvedMd}`);
        process.exit(1);
      }

      await generateDocspec(relativeMd, cwd);
      createBranchCommitAndOpenPR({
        repoRoot: cwd,
        paths: [docspecPath],
        branchSlug: branchSlugFromMarkdownPath(relativeMd),
        commitMessage: `chore: add/update docspec for ${relativeMd}`,
        prTitle: `chore: add/update docspec for ${relativeMd}`,
        prBody: `Docspec file created or updated from template. Review and edit as needed.`,
      });
      logger.success(`Docspec written to ${docspecPath}; pull request opened.`);
    } catch (error) {
      logger.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
