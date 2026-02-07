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
- **How do I use it?** - CLI commands (`docspec create <filename.md>` to create doc + docspec, `docspec review`) and TypeScript API usage
- **How do I integrate it?** - Pre-commit hooks, GitHub Actions (prompt-only; you run your own LLM)
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
- **Workflow files** (.github/workflows/docspec-review.yml): Workflow name changes, trigger changes, new steps or configuration
- **Installation method** (package.json): Package name changes, new installation requirements
- **File naming convention**: Docspec files live under .docspec/ (e.g. .docspec/README.docspec.md for README.md)
- **Required sections** (src/constants.ts): Changes to REQUIRED_SECTIONS array or section definitions
- **Pre-commit hook configuration** (.pre-commit-config.yaml): Changes to hook setup or usage
- **Library API exports** (src/index.ts): New exported functions, types, or constants; removed exports; changed function signatures

**Changes that SHOULD NOT trigger updates:**

- Internal implementation details that don't affect public APIs (validator internals, create internals, template internals)
- Test file changes (src/__tests__/*) unless they reveal new documented behavior
- Build system changes (tsconfig.json, package build scripts) that don't affect installation or usage
- Dependency version updates that don't change user-facing functionality
- Code refactoring that preserves the same external behavior

## 3. Expected Structure

The README must contain these sections in order:

1. **Title and Description**: Package name (`# docspec`) and one-sentence description; note that docspec does not run an LLM and that docspec files live under .docspec/

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
   - **CLI Commands**: Document `docspec create <markdown_path> [--overwrite]` (creates empty doc and docspec if missing; `--overwrite` replaces only the docspec, not the markdown) and `docspec review` with examples matching src/cli.ts exactly
   - **Library Usage**: TypeScript import examples showing exported functions and types from src/index.ts
   - Constraint: Code examples must be actual working commands from the codebase

5. **Pre-commit Integration**: How to use with pre-commit hooks (target .docspec/*.docspec.md)

6. **GitHub Actions**: Prompt-only action (docspec-review); example workflow that runs docspec-review then Claude; no API keys required by docspec itself

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

**DO:**
- Use actual command examples: `docspec create README.md`, `docspec create README.md --overwrite`, `docspec review --base X --merge Y`
- Reference source files when describing behavior
- Link to definitive sources: action.yml for configuration options, docspec-format.md for format details

**DON'T:**
- Invent CLI flags or options that don't exist in src/cli.ts
- Document internal APIs not exported from src/index.ts
- State that docspec runs an LLM or requires API keys (it only produces prompts)

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

**Docspec format specification:**
- The detailed format specification lives in docspec-format.md
- The README provides only a high-level overview and links to the format file
