# Docspec Actions

- **docspec-review** – Produces a prompt file for reviewing/syncing markdown with docspecs. Does not run an LLM; you pass the prompt to your own LLM (e.g. Claude). The prompt covers syncing existing docspec+markdown (Case A), adding new documentation from changes (Case B), and adding docspecs for existing markdown that has none (Case C).

## docspec-review

Prepares a prompt file to review/sync markdown with docspecs. Runs `docspec review` with either PR base/merge (and optional `changed_files`) or specific `review_files` for manual review.

**Outputs:** `prompt_file` (path to prompt file), `has_prompt` (true/false)

**Inputs:** `pr_number`, `base_sha`, `merge_sha`, `base_ref`, `review_files` (markdown paths for manual review), `changed_files`, `max_docspecs`, `max_diff_chars`, `output_file`

## Usage

Use the review prompt file with your own LLM step (e.g. [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)). See [.github/workflows/docspec-review.yml](../workflows/docspec-review.yml) for an example that runs docspec review then Claude.
