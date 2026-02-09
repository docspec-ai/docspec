# docspec

Docspec is a specification format and toolchain for documentation that agents keep in sync with your docs. **The primary way to use docspec is the GitHub workflow**: add one action step and an LLM (e.g. Claude) reviews and updates documentation on PR merge. The workflow does use an LLM; API keys live in your repository secrets, not in docspec. The CLI is optional and only produces prompt output (no LLM in the docspec tool itself).

Keep docs aligned with their specs; review is automated and runs in CI; you choose the LLM.

Docspec files live under **`.docspec/`**. For a markdown file `README.md` or `docs/deploy.md`, the docspec is `.docspec/README.docspec.md` or `.docspec/docs/deploy.docspec.md` respectively.

Two key files define how docspec works:
- **docspec-template.md**: Defines the structure of each `*.docspec.md` file (the format specification)
- **docspec-prompt.md**: Contains instructions used when running `docspec review` (tells agents how to compare docs to their docspecs)

## GitHub Actions (use docspec on your project)

Add docspec to your GitHub project to automatically review documentation when PRs are merged.

### Simplest: call the reusable workflow

Add a single workflow file that calls this repo's reusable workflow—no need to copy steps or the action. Add `ANTHROPIC_API_KEY` to your repository secrets; `GITHUB_TOKEN` is provided by GitHub.

```yaml
name: Docspec review

on:
  pull_request:
    types: [closed]
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'Pull request number (for manual run with PR context)'
        required: false
        type: string
      review_files:
        description: 'Comma-separated markdown file(s) to review (e.g. README.md, docs/deploy.md). If set, reviews only these; no PR diff.'
        required: false
        type: string

permissions:
  contents: write
  pull-requests: write

jobs:
  docspec_review:
    if: ${{ github.event.pull_request.merged == true || github.event_name == 'workflow_dispatch' }}
    uses: docspec-ai/docspec/.github/workflows/docspec-review.yml@main
    with:
      pr_number: ${{ github.event.inputs.pr_number }}
      review_files: ${{ github.event.inputs.review_files }}
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Inline workflow (action + Claude step)

For users who want to run the docspec-review action themselves and wire their own LLM step:

```yaml
- uses: docspec-ai/docspec/.github/actions/docspec-review@main
```

See [action.yml](.github/actions/docspec-review/action.yml) for all inputs and outputs. This repo's [`.github/workflows/docspec-review.yml`](.github/workflows/docspec-review.yml) shows the full flow: the action prepares a prompt file (no LLM), then the Claude Code Action runs that prompt. Add `ANTHROPIC_API_KEY` to your repository secrets for the Claude step.

## The Docspec Format

Each `*.docspec.md` file is a specification for another document.

### docspec-template

The **format template** defines the structure of each `*.docspec.md` file. It lives at **`.docspec/docspec-template.md`** (seeded from the bundled [`docspec-template.md`](docspec-template.md) if missing). The default template includes 5 sections:

1. Document Purpose
2. Update Triggers
3. Expected Structure
4. Editing Guidelines
5. Intentional Omissions

See [`docspec-template.md`](docspec-template.md) for the definitive format specification. Customize `.docspec/docspec-template.md` to define your own structure.

### docspec-prompt

The **docspec prompt** contains task instructions appended to the output when running `docspec review`. It tells the agent how to act: compare the target document to its docspec, update if needed, create new docs or docspecs when appropriate, and open a PR. It lives at **`.docspec/docspec-prompt.md`** (seeded from the bundled [`docspec-prompt.md`](docspec-prompt.md) if missing). Customize `.docspec/docspec-prompt.md` to change the review flow.

## Installation

### Minimal (CI)

Call this repo's reusable workflow (see [Simplest: call the reusable workflow](#simplest-call-the-reusable-workflow)) or add a step that uses the action (see [Inline workflow](#inline-workflow-action--claude-step)). No npm install needed.

### Local or scripted use

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

Use docspec with pre-commit hooks (target `.docspec/*.docspec.md`).

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
