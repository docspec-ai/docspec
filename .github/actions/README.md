# Docspec Actions

- **docspec-review** – Produces a prompt file for reviewing/syncing markdown with docspecs. Does not run an LLM; you pass the prompt to your own LLM (e.g. Claude). Supports per-window **inline** prompts and compact **batch** prompts for daily multi-commit reviews. The prompt covers syncing existing docspec+markdown (Case A), adding new documentation from changes (Case B), and adding docspecs for existing markdown that has none (Case C).

## docspec-review

Prepares a prompt file to review/sync markdown with docspecs. Runs `docspec review` with either a resolved commit window (batch or PR) or specific `review_files` for manual review.

**Outputs:** `prompt_file`, `has_prompt`, `base_sha`, `head_sha`, `commit_count`

**Inputs:**
| Input | Default | Description |
|---|---|---|
| `mode` | `pr` | `pr`/`inline` embeds full diff + content; `batch` emits a compact summary for daily windows |
| `since_tag` | `docspec/last-run` | Tag marking the previous successful batch run |
| `fallback_window` | `24 hours ago` | Used when `since_tag` is missing |
| `base_sha` / `merge_sha` / `base_ref` | (resolved) | Explicit window override; otherwise derived from tag / PR event / HEAD |
| `review_files` | | Manual markdown paths (skips commit-window discovery) |
| `changed_files` | | Optional explicit changed-file list |
| `max_docspecs` / `max_diff_chars` | mode defaults | Caps for candidates and diff/diffstat size |
| `output_file` | `prompt.txt` | Prompt path |
| `pr_number` | | Legacy PR lookup for workflow_dispatch |

### Batch window resolution

1. `git fetch --tags --force origin`
2. Base = `base_sha` input, else the `since_tag` commit, else `git rev-list -1 --before="<fallback_window>" HEAD`
3. Head = `merge_sha` input or `HEAD`
4. If base == head and no `review_files`, `has_prompt=false`

### Docspec-commit filter

In every non-empty window the action lists recently merged PRs whose head branch starts with `docspec/`, intersects their `mergeCommit.oid` with `git rev-list base..head`, and passes the result as `--exclude-commits` so yesterday's docspec-bot squash merges do not re-trigger work.

**Edge case:** a PR opened from a `docspec/` branch that a human then loads with real code changes is excluded wholesale. Prefer non-`docspec/` branch names for human work.

If the GitHub API call fails the filter is skipped (run continues unfiltered).

## Usage

Use the review prompt file with your own LLM step (e.g. [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)). See [.github/workflows/docspec-review.yml](../workflows/docspec-review.yml) for an example that runs docspec review, Claude, then advances the `docspec/last-run` tag.
