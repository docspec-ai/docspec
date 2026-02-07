# docspec

Docspec is a specification format and toolchain for documentation that is maintained by agents. **Docspec does not run an LLM**—it produces prompt output that you feed into your own LLM CLI (e.g. Claude, Codex).

Docspec files live under **`.docspec/`**. For a markdown file `README.md` or `docs/deploy.md`, the docspec is `.docspec/README.docspec.md` or `.docspec/docs/deploy.docspec.md` respectively.

The **format template** is fully up to you: it lives at **`.docspec/docspec.md`**. If you run any docspec command and `.docspec/docspec.md` does not exist, it is seeded from the bundled default (the content of `docspec-format.md` in this repo). Edit `.docspec/docspec.md` to define your own structure.

## The Docspec Format

Each `*.docspec.md` file is a specification for another document. The **default** format (used when seeding) is defined in [`docspec-format.md`](docspec-format.md). After seeding, your project uses `.docspec/docspec.md`, which you can change.

The default includes 5 sections: Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions. Customize the template in `.docspec/docspec.md` to match your needs.

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
- If the docspec is missing, it is created from the template at `.docspec/docspec.md` (seeded from the default on first run).
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

Options: `--max-docspecs`, `--max-diff-chars`. Default output file: `prompt.txt`.

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

## GitHub Actions

Docspec’s actions **only produce prompt files**; they do not run an LLM or require API keys.

- **docspec-review** (`.github/actions/docspec-review`) – Produces a prompt file for reviewing/syncing docs. Runs `docspec review` with PR context or specific `review_files`. Outputs `prompt_file` and `has_prompt`. Use with your own LLM (e.g. Claude). The prompt covers syncing existing docspec+markdown, adding new documentation from changes, and adding docspecs for existing markdown that has none.

### Example: run docspec review then Claude

This repo’s [`.github/workflows/docspec-review.yml`](.github/workflows/docspec-review.yml) runs when a PR is merged (or manually with optional review_files): it prepares the prompt with `docspec review`, then runs the [official Claude Code Action](https://github.com/anthropics/claude-code-action) with that prompt. Add `ANTHROPIC_API_KEY` to your repository secrets if you want the Claude step to run.

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
