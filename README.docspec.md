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



## 1. Document Purpose

This README serves as the primary entry point and comprehensive documentation for the docspec project. It is a technical project overview that must answer:

- **What is docspec?** - A specification format and toolchain for agent-maintained documentation
- **How do I install it?** - npm installation methods (local and global)
- **How do I use it?** - CLI commands (`validate`, `generate`) and TypeScript API usage
- **How do I integrate it?** - Pre-commit hooks, GitHub Actions (post-merge sync, manual audit)
- **What is the docspec format?** - High-level overview and reference to docspec-format.md
- **How do I develop with it?** - Test and build commands

**Target audiences:**
- End-users using the CLI for validation and generation
- Library consumers using the TypeScript API in their projects
- GitHub Actions users integrating automated documentation workflows
- CI/CD integrators adding docspec validation to their pipelines
- Contributors developing and testing the project

**Document type:** Technical project documentation (README/overview)

## 2. Update Triggers

**Changes that SHOULD trigger updates:**

- **CLI changes** (src/cli.ts): New commands, modified command arguments, changed command behavior
- **Validation logic** (src/validator.ts): New validation rules, changed error messages, modified validation behavior
- **Docspec format definition** (docspec-format.md): Changes to required sections, section names, validation rules
- **GitHub Action configuration** (action.yml): New inputs/outputs, changed defaults, modified descriptions
- **Workflow files** (.github/workflows/docspec-check.yml, docspec-generate.yml): Workflow name changes, trigger changes, new steps or configuration
- **Installation method** (package.json): Package name changes, new installation requirements
- **File naming convention**: Changes to how .docspec.md maps to .md files
- **Required sections** (src/constants.ts): Changes to REQUIRED_SECTIONS array or section definitions
- **Pre-commit hook configuration** (.pre-commit-config.yaml): Changes to hook setup or usage
- **Library API exports** (src/index.ts): New exported functions, types, or constants; removed exports; changed function signatures

**Changes that SHOULD NOT trigger updates:**

- Internal implementation details that don't affect public APIs (validator internals, generator internals, format-parser internals)
- Test file changes (src/__tests__/*) unless they reveal new documented behavior
- Build system changes (tsconfig.json, package build scripts) that don't affect installation or usage
- Python script implementation details (docspec_update.py, improve_docspec.py) - these are internal to GitHub Actions
- Dependency version updates that don't change user-facing functionality
- Code refactoring that preserves the same external behavior

## 3. Expected Structure

The README must contain these sections in order:

1. **Title and Description**: Package name (`# docspec`) and one-sentence description of what docspec is

2. **The Docspec Format**: High-level overview of the format
   - Link to docspec-format.md as the definitive format specification
   - List the 5 required sections by name
   - Explain validation requirements (non-boilerplate content, 50-character minimum)
   - Constraint: Do NOT duplicate the full format specification; link to docspec-format.md instead

3. **Installation**: npm installation instructions
   - Local installation (`npm install docspec`)
   - Global installation (`npm install -g docspec`)
   - Constraint: Keep concise, no version-specific details

4. **Usage**: How to use docspec with subsections:
   - **CLI Commands**: Document `validate` and `generate` commands with examples matching src/cli.ts exactly
   - **Library Usage**: TypeScript import examples showing exported functions and types from src/index.ts
   - Constraint: Code examples must be actual working commands from the codebase

5. **Pre-commit Integration**: How to use with pre-commit hooks
   - Reference .pre-commit-config.yaml
   - Installation command (`pre-commit install`)
   - Brief explanation of how validation works
   - Constraint: High-level only, link to actual config file

6. **GitHub Action Integration**: How to use the GitHub Actions
   - Overview of the two workflows (post-merge sync, manual audit)
   - **Post-Merge Documentation Updates** subsection:
     - Setup instructions (add workflow, configure secrets)
     - How it works (discovery strategy, Claude Code CLI invocation, PR creation)
     - File naming convention (filename.docspec.md → filename.md)
     - Configuration options (reference action.yml inputs)
     - Safety features (list specific guardrails)
   - **Manual Docspec Audit** subsection:
     - What it's for (audit, discover gaps, regenerate)
     - How it works (two-phase approach: discovery and implementation)
     - Usage instructions (how to trigger workflow)
   - Constraint: Link to actual workflow files instead of duplicating YAML; configuration options must match action.yml exactly

7. **Development**: Commands for contributors
   - Running tests (`npm test`, `npm run test:watch`)
   - Building (`npm run build`)
   - Constraint: Keep minimal, only essential commands

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
- File paths in examples must use the actual naming convention (.docspec.md → .md)
- Workflow references should use actual file names (.github/workflows/docspec-check.yml, docspec-generate.yml)

**Level of detail:**
- Keep workflow configuration sections high-level; link to actual YAML files instead of duplicating content
- Reference the 5 required sections by name when describing validation
- Link to docspec-format.md for the full format specification; don't duplicate it in the README
- Safety features should list specific guardrails without implementation details
- Pre-commit integration should be high-level; link to .pre-commit-config.yaml

**DO:**
- Use actual command examples that work: `docspec validate`, `docspec generate path/to/README.docspec.md`
- Reference source files when describing behavior: "matches src/cli.ts", "exported from src/index.ts"
- Link to definitive sources: action.yml for configuration options, docspec-format.md for format details
- Mention that docspec-format.md is included in the published package
- Note that validation handles permission errors gracefully

**DON'T:**
- Invent CLI flags or options that don't exist in src/cli.ts
- Document internal APIs not exported from src/index.ts
- Include version-specific information (except referencing package.json)
- Repeat YAML workflow content verbatim; link to files instead
- Duplicate the docspec format specification from docspec-format.md
- Add exhaustive lists of every possible feature or edge case

## 5. Intentional Omissions

This README deliberately excludes:

**Internal implementation details:**
- TypeScript implementation internals (src/validator.ts, src/generator.ts, src/format-parser.ts, src/constants.ts)
- Validation algorithm implementation details
- Template rendering and substitution logic
- How the format file is parsed and cached

**GitHub Action internals:**
- Python script implementation (docspec_update.py, improve_docspec.py) - these are internal automation scripts
- Claude Code CLI prompt templates (.github/actions/*/templates/*.md)
- Action step-by-step implementation details
- How unified diff patches are generated and applied

**Development and build details:**
- Test implementation and test file structure (src/__tests__/)
- Build configuration (tsconfig.json, build scripts)
- Package.json configuration details beyond installation
- Pre-commit hook internal implementation

**Docspec format specification:**
- The detailed format specification lives in docspec-format.md
- Section definitions, boilerplate text, validation rules are defined there
- The README provides only a high-level overview and links to the format file

**Where to find this information:**
- Format specification: docspec-format.md
- API implementation: src/ directory TypeScript files
- GitHub Action implementation: .github/actions/ directory
- Tests: src/__tests__/ directory
- Build configuration: tsconfig.json, package.json
