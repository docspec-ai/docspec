# docspec

Docspec is a specification format and toolchain for documentation that is maintained by agents. **Docspec does not run an LLM**—it produces prompt output that you feed into your own LLM CLI (e.g. Claude, Codex).

Docspec files live under **`.docspec/`**. For a markdown file `README.md` or `docs/deploy.md`, the docspec is `.docspec/README.docspec.md` or `.docspec/docs/deploy.docspec.md` respectively.

The **format template** is fully up to you: it lives at **`.docspec/docspec-template.md`**. If you run any docspec command and `.docspec/docspec-template.md` does not exist, it is seeded from the bundled default (the content of `docspec-template.md` in this repo). Edit `.docspec/docspec-template.md` to define your own structure.

## GitHub Actions (use docspec on your project)

### Minimal installation

To use docspec in your GitHub Actions workflow without any npm installation, add a step that uses the docspec-review action from this repo:

```yaml
- name: Prepare docspec review prompt
  uses: docspec-ai/docspec/.github/actions/docspec-review@main
  with:
    review_files: 'README.md'  # Optional: specific files to review
```

The action produces a prompt file only—no LLM execution, no API keys required. You then feed the prompt to your own LLM.

### docspec-review action

The `docspec-review` action (`.github/actions/docspec-review`) produces a prompt file for reviewing/syncing docs. It runs `docspec review` with PR context or specific `review_files`. Outputs `prompt_file` and `has_prompt`.

**Inputs:**
- `pr_number`, `base_sha`, `merge_sha`, `base_ref` – PR context (auto-extracted from event or manually provided)
- `review_files` – Comma-separated markdown file(s) to review (e.g. `README.md, docs/deploy.md`)
- `changed_files` – Comma-separated changed file paths (for discovery with base/merge)
- `max_docspecs`, `max_diff_chars` – Limits (defaults: 10, 120000)
- `output_file` – Output path (default: `prompt.txt`)

**Outputs:**
- `prompt_file` – Absolute path to the generated prompt file
- `has_prompt` – Whether a prompt was generated (true/false)

### Example workflow: docspec review then Claude

This repo's [`.github/workflows/docspec-review.yml`](.github/workflows/docspec-review.yml) demonstrates the full workflow:

1. Runs when a PR is merged (or manually with optional review_files)
2. Prepares the prompt with `docspec-review` action
3. Runs the [official Claude Code Action](https://github.com/anthropics/claude-code-action) with that prompt

Add `ANTHROPIC_API_KEY` to your repository secrets for the Claude step to run.

## The Docspec Format

Each `*.docspec.md` file is a specification for another document. The **default** format (used when seeding) is defined in [`docspec-template.md`](docspec-template.md). After seeding, your project uses `.docspec/docspec-template.md`, which you can change.

The default includes 5 sections: Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions. Customize the template in `.docspec/docspec-template.md` to match your needs.

## Installation

For local or scripted use, install docspec via npm:

**Minimal (CI):** Add a step that uses `docspec-ai/docspec/.github/actions/docspec-review@main`; no npm install needed.

**Local installation:**
```bash
npm install docspec
```

**Global installation:**
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

Use docspec with pre-commit hooks to validate docspecs before committing. Configure `.pre-commit-config.yaml` to target `.docspec/*.docspec.md` files.

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
