# Docspec Actions

Reusable GitHub Actions that **produce prompt files only**. They do not run an LLM or require API keys. You run your own LLM (e.g. Claude) and pass it the generated prompt.

## Actions

### docspec-check (Docspec Changed)

Prepares a prompt file to sync markdown with docspecs after PR merges. Runs `docspec changed` with PR base/merge SHAs (or optional `changed_files`).

**Outputs:** `prompt_file` (path to prompt file), `has_prompt` (true/false)

**Inputs:** `pr_number`, `base_sha`, `merge_sha`, `base_ref`, `changed_files`, `max_docspecs`, `max_diff_chars`, `output_file`

### docspec-generate

Generates a docspec for a markdown file and writes a prompt for your LLM. Runs `docspec generate <markdown_file>`.

**Outputs:** `prompt_file`

**Inputs:** `markdown_file` (required), `overwrite`, `output_prompt_file`, `output_plan_file`

## Usage

Use the prompt file with your own LLM step (e.g. [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)). See [.github/workflows/docspec-check.yml](../workflows/docspec-check.yml) for an example that runs docspec changed then Claude.
