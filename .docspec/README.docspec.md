# DOCSPEC: [README.md](/README.md)

> A specification that defines how the target document should be maintained by agents.

## AGENT INSTRUCTIONS

**Target document:** `README.md`

**Your task:**

* Compare the target document against this docspec.  
* Update the target document to satisfy this docspec.  
* Make the smallest changes necessary.  
* Preserve existing content that already complies.  
* Do not invent content, sections, or facts not implied by this docspec or the repository.

**Mandatory corrections when the README does not comply:**
* **Minimal installation code example**: If the example includes a `with:` block, a `name:` line, or any optional parameters (e.g. `review_files`), replace the entire example with exactly one step: `- uses: docspec-ai/docspec/.github/actions/docspec-review@main` (and nothing else in that code block). The minimal example must show only that single line so readers see the simplest possible install.
* **Action inputs/outputs in body**: If the README contains a subsection that lists all action inputs and outputs (e.g. **Inputs:** / **Outputs:** with multiple bullets), remove that subsection and replace it with one sentence that links to [action.yml](.github/actions/docspec-review/action.yml) for options (e.g. "Optional inputs and outputs: see action.yml."). Do not duplicate the full list in the README.
* **Template sections and validation**: Do not describe docspec template sections as "required." Use language such as "The default template includes 5 sections" (then list them). Do not state that each section must contain non-boilerplate content or any minimum length (e.g. 50 characters); docspec does not validate this. Remove any such validation claims.



## 1. Document Purpose

This README serves as the primary entry point and comprehensive documentation for the docspec project. It is a technical project overview that must answer:

- **What is docspec?** - A specification format and toolchain for agent-maintained documentation
- **How do I add docspec to my GitHub project?** - Primary: GitHub Actions integration (docspec-review action, example workflow). This must be the first concrete use case readers see so they can quickly implement docspec on their own repo.
- **What is the docspec format?** - High-level overview and reference to both docspec-template.md (structure of each docspec file) and docspec-prompt.md (instructions used when running docspec review)
- **How do I install it?** - Super minimal installation first: in your own workflow add a step that uses the action from this repo (e.g. `uses: <this-repo>/.github/actions/docspec-review@main`); then npm installation methods (local and global) for local or scripted use
- **How do I use it from the CLI or as a library?** - Secondary: CLI commands and TypeScript API for users who need local or programmatic use
- **How do I integrate it elsewhere?** - Pre-commit hooks
- **How do I develop with it?** - Test and build commands

**Target audiences (priority order):**
- GitHub Actions users adding docspec to their project (primary)
- End-users using the CLI for validation and generation (secondary)
- Library consumers using the TypeScript API (secondary)
- CI/CD integrators and contributors

**Document type:** Technical project documentation (README/overview)

## 2. Update Triggers

**Changes that SHOULD trigger updates:**

- **CLI changes** (src/cli.ts): New commands, modified command arguments, changed command behavior
- **Validation logic** (src/validator.ts): New validation rules, changed error messages, modified validation behavior
- **Docspec format definition** (docspec-template.md): Changes to template sections, section names, or structure
- **Docspec review prompt** (docspec-prompt.md): Changes to the steps or instructions appended when running docspec review
- **GitHub Action configuration** (action.yml): New inputs/outputs, changed defaults, modified descriptions
- **Workflow files** (.github/workflows/docspec-review.yml): Workflow name changes, trigger changes, new steps or configuration
- **Installation method** (package.json): Package name changes, new installation requirements
- **File naming convention**: Docspec files live under .docspec/ (e.g. .docspec/README.docspec.md for README.md)
- **Template sections** (src/constants.ts): Changes to default section list or section definitions
- **Pre-commit hook configuration** (.pre-commit-config.yaml): Changes to hook setup or usage
- **Library API exports** (src/index.ts): New exported functions, types, or constants; removed exports; changed function signatures

**Changes that SHOULD NOT trigger updates:**

