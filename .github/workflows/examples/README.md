# Example Workflows

This directory contains example workflow files that you can copy to your own repository to use the docspec GitHub Actions.

## Quick Start

1. Copy the example workflow file(s) to your repository's `.github/workflows/` directory
2. Update the action references:
   - Replace `owner/repo` with the actual repository (e.g., `winton/docspec`)
   - Use a specific version tag (e.g., `@v1.0.0`) for stability, or use `@main` for the latest version
3. Configure the required secrets:
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Available Actions

### docspec-check

Automatically syncs markdown files based on `*.docspec.md` files after PR merges.

**Example file**: `docspec-check-example.yml`

**Action reference**: `owner/repo@version`

### docspec-generate

Manually triggered workflow to generate and improve docspec files.

**Example file**: `docspec-generate-example.yml`

**Action reference**: `owner/repo/.github/actions/docspec-generate@version`

## Versioning

For production use, always pin to a specific version tag (e.g., `@v1.0.0`) rather than using `@main`. This ensures your workflows continue to work even if breaking changes are introduced to the action.

## More Information

See the main [README.md](../../../README.md) for detailed documentation on how the actions work and their configuration options.

