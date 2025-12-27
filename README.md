# docspec

Docspec is a specification format and toolchain for documentation that is maintained by agents.

## The Docspec Format

Each `*.docspec.md` file is a specification for another document. The format is defined in [`docspec-format.md`](docspec-format.md), which serves as both the format definition and a reference example.

The format includes 5 required sections:
1. **Document Purpose** - What this document exists to explain or enable
2. **Update Triggers** - What kinds of changes should cause this document to be updated
3. **Expected Structure** - The sections this document should contain
4. **Editing Guidelines** - How edits to this document should be made
5. **Intentional Omissions** - What this document deliberately does not cover

Each section must be customized. The validator ensures each section contains non-boilerplate content by checking that:
- Each section differs from the template boilerplate text
- Content is not just whitespace differences from boilerplate
- Each section has at least 50 characters of meaningful content

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

#### Validate docspec files

Validate specific files:

```bash
docspec validate path/to/file.docspec.md
```

Or validate all `*.docspec.md` files in the current directory tree:

```bash
docspec validate
```

The validator will recursively find all docspec files, skipping `node_modules`, `.git`, and `dist` directories. Permission errors are handled gracefully and will not cause validation to fail.

Add the `--verbose` flag for detailed logging output:

```bash
docspec --verbose validate
```

#### Generate a new docspec file

```bash
docspec generate path/to/README.docspec.md
```

This will generate a docspec file that references the target markdown file using the naming convention: `filename.docspec.md` targets `filename.md` (e.g., `README.docspec.md` references `README.md`, `docs/guide.docspec.md` references `docs/guide.md`).

Add the `--verbose` flag for detailed logging output:

```bash
docspec --verbose generate path/to/README.docspec.md
```

### Library Usage

```typescript
import { validateDocspec, generateDocspec } from "docspec";
import type { ValidationResult, DocspecSection } from "docspec";

// Validate a file
const result: ValidationResult = await validateDocspec("path/to/file.docspec.md");
if (!result.valid) {
  console.error("Validation errors:", result.errors);
}

// Generate a new docspec file
await generateDocspec("path/to/README.docspec.md");
```

The library exports:
- `validateDocspec()` - Validate a docspec file
- `generateDocspec()` - Generate a new docspec file
- `generateDocspecContent()` - Generate docspec content as a string
- `ValidationResult` - Type for validation results
- `DocspecSection` - Type for docspec sections
- `REQUIRED_SECTIONS` - Array of required section names
- `SECTION_BOILERPLATE` - Boilerplate text for each section
- `logger` - Logger instance for verbose output
- `LogLevel` - Enum for log levels

## Pre-commit Integration

