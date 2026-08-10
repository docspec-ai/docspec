# DOCSPEC: [README.md](/README.md)

> A spec format and toolchain: you define how each document should be maintained; the toolchain (e.g. GitHub Actions) runs an LLM to review and update docs against those specs on a daily schedule.

## 1. Document Purpose

This README serves as the primary entry point and comprehensive documentation for the docspec project. It is a technical project overview that must answer:

- **What is docspec?** - A spec format and toolchain for keeping docs aligned with explicit specs. You define how each document should be maintained (in `.docspec/*.docspec.md`); the main offering is the GitHub workflow: add one workflow file, and on a **daily schedule** an LLM (e.g. Claude) reviews and updates docs against those spec files for all commits since the last successful run. The CLI is secondary and only produces prompts (no LLM).
- **Why is it useful?** - Docs stay aligned with their specs; review is automated and runs in CI once per day; you choose the LLM (and API keys stay in your workflow).
- **How do I add docspec to my GitHub project?** - Primary: GitHub Actions integration. The simplest path is to call this repo's reusable workflow (one job with `uses: docspec-ai/docspec/.github/workflows/docspec-review.yml@main`, passing `mode: batch` and only `ANTHROPIC_API_KEY` in `secrets`—no `secrets: inherit` (GITHUB_TOKEN is automatic)); the caller must declare its own `schedule` cron. Alternatively use the docspec-review action inline and wire your own LLM. This must be the first concrete use case readers see so they can quickly implement docspec on their own repo.
- **How does the daily window work?** - A `docspec/last-run` git tag marks the previous successful run; the next run diffs that tag..HEAD. First run falls back to 24 hours. `base_sha` workflow_dispatch input allows manual backfill. Prior docspec-bot PRs are excluded. The agent opens a draft PR on the first commit and commits/pushes after each docspec.
- **What is the docspec format?** - High-level overview and reference to both docspec-template.md (structure of each docspec file) and docspec-prompt.md (instructions used when running docspec review)
- **How do I install it?** - Simplest: one workflow file that calls this repo's reusable workflow (no copying steps); or add a step that uses the action from this repo for inline use. Then npm installation methods (local and global) for local or scripted use.
- **How do I use it from the CLI or as a library?** - Secondary: CLI commands and TypeScript API for users who need local or programmatic use, including `--mode batch` and `--exclude-commits`
- **How do I develop with it?** - Test and build commands

**Target audiences (priority order):**
- GitHub Actions users adding docspec to their project (primary)
- End-users using the CLI for validation and generation (secondary)
- Library consumers using the TypeScript API (secondary)
- CI/CD integrators and contributors

**Document type:** Technical project documentation (README/overview)

## 2. Update Triggers

**Changes that SHOULD trigger updates:**

- **CLI changes** (src/cli.ts): New commands, modified command arguments, changed command behavior (including `--mode`, `--exclude-commits`)
- **Validation logic** (src/validator.ts): New validation rules, changed error messages, modified validation behavior
- **Docspec format definition** (docspec-template.md): Changes to template sections, section names, or structure
- **Docspec review prompt** (docspec-prompt.md): Changes to the steps or instructions appended when running docspec review
- **GitHub Action configuration** (.github/actions/docspec-review/action.yml): New inputs/outputs, changed defaults, modified descriptions (mode, since_tag, fallback_window, base_sha/head_sha outputs)
- **Workflow files** (.github/workflows/docspec-review.yml): Workflow name changes, trigger changes (schedule, workflow_dispatch, workflow_call), new steps (advance last-run tag) or configuration
- **Installation method** (package.json): Package name changes, new installation requirements
- **File naming convention**: Docspec files live under .docspec/ (e.g. .docspec/README.docspec.md for README.md)
- **Template sections** (src/constants.ts): Changes to default section list or section definitions
- **Library API exports** (src/index.ts): New exported functions, types, or constants; removed exports; changed function signatures (including `ReviewMode`, batch options)

**Changes that SHOULD NOT trigger updates:**

