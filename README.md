# docspec

Docspec is a specification format and toolchain for documentation that is maintained by agents. **Docspec does not run an LLM**—it produces prompt output that you feed into your own LLM CLI (e.g. Claude, Codex).

Docspec files live under **`.docspec/`**. For a markdown file `README.md` or `docs/deploy.md`, the docspec is `.docspec/README.docspec.md` or `.docspec/docs/deploy.docspec.md` respectively.

The **format template** is fully up to you: it lives at **`.docspec/docspec-template.md`**. If you run any docspec command and `.docspec/docspec-template.md` does not exist, it is seeded from the bundled default (the content of `docspec-template.md` in this repo). Edit `.docspec/docspec-template.md` to define your own structure.

## GitHub Actions (use docspec on your project)

Add docspec to your GitHub project to automatically review documentation when PRs are merged.

### Minimal installation

Add a single step to your workflow that uses the action from this repo:

```yaml
- uses: docspec-ai/docspec/.github/actions/docspec-review@main
```

See [action.yml](.github/actions/docspec-review/action.yml) for all available inputs and outputs.

### Example workflow

This repo's [`.github/workflows/docspec-review.yml`](.github/workflows/docspec-review.yml) shows how to use the docspec-review action with the [official Claude Code Action](https://github.com/anthropics/claude-code-action):

1. The docspec-review action prepares a prompt file (no LLM, no API keys in docspec itself)
2. The Claude Code Action runs with that prompt to review and sync documentation

Add `ANTHROPIC_API_KEY` to your repository secrets to enable the Claude step.

## The Docspec Format

Each `*.docspec.md` file is a specification for another document. The **default** format (used when seeding) is defined in [`docspec-template.md`](docspec-template.md). After seeding, your project uses `.docspec/docspec-template.md`, which you can change.

The default includes 5 sections: Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions. Customize the template in `.docspec/docspec-template.md` to match your needs.

## Installation

### Minimal (CI)

Add a step that uses the action from this repo (e.g. `uses: docspec-ai/docspec/.github/actions/docspec-review@main`); no npm install needed.

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
