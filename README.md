# docspec

Docspec is a specification format and toolchain for documentation that is maintained by agents. **Docspec does not run an LLM**—it produces prompt output that you feed into your own LLM CLI (e.g. Claude, Codex).

Docspec files live under **`.docspec/`**. For a markdown file `README.md` or `docs/deploy.md`, the docspec is `.docspec/README.docspec.md` or `.docspec/docs/deploy.docspec.md` respectively.

The **format template** is fully up to you: it lives at **`.docspec/docspec-template.md`**. If you run any docspec command and `.docspec/docspec-template.md` does not exist, it is seeded from the bundled default (the content of `docspec-template.md` in this repo). Edit `.docspec/docspec-template.md` to define your own structure.

## GitHub Actions (use docspec on your project)

Docspec's actions **only produce prompt files**; they do not run an LLM or require API keys.

The **docspec-review** action (`.github/actions/docspec-review`) produces a prompt file for reviewing and syncing docs. It runs `docspec review` with PR context or specific `review_files`. Outputs `prompt_file` (absolute path to the generated prompt file, empty if no docspecs found) and `has_prompt` (whether a prompt was generated, true/false). Use with your own LLM (e.g. Claude). The prompt covers syncing existing docspec+markdown, adding new documentation from changes, and adding docspecs for existing markdown that has none.

**Action inputs:**
- `pr_number`, `base_sha`, `merge_sha`, `base_ref` - PR context (optional, extracted from event if not provided)
- `review_files` - Optional list of markdown file paths to review (e.g. README.md, docs/deploy.md). If set, only these docspecs are included; no PR diff
- `changed_files` - Optional list of changed file paths. If set with base/merge, used for discovery
- `max_docspecs` - Maximum number of docspec files to include (default: 10)
- `max_diff_chars` - Maximum characters of PR diff to include (default: 120000)
- `output_file` - Path to write the prompt file (default: prompt.txt)

**Example workflow:** This repo's [`.github/workflows/docspec-review.yml`](.github/workflows/docspec-review.yml) runs when a PR is merged (or manually with optional review_files): it prepares the prompt with `docspec review`, then runs the [official Claude Code Action](https://github.com/anthropics/claude-code-action) with that prompt. Add `ANTHROPIC_API_KEY` to your repository secrets if you want the Claude step to run.

## The Docspec Format

Each `*.docspec.md` file is a specification for another document. The **default** format (used when seeding) is defined in [`docspec-template.md`](docspec-template.md). After seeding, your project uses `.docspec/docspec-template.md`, which you can change.

The default includes 5 sections: Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions. Customize the template in `.docspec/docspec-template.md` to match your needs.

## Installation

```bash
npm install docspec
```

Or install globally:

```bash
npm install -g docspec
```

## Usage

### CLI Commands

#### Create doc and docspec

Use the `create` command with a markdown file path to ensure both the file and its docspec exist:

```bash
docspec create README.md
docspec create docs/deploy.md
```

- If the markdown file is missing, it is created (empty).
- If the docspec is missing, it is created from the template at `.docspec/docspec-template.md` (seeded from the default on first run).
- If either already exists, it is left unchanged. Use `--overwrite` to replace only the docspec (markdown is never overwritten).

```bash
docspec create README.md --overwrite
```

#### docspec review (prompt for reviewing/syncing docs)

Produce a prompt file that instructs an LLM to review and sync markdown files with their docspecs. Use PR context (after a merge) or specify file(s) to review manually:

```bash
docspec review --base <base_sha> --merge <merge_sha> --output prompt.txt
docspec review --changed-files "src/foo.ts,README.md" --base <base> --merge <merge> --output prompt.txt
docspec review README.md docs/deploy.md --output prompt.txt
```

Options: `--max-docspecs`, `--max-diff-chars`. Default output file: `prompt.txt`. The **docspec prompt** (general instructions and task steps appended to the prompt) is customizable: it lives at **`.docspec/docspec-prompt.md`**. If that file does not exist, it is seeded from the bundled default ([`docspec-prompt.md`](docspec-prompt.md)). If you have an existing `.docspec/agent-prompt.md` or `.docspec/review-task.md`, it will be used once and copied to `docspec-prompt.md`. Edit `.docspec/docspec-prompt.md` to change the instructions or task steps.

Add the `--verbose` flag to any command for detailed logging.

### Library Usage

```typescript
import {
  ensureDocAndDocspec,
  buildDocspecReviewPrompt,
  markdownToDocspecPath,
  docspecToMarkdownPath,
} from "docspec";

// Ensure both markdown and docspec exist (creates empty doc and template docspec if missing)
await ensureDocAndDocspec("README.md", process.cwd(), { overwrite: false });

// Build prompt for docspec review (e.g. for CI)
const { prompt, outputPath } = await buildDocspecReviewPrompt({
  base: "abc123",
  merge: "def456",
  outputPath: "prompt.txt",
});

// Or review specific file(s) only (no diff)
const { prompt } = await buildDocspecReviewPrompt({
  reviewFiles: ["README.md", "docs/deploy.md"],
  outputPath: "prompt.txt",
});
```

The library also exports: `ensureDocAndDocspec()`, `generateDocspecContent()`, `REQUIRED_SECTIONS`, `SECTION_BOILERPLATE`, `logger`, `LogLevel`, `isDocspecPath`, and types `DocspecReviewOptions`, `EnsureDocAndDocspecOptions`, `EnsureDocAndDocspecResult`.

## Pre-commit Integration

Use docspec with pre-commit hooks to validate docspecs automatically. Target `.docspec/*.docspec.md` files in your hook configuration.

## Development

### Running Tests

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Building

```bash
npm run build
```

## License

MIT