- Internal implementation details that don't affect public APIs (validator internals, create internals, template internals, ranking algorithm internals)
- Test file changes (src/__tests__/*) unless they reveal new documented behavior
- Build system changes (tsconfig.json, package build scripts) that don't affect installation or usage
- Dependency version updates that don't change user-facing functionality
- Code refactoring that preserves the same external behavior

## 3. Expected Structure

The README must contain these sections in this order. **GitHub Actions (use on your project) is the primary path and must appear early**; CLI and library usage are secondary and appear later.

1. **Title and Description**: Package name (`# docspec`) and a short pitch that sells the project: what it is (spec format and toolchain for keeping docs aligned with explicit specs), why it's useful (keep docs in sync with specs, automated review in CI), and how it works. Emphasize that the **primary way to use docspec is the GitHub workflow**—add one workflow file and an LLM (e.g. Claude) reviews and syncs docs on a **daily schedule** over all commits since the last run; the workflow does call an LLM. The CLI is optional and only produces prompt output (no LLM in the docspec tool itself). State that docspec files live under .docspec/ and briefly mention the two key files: docspec-template (format for each docspec) and docspec-prompt (instructions for the review flow). Do not claim "Docspec does not run an LLM" as a blanket statement—that is only true for the CLI; the main installation (GitHub workflow) does run an LLM. **Mandatory correction if the intro does not comply:** If the intro claims "Docspec does not run an LLM" (or similar) as a blanket statement, or still describes per-PR-merge triggering, rewrite the intro to sell the project around the daily batch model.

2. **GitHub Actions (use docspec on your project)**: Must appear near the top, immediately after the intro, so readers quickly see how to add docspec to their own GitHub project. **Both options must be documented:** (1) Simplest: call the reusable workflow, (2) Inline workflow (action + Claude step). If the README only shows the single-step action and does not document the reusable-workflow option, add the "Simplest: call the reusable workflow" subsection first with the full YAML example.
   - **Simplest: call the reusable workflow**: First subsection. Describe adding one workflow file that **calls** this repo's workflow (no need to copy steps or the action). Require ANTHROPIC_API_KEY in repository secrets. **Scope secret access to only ANTHROPIC_API_KEY**—do not use `secrets: inherit`; GITHUB_TOKEN is provided automatically by GitHub and need not be passed. Include a full YAML example: workflow name; triggers (`schedule` with a daily cron AND `workflow_dispatch` with inputs `base_sha` and `review_files`); one job with no `if`, `uses: docspec-ai/docspec/.github/workflows/docspec-review.yml@main`, `with` (`mode: batch`, `base_sha`, `review_files` from github.event.inputs), and `secrets` passing only ANTHROPIC_API_KEY. Note that **callers must declare their own schedule** because `schedule` in a reusable workflow does not fire for callers. Use actual repo path and ref.
   - **How the daily window works**: Sub-subsection (or bullets under Simplest) covering: `docspec/last-run` tag advanced after success; first-run 24h fallback; `base_sha` backfill override; exclusion of prior `docspec/*` PRs; draft PR opened on first commit with incremental commits.
   - **Inline workflow (action + Claude step)**: Second subsection. For users who want to run the docspec-review **action** themselves and wire their own LLM step, show exactly one step: `- uses: docspec-ai/docspec/.github/actions/docspec-review@main`. Link to action.yml for all inputs and outputs. Reference this repo's workflow file for the full flow (prompt preparation then Claude then tag advance). Note that ANTHROPIC_API_KEY is needed for the Claude step.
   - The action prepares the review prompt; a separate step (in our workflow or the user's) runs the chosen LLM—so the full flow does use an LLM; API keys live in your repo secrets, not in docspec.
   - Constraint: Keep this section short and direct; it is the primary use case

3. **The Docspec Format**: High-level overview of the format and review flow
   - **docspec-template**: Defines the structure of each `*.docspec.md` file (Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions). Used when creating new docspecs (`docspec create`); the project copy is `.docspec/docspec-template.md`, seeded from the repo’s docspec-template.md if missing. Link to docspec-template.md as the definitive format specification. Describe the default template as including 5 sections (Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions)—do not call them "required." Do NOT state that sections must contain non-boilerplate content or any minimum length (e.g. 50 characters); docspec does not validate. Remove any such validation claims if present. Do NOT duplicate the full format; link to docspec-template.md.
   - **docspec-prompt**: The task instructions appended to the output when running `docspec review`. It tells the agent how to act (compare target to docspec, update if needed, create new docs or docspecs when appropriate, open a PR). Customizable at `.docspec/docspec-prompt.md`; seeded from the repo’s docspec-prompt.md if missing. Note that batch mode appends additional incremental-commit instructions after this file. Link to docspec-prompt.md so readers understand the review flow.
   - Constraint: Keep this section a high-level overview; link to docspec-template.md and docspec-prompt.md for details

4. **Installation**: Simplest CI option first (call reusable workflow or use action step), then npm for local/scripted use.
   - **Minimal (CI)**: Call this repo's reusable workflow (see GitHub Actions section) or add a step that uses the action; no npm install needed.
   - Local installation (`npm install docspec`)
   - Global installation (`npm install -g docspec`)
   - Constraint: Keep concise, no version-specific details

5. **Usage**: How to use docspec from the CLI or as a library (secondary to GitHub Actions):
   - **CLI Commands**: Document `docspec create <markdown_path> [--overwrite]` (creates empty doc and docspec if missing; `--overwrite` replaces only the docspec, not the markdown) and `docspec review` with examples matching src/cli.ts exactly, including `--mode batch`, `--exclude-commits`, `--base-ref`
   - **Library Usage**: TypeScript import examples showing exported functions and types from src/index.ts, including `mode: "batch"` and `ReviewMode`
   - Constraint: Code examples must be actual working commands from the codebase

6. **Development**: Commands for contributors (npm test, npm run build)

7. **License**: License type (MIT)

## 4. Editing Guidelines

**Tone and audience:**
- Use technical but accessible language
- Target developers familiar with Node.js/npm, GitHub Actions, and CI/CD concepts
- Be concise and direct; avoid marketing language

**Code examples and accuracy:**
- CLI command documentation must match src/cli.ts exactly
- Library API examples must only show functions/types exported from src/index.ts
- Action inputs/outputs must match action.yml exactly
- File paths: docspecs under .docspec/ (e.g. .docspec/README.docspec.md for README.md)
- Workflow references should use actual file names (.github/workflows/docspec-review.yml)
- **Simplest (reusable workflow)**: Show the full workflow YAML that calls this repo's workflow with `uses: docspec-ai/docspec/.github/workflows/docspec-review.yml@main`, `with.mode: batch`, and `secrets` passing only ANTHROPIC_API_KEY (never `secrets: inherit`; GITHUB_TOKEN is automatic). Triggers must be `schedule` + `workflow_dispatch` (not `pull_request`). Do not add a job-level `if`. **Inline (action) example**: Show only `- uses: docspec-ai/docspec/.github/actions/docspec-review@main`; no `with:` in that minimal example. Options belong in action.yml or the reusable-workflow example.

**DO:**
- Use actual command examples: `docspec create README.md`, `docspec create README.md --overwrite`, `docspec review --mode batch --base X --merge Y`
- Reference source files when describing behavior
- Link to definitive sources: action.yml for configuration options, docspec-template.md for format details, docspec-prompt.md for review-task instructions
- Prefer brevity; one clear example beats long explanations
- Describe the daily batch model (tag, fallback, draft PR on first commit), not per-PR-merge triggering

**DON'T:**
- In the **inline** action example, include `with:` or optional inputs (e.g. review_files)—that example must stay a single line; the reusable-workflow example is where full configuration is shown
- Describe docspec template sections as "required" or state that sections must contain non-boilerplate content or any minimum length; docspec does not validate. Remove any such validation claims if present.
- Invent CLI flags or options that don't exist in src/cli.ts
- Document internal APIs not exported from src/index.ts
- Claim "Docspec does not run an LLM" as a blanket statement—the GitHub workflow (the main installation) does run an LLM; only the CLI is prompt-only. Do not say docspec itself requires or stores API keys (your workflow does).
- Describe the primary trigger as per-PR-merge; the primary model is daily batch.
- Duplicate full action input/output lists in the README; link to action.yml instead.

**Mandatory corrections when the README does not comply:**
- **Action inputs/outputs in body**: If the README contains a subsection that lists all action inputs and outputs (e.g. **Inputs:** / **Outputs:** with multiple bullets), remove that subsection and replace it with one sentence that links to [action.yml](.github/actions/docspec-review/action.yml) for options (e.g. "Optional inputs and outputs: see action.yml."). Do not duplicate the full list in the README.
- **Stale PR-merge trigger**: If the README still shows `pull_request: types: [closed]` or `pr_number` inputs as the primary example, replace them with the daily `schedule` + `workflow_dispatch` (`base_sha`, `review_files`) example and `mode: batch`.

## 5. Intentional Omissions

This README deliberately excludes:

**Internal implementation details:**
- TypeScript implementation internals (validator, create, template, constants, path-utils, review ranking algorithm, generate)
- Validation algorithm implementation details
- Template rendering and substitution logic

**Development and build details:**
- Test implementation and test file structure
- Build configuration (tsconfig.json, build scripts)
- Package.json configuration details beyond installation

**Docspec format and review prompt:**
- The detailed format specification lives in docspec-template.md; the review-task instructions live in docspec-prompt.md
- The README provides only a high-level overview and links to both files