- Internal implementation details that don't affect public APIs (validator internals, create internals, template internals)
- Test file changes (src/__tests__/*) unless they reveal new documented behavior
- Build system changes (tsconfig.json, package build scripts) that don't affect installation or usage
- Dependency version updates that don't change user-facing functionality
- Code refactoring that preserves the same external behavior

## 3. Expected Structure

The README must contain these sections in this order. **GitHub Actions (use on your project) is the primary path and must appear early**; CLI and library usage are secondary and appear later.

1. **Title and Description**: Package name (`# docspec`) and one-sentence description; note that docspec does not run an LLM and that docspec files live under .docspec/. Briefly mention the two key files: docspec-template (format for each docspec) and docspec-prompt (instructions for the review flow).

2. **GitHub Actions (use docspec on your project)**: Must appear near the top, immediately after the intro, so readers quickly see how to add docspec to their own GitHub project.
   - **Minimal installation**: The code example must be exactly one step and one line in the YAML block: `- uses: <this-repo>/.github/actions/docspec-review@main`. No `name:` line, no `with:` block, no optional parameters (e.g. review_files) in that example—readers must see the simplest possible install. Optional inputs are documented only via a link to action.yml, not in the minimal example. Use actual repo path and ref in the README.
   - docspec-review action is prompt-only (no LLM, no API keys in docspec itself)
   - Example workflow: run on PR merge (or manual), prepare prompt with the action, then run your own LLM (e.g. Claude Code Action)
   - Reference this repo’s workflow (`.github/workflows/docspec-review.yml`) and action (`.github/actions/docspec-review`); link to action.yml for inputs/outputs—do not list them all in the README body.
   - Constraint: Keep this section short and direct; it is the primary use case

3. **The Docspec Format**: High-level overview of the format and review flow
   - **docspec-template**: Defines the structure of each `*.docspec.md` file (Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions). Used when creating new docspecs (`docspec create`); the project copy is `.docspec/docspec-template.md`, seeded from the repo’s docspec-template.md if missing. Link to docspec-template.md as the definitive format specification. Describe the default template as including 5 sections (Document Purpose, Update Triggers, Expected Structure, Editing Guidelines, Intentional Omissions)—do not call them "required." Do NOT state that sections must contain non-boilerplate content or any minimum length; docspec does not validate. Do NOT duplicate the full format; link to docspec-template.md.
   - **docspec-prompt**: The task instructions appended to the output when running `docspec review`. It tells the agent how to act (compare target to docspec, update if needed, create new docs or docspecs when appropriate, open a PR). Customizable at `.docspec/docspec-prompt.md`; seeded from the repo’s docspec-prompt.md if missing. Link to docspec-prompt.md so readers understand the review flow.
   - Constraint: Keep this section a high-level overview; link to docspec-template.md and docspec-prompt.md for details

4. **Installation**: Minimal installation first, then npm for local/scripted use.
   - **Minimal (CI)**: Add a step that uses the action from this repo (e.g. `uses: <this-repo>/.github/actions/docspec-review@main`); no npm install needed.
   - Local installation (`npm install docspec`)
   - Global installation (`npm install -g docspec`)
   - Constraint: Keep concise, no version-specific details

5. **Usage**: How to use docspec from the CLI or as a library (secondary to GitHub Actions):
   - **CLI Commands**: Document `docspec create <markdown_path> [--overwrite]` (creates empty doc and docspec if missing; `--overwrite` replaces only the docspec, not the markdown) and `docspec review` with examples matching src/cli.ts exactly
   - **Library Usage**: TypeScript import examples showing exported functions and types from src/index.ts
   - Constraint: Code examples must be actual working commands from the codebase

6. **Pre-commit Integration**: How to use with pre-commit hooks (target .docspec/*.docspec.md)

7. **Development**: Commands for contributors (npm test, npm run build)

8. **License**: License type (MIT)

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
- **Minimal install example**: Show only `- uses: <repo>/.github/actions/docspec-review@<ref>`. No `with:` block, no optional parameters in that example. Options belong in action.yml or a separate "Advanced" note.

**DO:**
- Use actual command examples: `docspec create README.md`, `docspec create README.md --overwrite`, `docspec review --base X --merge Y`
- Reference source files when describing behavior
- Link to definitive sources: action.yml for configuration options, docspec-template.md for format details, docspec-prompt.md for review-task instructions
- Prefer brevity; one clear example beats long explanations

**DON'T:**
- In the minimal installation example, include `with:` or optional inputs (e.g. review_files)—it suggests configuration is required and obscures simplicity
- Describe docspec template sections as "required" or state that sections must contain non-boilerplate content or any minimum length; docspec does not validate
- Invent CLI flags or options that don't exist in src/cli.ts
- Document internal APIs not exported from src/index.ts
- State that docspec runs an LLM or requires API keys (it only produces prompts)
- Duplicate full action input/output lists in the README; link to action.yml instead

## 5. Intentional Omissions

This README deliberately excludes:

**Internal implementation details:**
- TypeScript implementation internals (validator, create, template, constants, path-utils, review, generate)
- Validation algorithm implementation details
- Template rendering and substitution logic

**Development and build details:**
- Test implementation and test file structure
- Build configuration (tsconfig.json, build scripts)
- Package.json configuration details beyond installation

**Docspec format and review prompt:**
- The detailed format specification lives in docspec-template.md; the review-task instructions live in docspec-prompt.md
- The README provides only a high-level overview and links to both files
