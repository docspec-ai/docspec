# Docspec Actions

This directory contains reusable GitHub Actions that provide a simple interface for using docspec in your workflows.

## Available Actions

### `docspec-check`

Automatically syncs markdown files based on `*.docspec.md` files after PR merges.

**Usage:**
```yaml
- uses: docspec-ai/docspec/.github/actions/docspec-check@main
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs:**
- `anthropic_api_key` (required) - Anthropic API key for Claude
- `github_token` (required) - GitHub token for creating PRs
- `pr_number` (optional) - PR number (auto-extracted from event if not provided)
- `base_sha` (optional) - Base SHA (auto-extracted from event if not provided)
- `merge_sha` (optional) - Merge SHA (auto-extracted from event if not provided)
- `base_ref` (optional) - Base branch (auto-extracted from event if not provided)
- `max_docspecs` (optional, default: `10`) - Maximum docspec files to process
- `max_diff_chars` (optional, default: `120000`) - Maximum diff characters

### `docspec-generate`

Manually generates and improves docspec files and their associated markdown files.

**Usage:**
```yaml
- uses: docspec-ai/docspec/.github/actions/docspec-generate@main
  with:
    markdown_file: README.md
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

**Inputs:**
- `markdown_file` (required) - Path to markdown file (e.g., `README.md`)
- `anthropic_api_key` (required) - Anthropic API key for Claude
- `github_token` (required) - GitHub token for creating PRs

## How It Works

These actions internally:
1. Extract PR information from GitHub event context (if not provided)
2. Run Python scripts to prepare prompts based on docspec files
3. Use `docspec-ai/github-ai-actions@main` to execute Claude Code and create PRs

All the complexity is hidden - users just need to provide API keys and call the action!