To use docspec with [pre-commit](https://pre-commit.com/), see [`.pre-commit-config.yaml`](.pre-commit-config.yaml) for the configuration. The hook uses `docspec validate` as the entry point, targets `\.docspec\.md$` files, and passes filenames to the validate command.

Then install the pre-commit hooks:

```bash
pre-commit install
```

The hook will automatically validate any modified `*.docspec.md` files on commit. The hook passes filenames to the validate command, which will validate only those specific files. If no filenames are passed, the validator recursively finds all `*.docspec.md` files in the directory tree.

## GitHub Action Integration

Docspec provides reusable GitHub Actions that automatically maintain documentation:

1. **Post-merge documentation updates** - Automatically syncs markdown files after PR merges
2. **Manual docspec generation** - Manually triggered workflow to generate and improve docspec files

### Using Docspec Actions in Your Repository

#### Quick Start

1. **Create a workflow file** in your repository's `.github/workflows/` directory and copy one of the examples below
2. **Update the action reference** in the workflow file:
   - Replace `owner/repo` with the actual repository (e.g., `docspec-ai/docspec`)
   - Use a specific version tag (e.g., `@v1.0.0`) or branch (e.g., `@main`) for stability
3. **Configure secrets**:
   - Add `ANTHROPIC_API_KEY` to your repository secrets (Settings → Secrets and variables → Actions)
   - `GITHUB_TOKEN` is automatically provided by GitHub Actions

That's it! No need to copy Python scripts or manage complex setup - the actions handle everything internally.

#### Example: docspec-check

```yaml
name: Docspec check

on:
  pull_request:
    types: [closed]

jobs:
  docspec_check:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docspec-ai/docspec/.github/actions/docspec-check@main
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

#### Example: docspec-generate

```yaml
name: Docspec generate

on:
  workflow_dispatch:
    inputs:
      markdown_file:
        description: 'Path to markdown file (e.g., README.md)'
        required: true
      overwrite:
        description: 'If true, overwrite existing docspec file. If false and docspec exists, action will fail.'
        required: false
        default: 'false'

jobs:
  generate_docspec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docspec-ai/docspec/.github/actions/docspec-generate@main
        with:
          markdown_file: ${{ inputs.markdown_file }}
          overwrite: ${{ inputs.overwrite }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

The examples above show everything you need. For reference, you can also look at the actual workflows used in this repository:
- [`.github/workflows/docspec-check.yml`](.github/workflows/docspec-check.yml) - Uses self-reference for the docspec repo itself
- [`.github/workflows/docspec-generate.yml`](.github/workflows/docspec-generate.yml) - Uses self-reference for the docspec repo itself

### Post-Merge Documentation Updates

This action automatically updates markdown files based on `*.docspec.md` files after PR merges. It uses Claude Code CLI (not the Anthropic API directly) to explore the repository and generate unified diff patches for documentation updates.

#### Setup

1. **Create a workflow file** `.github/workflows/docspec-check.yml` in your repository using the example above

2. **Configure secrets**:
   - Add `ANTHROPIC_API_KEY` to your repository secrets (Settings → Secrets and variables → Actions)
   - `GITHUB_TOKEN` is automatically provided by GitHub Actions

#### How It Works

1. When a PR is merged, the workflow triggers
2. The action discovers relevant `*.docspec.md` files using a three-part discovery strategy:
   - Files that changed directly in the PR (docspec files modified in the merge)
   - Files in the same directory as any changed file (sibling docspecs)
   - Files in parent directories, walking up to the repository root (ancestor docspecs)
3. For each discovered docspec, Claude Code CLI is invoked with built-in tools to explore the repository and understand the codebase context
4. Claude generates a unified diff patch to update the target markdown file based on the code changes and docspec requirements
5. Unified diff patches are validated and applied to update the markdown files
6. A new PR is opened with the documentation updates

**File naming convention**: The action uses the pattern `filename.docspec.md` → `filename.md`:
- `README.docspec.md` → targets `README.md`
- `docs/guide.docspec.md` → targets `docs/guide.md`

#### Configuration Options

The action supports all options from [`github-ai-actions`](https://github.com/docspec-ai/github-ai-actions), plus docspec-specific options:

**Docspec-specific options:**
- `max_docspecs` (default: `10`) - Maximum number of docspec files to process per merge
- `max_diff_chars` (default: `120000`) - Maximum characters in PR diff before truncation

**Provider selection:**
- `provider` (default: `claude`) - AI provider to use: `'claude'` or `'codex'`

**Claude-specific options:**
- `claude_args` - Additional arguments to pass to Claude Code CLI (e.g., `"--max-turns 5 --model claude-3-5-sonnet-20241022"`). To specify a model, use `--model` flag: `"--model claude-sonnet-4-5"` or `"--model claude-3-5-sonnet-20241022"`
- `claude_code_oauth_token` - Claude Code OAuth token (alternative to `anthropic_api_key`)
- `use_bedrock` (default: `false`) - Use Amazon Bedrock instead of direct Anthropic API
- `use_vertex` (default: `false`) - Use Google Vertex AI instead of direct Anthropic API
- `use_foundry` (default: `false`) - Use Microsoft Foundry instead of direct Anthropic API

**Codex-specific options:**
- `openai_api_key` - OpenAI API key for Codex
- `responses_api_endpoint` - Optional Responses API endpoint override (e.g., for Azure OpenAI)
- `codex_args` - Extra arguments forwarded to `codex exec` (JSON array or shell-style string)
- `codex_sandbox` (default: `workspace-write`) - Sandbox mode: `workspace-write`, `read-only`, or `danger-full-access`
- `codex_safety_strategy` (default: `drop-sudo`) - Safety strategy: `drop-sudo`, `unprivileged-user`, `read-only`, or `unsafe`

**Plan phase options:**
- `enable_plan` (default: `false` for docspec-check, `true` for docspec-generate) - Enable plan phase before implementation
- `plan_prompt_template` - Optional prompt template for the plan phase
- `plan_model` - Optional model to use for plan phase (overrides default model)

**PR customization options:**
- `branch_prefix` - Prefix for generated branches (defaults provided by action)
- `pr_title_template` - Template for created PR title (supports variable placeholders)
- `pr_body_template` - Template for created PR body (supports variable placeholders)
- `base_branch` - Base branch to create new branch from (defaults to repository default branch)

For complete details, see [`.github/actions/docspec-check/action.yml`](.github/actions/docspec-check/action.yml) and [`.github/actions/docspec-generate/action.yml`](.github/actions/docspec-generate/action.yml).

#### Safety Features

The action includes multiple guardrails to ensure safe operation:

- **Max files limit**: Prevents processing too many files in a single run (default: 10)
- **Diff truncation**: Large PR diffs are truncated to stay within token limits (default: 120,000 characters)
- **Unified diff validation**: Only accepts properly formatted patches that start with `diff --git` or `--- ` markers
- **Path validation**: Patches must reference the expected file path
- **No new files**: Patches cannot create new files
- **No non-markdown modifications**: Only markdown files can be modified
- **Concurrency control**: Prevents multiple workflow runs from conflicting
- **Controlled environment**: Claude Code CLI runs with built-in tools in a controlled filesystem environment

### Manual Docspec Generation

The docspec-generate workflow allows you to manually trigger generation and improvements to a docspec file and its associated markdown file. This is useful when you want to:

- Update a docspec to better reflect the current state of the markdown
- Discover gaps in documentation that aren't triggered by code changes
- Regenerate a docspec from scratch

#### Setup

1. **Create a workflow file** `.github/workflows/docspec-generate.yml` in your repository using the example above

2. **Configure secrets**:
   - Add `ANTHROPIC_API_KEY` to your repository secrets (Settings → Secrets and variables → Actions)
   - `GITHUB_TOKEN` is automatically provided by GitHub Actions

#### How It Works

The workflow uses a two-phase approach with Claude Code CLI:

1. **Discovery Phase**: Claude explores the repository using available tools (no editing capabilities) and creates a detailed information discovery plan identifying:
   - Missing information in the docspec (what should be documented but isn't)
   - Irrelevant or incorrect information in the docspec (what doesn't match reality)
   - Missing information in the markdown file (gaps in documentation)

2. **Implementation Phase**: Claude uses editing tools with `--permission-mode acceptEdits` to update both files based on the discovery plan. It preserves the exact structure of the docspec file (headers, separators, frontmatter, AGENT INSTRUCTIONS section) while only updating the content within sections 1-5.

Before the discovery phase begins, the workflow:
- Generates the docspec file using `docspec generate` (by default, this fails if the docspec already exists; set `overwrite: true` to overwrite existing docspecs)
- Validates the updated docspec file using `docspec validate` after changes are made

#### Usage

1. Go to Actions → "Audit and improve docspec" in your repository
2. Click "Run workflow"
3. Enter the path to the markdown file (e.g., `README.md`)
4. The workflow will generate/update the corresponding docspec file and create a PR with improvements

**Note**: This workflow requires the `ANTHROPIC_API_KEY` secret to be configured.

#### Configuration Options

The `docspec-generate` action supports all options from [`github-ai-actions`](https://github.com/docspec-ai/github-ai-actions), plus docspec-specific options:

**Docspec-specific options:**
- `markdown_file` (required) - Path to markdown file (e.g., `README.md`)
- `overwrite` (default: `false`) - If true, overwrite existing docspec file. If false and docspec exists, action will fail

**Provider selection:**
- `provider` (default: `claude`) - AI provider to use: `'claude'` or `'codex'`

**Claude-specific options:**
- `claude_args` - Additional arguments to pass to Claude Code CLI (e.g., `"--max-turns 5 --model claude-3-5-sonnet-20241022"`). To specify a model, use `--model` flag: `"--model claude-sonnet-4-5"` or `"--model claude-3-5-sonnet-20241022"`
- `claude_code_oauth_token` - Claude Code OAuth token (alternative to `anthropic_api_key`)
- `use_bedrock` (default: `false`) - Use Amazon Bedrock instead of direct Anthropic API
- `use_vertex` (default: `false`) - Use Google Vertex AI instead of direct Anthropic API
- `use_foundry` (default: `false`) - Use Microsoft Foundry instead of direct Anthropic API

**Codex-specific options:**
- `openai_api_key` - OpenAI API key for Codex
- `responses_api_endpoint` - Optional Responses API endpoint override (e.g., for Azure OpenAI)
- `codex_args` - Extra arguments forwarded to `codex exec` (JSON array or shell-style string)
- `codex_sandbox` (default: `workspace-write`) - Sandbox mode: `workspace-write`, `read-only`, or `danger-full-access`
- `codex_safety_strategy` (default: `drop-sudo`) - Safety strategy: `drop-sudo`, `unprivileged-user`, `read-only`, or `unsafe`

**Plan phase options:**
- `enable_plan` (default: `true`) - Enable plan phase before implementation (enabled by default for docspec-generate)
- `plan_prompt_template` - Optional prompt template for the plan phase
- `plan_model` - Optional model to use for plan phase (overrides default model)

**PR customization options:**
- `branch_prefix` - Prefix for generated branches (default: `"docs/generate-"`)
- `pr_title_template` - Template for created PR title (supports variable placeholders, default provided by action)
- `pr_body_template` - Template for created PR body (supports variable placeholders, default provided by action)
- `base_branch` - Base branch to create new branch from (defaults to repository default branch)

For complete details, see [`.github/actions/docspec-generate/action.yml`](.github/actions/docspec-generate/action.yml).

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

