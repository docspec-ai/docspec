# Docspec Actions Architecture

This directory previously contained reusable GitHub Actions, but the architecture has been simplified.

## Current Architecture

The docspec workflows now use [github-ai-actions](https://github.com/docspec-ai/github-ai-actions) directly instead of custom action wrappers. This provides:

1. **Simplified maintenance** - Less custom code to maintain
2. **Better integration** - Full use of github-ai-actions features like automatic PR number extraction
3. **Consistency** - Same pattern used across all AI-powered workflows

## Workflow Pattern

The workflows follow this pattern:

1. **Checkout** - Checkout the repository
2. **Extract PR details** - Get commit SHAs and PR metadata (needed for prompt preparation)
3. **Prepare prompts** - Run Python scripts to prepare prompts based on docspec files
4. **Run AI automation** - Use `docspec-ai/github-ai-actions@main` to execute Claude Code and create PRs

## Prompt Preparation Scripts

The prompt preparation scripts are located in `.github/scripts/`:

- `prepare-docspec-check-prompt.py` - Discovers docspec files and prepares prompts for post-merge updates
- `prepare-docspec-generate-prompts.py` - Prepares plan and implementation prompts for docspec generation

These scripts are specific to docspec's needs and prepare prompts that are then passed to github-ai-actions.

## Adding New Workflows

To add a new AI-powered workflow:

1. Create a workflow file in `.github/workflows/`
2. Use `docspec-ai/github-ai-actions@main` as the action
3. Prepare prompts using Python scripts or inline templates
4. Configure the action with appropriate inputs (see [github-ai-actions documentation](https://github.com/docspec-ai/github-ai-actions))
