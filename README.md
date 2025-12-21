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

The validator will recursively find all docspec files, skipping `node_modules`, `.git`, and `dist` directories.

#### Generate a new docspec file

```bash
docspec generate path/to/README.docspec.md
```

This will generate a docspec file that references the target markdown file using the naming convention: `filename.docspec.md` targets `filename.md` (e.g., `README.docspec.md` references `README.md`, `docs/guide.docspec.md` references `docs/guide.md`).

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

To use docspec with [pre-commit](https://pre-commit.com/), see [`.pre-commit-config.yaml`](.pre-commit-config.yaml) for the configuration. The hook uses `docspec validate` as the entry point, targets `\.docspec\.md$` files, and passes filenames to the validate command.

Then install the pre-commit hooks:

```bash
pre-commit install
```

The hook will automatically validate any modified `*.docspec.md` files on commit. The hook passes filenames to the validate command, which will validate only those specific files. If no filenames are passed, the validator recursively finds all `*.docspec.md` files in the directory tree.

## GitHub Action Integration

Docspec includes two GitHub Actions for different use cases:

1. **Post-merge documentation updates** (`.github/workflows/docspec-sync.yml`) - Automatically syncs markdown files after PR merges
2. **Manual docspec audit** (`.github/workflows/docspec-audit.yml`) - Manually triggered workflow to audit and improve docspec files

### Post-Merge Documentation Updates

This action automatically updates markdown files based on `*.docspec.md` files after PR merges. It uses Claude Code CLI (not the Anthropic API directly) to explore the repository and directly edit documentation files.

#### Setup

1. **Add the workflow** to your repository: [`.github/workflows/docspec-sync.yml`](.github/workflows/docspec-sync.yml)

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
4. Claude directly edits the target markdown file based on the code changes and docspec requirements
5. A new PR is opened with the documentation updates

**File naming convention**: The action uses the pattern `filename.docspec.md` → `filename.md`:
- `README.docspec.md` → targets `README.md`
- `docs/guide.docspec.md` → targets `docs/guide.md`

#### Configuration Options

The action supports optional inputs:

- `max_docspecs` (default: `10`) - Maximum number of docspec files to process per merge
- `max_diff_chars` (default: `120000`) - Maximum characters in PR diff before truncation
- `anthropic_model` (default: `claude-sonnet-4-5`) - Anthropic model to use (short alias for the Claude Sonnet 4.5 model)

See [`.github/workflows/docspec-sync.yml`](.github/workflows/docspec-sync.yml) for the complete workflow file and [`action.yml`](action.yml) for all available configuration options.

**Note**: For this repository's own workflow files, you can use the local reference `uses: ./` (at the action level in the step) instead of the published action reference. This applies to both the post-merge workflow and the manual improvement workflow.

#### Safety Features

The action includes multiple guardrails to ensure safe operation:

- **Max files limit**: Prevents processing too many files in a single run (default: 10)
- **Diff truncation**: Large PR diffs are truncated to stay within token limits (default: 120,000 characters)
- **File modification validation**: Verifies that files were actually modified and not deleted
- **No new files**: Only existing markdown files can be modified
- **No non-markdown modifications**: Only markdown files can be modified
- **Concurrency control**: Prevents multiple workflow runs from conflicting
- **Controlled environment**: Claude Code CLI runs with built-in tools in a controlled filesystem environment

### Manual Docspec Audit

The docspec-audit workflow allows you to manually trigger an audit and improvements to a docspec file and its associated markdown file. This is useful when you want to:

- Update a docspec to better reflect the current state of the markdown
- Discover gaps in documentation that aren't triggered by code changes
- Regenerate a docspec from scratch

#### Setup

Add the workflow to your repository: [`.github/workflows/docspec-audit.yml`](.github/workflows/docspec-audit.yml)

#### How It Works

The workflow uses a two-phase approach with Claude Code CLI:

1. **Discovery Phase**: Claude explores the repository using available tools (no editing capabilities) and creates a detailed information discovery plan identifying:
   - Missing information in the docspec (what should be documented but isn't)
   - Irrelevant or incorrect information in the docspec (what doesn't match reality)
   - Missing information in the markdown file (gaps in documentation)

2. **Implementation Phase**: Claude uses editing tools with `--permission-mode acceptEdits` to update both files based on the discovery plan. It preserves the exact structure of the docspec file (headers, separators, frontmatter, AGENT INSTRUCTIONS section) while only updating the content within sections 1-5.

Before the discovery phase begins, the workflow:
- Generates or overwrites the docspec file using `docspec generate`
- Validates the updated docspec file using `docspec validate` after changes are made

#### Usage

1. Go to Actions → "Audit and improve docspec" in your repository
2. Click "Run workflow"
3. Enter the path to the markdown file (e.g., `README.md`)
4. The workflow will generate/update the corresponding docspec file and create a PR with improvements

**Note**: This workflow requires the `ANTHROPIC_API_KEY` secret to be configured.

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

