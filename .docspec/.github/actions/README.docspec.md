# DOCSPEC: [.github/actions/README.md](/.github/actions/README.md)

> Reference documentation for the composite GitHub Actions shipped by this repo, kept in sync with their action.yml definitions.

## 1. Document Purpose

This README is the reference for the GitHub Actions published from this repository. It exists so a workflow author can wire an action into their own workflow without reading the action's shell implementation. It must reliably answer:

- **Which actions does this repo publish, and what does each one do?** - Currently one: `docspec-review`, which prepares a prompt file and does not run an LLM.
- **What inputs does the action accept and what are their defaults?** - A complete input table matching `action.yml`.
- **What outputs does the action expose?** - The full output list matching `action.yml`.
- **How is the review window resolved in batch mode?** - The ordered resolution of base and head SHAs (`base_sha` override, `since_tag`, `fallback_window`), and what happens when the window is empty.
- **How are prior docspec-bot commits filtered out?** - The `docspec/` head-branch PR filter, how it maps to `--exclude-commits`, its known edge case, and its failure behaviour.
- **How do I use the prompt it produces?** - Pointer to an LLM step and to this repo's workflow as a worked example.

**Target audiences (priority order):**
- Workflow authors adding the `docspec-review` action to their own repository
- Contributors changing the action's inputs, outputs, or window-resolution logic

**Document type:** Reference documentation (action reference)

## 2. Update Triggers

**Changes that SHOULD trigger updates:**

- **Action definition** (.github/actions/docspec-review/action.yml): New or removed inputs/outputs, changed defaults, changed input descriptions, changed action `name`/`description`
- **Window resolution logic** (the `Resolve review window` step): Changes to the order of base/head resolution, the `since_tag` or `fallback_window` behaviour, the empty-tree first-run fallback, or the empty-window (`has_prompt=false`) condition
- **Docspec-commit filter** (the `Detect prior docspec-bot commits` step): Changes to which PRs are excluded, how commits are intersected with the window, or what happens when the GitHub API call fails
- **New actions** added under .github/actions/: A new bullet in the summary list and a new section for the action
- **CLI flags the action passes** (src/cli.ts): Flags used by the action that change name or meaning (e.g. `--mode`, `--exclude-commits`, `--max-docspecs`, `--max-diff-chars`)
- **Referenced workflow** (.github/workflows/docspec-review.yml): Rename or removal of the example workflow this document links to

**Changes that SHOULD NOT trigger updates:**

- Internal prompt-generation logic in src/review.ts (ranking, truncation, prompt wording) that does not change an action input, output, or documented behaviour
- The pinned docspec version installed by the action
- Test file changes (src/__tests__/*)
- Shell refactors inside action steps that preserve the documented behaviour
- Root README.md changes; that document links here rather than duplicating this content

## 3. Expected Structure

The document must contain these sections in this order:

1. **Title and action summary**: `# Docspec Actions` followed by a one-bullet-per-action summary list. Each bullet names the action and states in one or two sentences what it produces, that it does not run an LLM, and which prompt shapes it supports.

2. **Per-action section** (one `##` per action, currently `## docspec-review`): A short lead paragraph on what the action prepares and how the window is chosen, then:
   - **Outputs**: One line listing every output name from action.yml
   - **Inputs**: A table with Input / Default / Description columns covering every input in action.yml
   - Constraint: Input and output names and defaults must match action.yml exactly; keep descriptions to one line each

3. **Batch window resolution**: A short numbered list giving the resolution order (tag fetch, base precedence, head precedence, empty-window outcome). Constraint: describe order and precedence only; do not reproduce the shell script.

4. **Docspec-commit filter**: How merged `docspec/*` PRs are detected, intersected with the window, and passed on as `--exclude-commits`, plus the known edge case and the API-failure fallback. Constraint: keep to a short paragraph plus the edge-case note.

5. **Usage**: How to consume the prompt file with an LLM step, linking to a concrete LLM action and to `.github/workflows/docspec-review.yml` as the worked example. Constraint: link out rather than inlining a full workflow YAML; the full caller example lives in the root README.

## 4. Editing Guidelines

**Tone and audience:**
- Terse reference style; assume familiarity with GitHub Actions
- Prefer tables and short lists over prose
- Avoid marketing language and tutorials

**Accuracy:**
- Input names, defaults, and output names must match .github/actions/docspec-review/action.yml exactly
- Behaviour statements must be traceable to a step in action.yml
- Use repo-relative links for workflow and action files

**DO:**
- List every input and output; this document is the definitive per-action reference that the root README links to
- State plainly that the action produces a prompt and does not call an LLM
- Note behaviour that is easy to get wrong (empty windows, first-run fallback, filter failure modes)
- Mark legacy inputs as such (e.g. `pr_number`)

**DON'T:**
- Duplicate the root README's installation, CLI, or library documentation
- Include a full caller workflow YAML; link to .github/workflows/docspec-review.yml instead
- Document docspec CLI flags that the action does not pass
- Describe internal src/ implementation details

## 5. Intentional Omissions

This document deliberately excludes:

**Root README content:**
- Installation, CLI commands, library API, and the reusable-workflow caller example live in [README.md](/README.md)

**Implementation details:**
- The shell implementation of each action step
- src/ TypeScript internals (ranking, prompt assembly, path utilities)
- The docspec file format, which lives in docspec-template.md, and the review-task instructions, which live in docspec-prompt.md
