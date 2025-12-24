# Example Workflows

This directory contains example workflow files that you can copy to your own repository to use the docspec GitHub Actions.

## Quick Start

1. Copy the example workflow file(s) to your repository's `.github/workflows/` directory
2. Copy the required Python scripts to your repository:
   - For `docspec-check`: Copy `.github/scripts/prepare-docspec-check-prompt.py`
   - For `docspec-generate`: Copy `.github/scripts/prepare-docspec-generate-prompts.py`
3. Configure the required secrets:
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Available Workflows

### docspec-check

Automatically syncs markdown files based on `*.docspec.md` files after PR merges.

**Example file**: `docspec-check-example.yml`

**Usage**: Copy the entire workflow file to your repository. The workflow uses `docspec-ai/github-ai-actions@main` internally and requires the Python scripts from this repository (`.github/scripts/prepare-docspec-check-prompt.py`).

### docspec-generate

Manually triggered workflow to generate and improve docspec files.

**Example file**: `docspec-generate-example.yml`

**Usage**: Copy the entire workflow file to your repository. The workflow uses `docspec-ai/github-ai-actions@main` internally and requires the Python scripts from this repository (`.github/scripts/prepare-docspec-generate-prompts.py`).

## Dependencies

These workflows depend on:
- `docspec-ai/github-ai-actions@main` - The underlying AI automation action
- Python scripts from this repository for preparing prompts
- The `docspec` CLI tool (installed via npm for the generate workflow)

For production use, consider pinning `docspec-ai/github-ai-actions` to a specific version tag rather than using `@main` for stability.

## More Information

See the main [README.md](../../../README.md) for detailed documentation on how the actions work and their configuration options.

