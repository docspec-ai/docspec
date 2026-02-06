# Docspec Actions

- **docspec-review** – Produces a prompt file for reviewing/syncing markdown with docspecs. Does not run an LLM; you pass the prompt to your own LLM (e.g. Claude).
- **docspec-generate** – Writes a docspec file from the template and opens a pull request. No LLM.

## docspec-review

Prepares a prompt file to review/sync markdown with docspecs. Runs `docspec review` with either PR base/merge (and optional `changed_files`) or specific `review_files` for manual review.

**Outputs:** `prompt_file` (path to prompt file), `has_prompt` (true/false)

**Inputs:** `pr_number`, `base_sha`, `merge_sha`, `base_ref`, `review_files` (markdown paths for manual review), `changed_files`, `max_docspecs`, `max_diff_chars`, `output_file`

## docspec-generate

Writes or overwrites a docspec file from the template for the given markdown file, then opens a pull request.

**Inputs:** `markdown_file` (required)

## Usage

Use the review prompt file with your own LLM step (e.g. [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)). See [.github/workflows/docspec-review.yml](../workflows/docspec-review.yml) for an example that runs docspec review then Claude.
