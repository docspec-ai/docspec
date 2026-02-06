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

#### Generate a docspec file (default)

Pass a markdown file path to create (or overwrite) its docspec under `.docspec/`:

```bash
docspec README.md
docspec docs/deploy.md
```

This creates `.docspec/README.docspec.md` and `.docspec/docs/deploy.docspec.md` using the template at `.docspec/docspec.md` (seeded from the default on first run).

#### docspec changed (prompt for syncing docs after changes)

Produce a prompt file that instructs an LLM to sync markdown files with their docspecs given a list of changed files or a git diff:

```bash
docspec changed --base <base_sha> --merge <merge_sha> --output prompt.txt
docspec changed --changed-files "src/foo.ts,README.md" --output prompt.txt
```

Options: `--max-docspecs`, `--max-diff-chars`. Default output file: `prompt.txt`.

#### docspec generate (docspec + prompt for LLM)

Generate a new docspec for a markdown file and write a prompt you can feed to your LLM to fill or improve it:

```bash
docspec generate README.md --output-prompt prompt.txt
docspec generate docs/deploy.md --overwrite --output-prompt prompt.txt
```

Use `--overwrite` to replace an existing docspec. Optionally `--output-plan <file>` to write a separate plan prompt.

Add the `--verbose` flag to any command for detailed logging.

### Library Usage

```typescript
import {
  generateDocspec,
  buildDocspecChangedPrompt,
  buildDocspecGeneratePrompts,
  markdownToDocspecPath,
  docspecToMarkdownPath,
} from "docspec";

// Generate a docspec for a markdown file (writes to .docspec/<path>.docspec.md)
await generateDocspec("README.md");

// Build prompt for docspec changed (e.g. for CI)
const { prompt, outputPath } = await buildDocspecChangedPrompt({
  base: "abc123",
  merge: "def456",
  outputPath: "prompt.txt",
});

// Build prompts for docspec generate
const { implPrompt } = await buildDocspecGeneratePrompts({
  markdownPath: "README.md",
  outputPromptPath: "prompt.txt",
});
```

The library also exports: `generateDocspecContent()`, `REQUIRED_SECTIONS`, `SECTION_BOILERPLATE`, `logger`, `LogLevel`, `isDocspecPath`, and types `DocspecChangedOptions`, `DocspecGenerateOptions`.

## GitHub Actions

Docspec’s actions **only produce prompt files**; they do not run an LLM or require API keys.

- **docspec-changed** (`.github/actions/docspec-check`) – Runs `docspec changed` and writes a prompt file. Outputs `prompt_file` and `has_prompt`.
- **docspec-generate** (`.github/actions/docspec-generate`) – Runs `docspec generate <markdown_file>` and writes a prompt file.

### Example: run docspec changed then Claude

This repo’s [`.github/workflows/docspec-check.yml`](.github/workflows/docspec-check.yml) runs when a PR is merged: it prepares the prompt with `docspec changed`, then runs the [official Claude Code Action](https://github.com/anthropics/claude-code-action) with that prompt. Add `ANTHROPIC_API_KEY` to your repository secrets if you want the Claude step to run.

### Example: docspec generate (prompt only)

```yaml
- uses: actions/checkout@v4
- uses: docspec-ai/docspec/.github/actions/docspec-generate@main
  with:
    markdown_file: README.md
    overwrite: false
```

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
