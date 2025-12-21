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

Each section must be customized. The validator ensures each section contains non-boilerplate content.

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

#### Generate a new docspec file

```bash
docspec generate path/to/README.docspec.md
```

This will generate a docspec file that references the target markdown file (e.g., `README.docspec.md` references `README.md`).

### Library Usage

```typescript
import { validateDocspec, generateDocspec } from "docspec";

// Validate a file
const result = await validateDocspec("path/to/file.docspec.md");
if (!result.valid) {
  console.error("Validation errors:", result.errors);
}

// Generate a new docspec file
await generateDocspec("path/to/README.docspec.md");
```

## Pre-commit Integration

To use docspec with [pre-commit](https://pre-commit.com/), add the following to your `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: docspec-validate
        name: Validate docspec files
        entry: docspec validate
        language: system
        files: \.docspec\.md$
        pass_filenames: true
```

Then install the pre-commit hooks:

```bash
pre-commit install
```

The hook will automatically validate any modified `*.docspec.md` files on commit.

## GitHub Action Integration

Docspec includes a GitHub Action that automatically updates markdown files based on `*.docspec.md` files after PR merges, using Claude Code CLI to explore the repository and generate patches.

### Setup

1. **Add the workflow** to your repository (`.github/workflows/docspec-claude.yml`):

```yaml
name: Update docs from docspec after merge

on:
  pull_request:
    types: [closed]

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: docspec-claude-${{ github.repository }}
  cancel-in-progress: false

jobs:
  docspec_update:
    if: ${{ github.event.pull_request.merged == true }}
    runs-on: ubuntu-latest

    steps:
      - name: Run docspec updater
        uses: docspec-ai/docspec@main
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          pr_number: ${{ github.event.pull_request.number }}
          base_sha: ${{ github.event.pull_request.base.sha }}
          merge_sha: ${{ github.event.pull_request.merge_commit_sha }}
          repo: ${{ github.repository }}
          base_ref: ${{ github.event.pull_request.base.ref }}
```

2. **Configure secrets**: 
   - Add `ANTHROPIC_API_KEY` to your repository secrets (Settings → Secrets and variables → Actions)

3. **File naming convention**: The action uses Option B convention:
   - `README.docspec.md` → targets `README.md`
   - `docs/guide.docspec.md` → targets `docs/guide.md`

### How It Works

1. When a PR is merged, the workflow triggers
2. The action discovers relevant `*.docspec.md` files using directory-based discovery:
   - Files that changed directly in the PR
   - Files in the same directory as any changed file
   - Files in parent directories (walking up to repo root) of any changed file
3. For each docspec, Claude Code CLI explores the repository using built-in tools (Read, Glob, Grep, Bash, etc.) to understand the codebase context
4. Claude generates a unified diff patch to update the target markdown based on the code changes and docspec requirements
5. Patches are applied and a new PR is opened with the documentation updates

### Configuration Options

The action supports optional inputs:

- `max_docspecs` (default: `10`) - Maximum number of docspec files to process per merge
- `max_diff_chars` (default: `120000`) - Maximum characters in PR diff before truncation
- `anthropic_model` (default: `claude-3-5-sonnet-20241022`) - Anthropic model to use

Example with custom configuration:

```yaml
- name: Run docspec updater
  uses: ./.github/actions/docspec-claude
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    pr_number: ${{ github.event.pull_request.number }}
    base_sha: ${{ github.event.pull_request.base.sha }}
    merge_sha: ${{ github.event.pull_request.merge_commit_sha }}
    repo: ${{ github.repository }}
    base_ref: ${{ github.event.pull_request.base.ref }}
    max_docspecs: '5'
    max_diff_chars: '60000'
    anthropic_model: 'claude-3-opus-20240229'
```

**Note**: For this repository's own workflow, you can use the local reference `./` instead of the published action.

### Safety Features

The action includes several guardrails:

- **Max files limit**: Prevents processing too many files in a single run
- **Diff truncation**: Large PR diffs are truncated to stay within token limits
- **Unified diff validation**: Only accepts properly formatted patches
- **Path validation**: Patches must reference the expected file path
- **No new files**: Patches cannot create new files or modify non-markdown files
- **Concurrency control**: Prevents multiple runs from conflicting
- **Filesystem exploration**: Claude Code CLI provides built-in tools (Read, Glob, Grep, Bash) that run in a controlled environment

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

