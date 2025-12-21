# DOCSPEC: [README.md](/README.md)

> One line: what this document is for.

## AGENT INSTRUCTIONS

**Target document:** `README.md`

**Your task:**

* Compare the target document against this docspec.  
* Update the target document to satisfy this docspec.  
* Make the smallest changes necessary.  
* Preserve existing content that already complies.  
* Do not invent content, sections, or facts not implied by this docspec or the repository.



## 1. Document Purpose

This document is a project overview and getting started guide for developers and users of the docspec toolchain. It serves as the primary entry point for understanding the docspec project.

It must reliably answer:
- What is docspec and what problem does it solve?
- What is the docspec format and what are its required sections?
- How do I install docspec (locally or globally)?
- How do I use the CLI (validate and generate commands)?
- How do I use docspec as a library in TypeScript?
- How do I integrate docspec with pre-commit hooks?
- How do I set up GitHub Actions workflows for automated documentation updates?
- How do the two GitHub Actions workflows differ (post-merge updates vs. manual improvement)?
- What are the safety features and guardrails?
- How do I develop/test the project?

This is a user-facing README that combines installation instructions, usage examples, integration guides, and development setup. It documents both CLI and programmatic library usage, as well as two distinct GitHub Actions workflows for different use cases.

## 2. Update Triggers

This document should be updated when:

**Package and CLI changes:**
- `package.json` changes (name, version, description, bin entry, files array)
- `src/cli.ts` changes (command names, arguments, options, descriptions, help text)
- `src/index.ts` changes (exported functions, types, constants)

**Core behavior changes:**
- `src/validator.ts` changes (validation rules, required sections, error messages, minimum content length)
- `src/generator.ts` changes (template structure, file naming conventions)
- `src/constants.ts` changes that affect the template or boilerplate text
- `docspec-format.md` changes (format definition, required sections, boilerplate)

**Integration changes:**
- `.github/workflows/docspec-sync.yml` changes (workflow triggers, inputs, steps)
- `.github/workflows/docspec-audit.yml` changes (workflow triggers, inputs, steps)
- `action.yml` changes (action inputs, outputs, default values)
- `.github/actions/docspec-sync/scripts/*.py` changes affecting CLI interface
- `.github/actions/docspec-audit/scripts/*.py` changes affecting CLI interface or workflow behavior
- `.pre-commit-config.yaml` changes

**Should NOT trigger updates:**
- Test file changes (`*.test.ts`, `*.spec.ts`)
- Internal implementation details that don't affect public API
- Dependency version updates that don't change functionality
- TypeScript configuration (`tsconfig.json`)
- Build process internals
- GitHub Actions runner infrastructure details
- Python script internal implementation (only interface changes matter)

## 3. Expected Structure

The document must contain these sections in order:

1. **Project header and description** - Project name, one-line description of what docspec is
2. **The Docspec Format** - Brief overview of what docspec format is, link to `docspec-format.md`, list of 5 required sections with their purposes. Must note that each section must be customized and validation ensures non-boilerplate content.
3. **Installation** - npm install commands (local and global). Show both options clearly.
4. **Usage** - Introduction to usage, covering both CLI and library approaches
5. **CLI Commands** - Subsections for `validate` and `generate` commands with concrete bash examples. Show both file-specific and recursive validation. Explain that validate finds all `*.docspec.md` files when no paths provided, skipping `node_modules`, `.git`, and `dist`.
6. **Library Usage** - TypeScript examples showing `validateDocspec` and `generateDocspec` imports and usage from `src/index.ts`. Include error handling example.
7. **Pre-commit Integration** - Complete YAML configuration example from `.pre-commit-config.yaml`. Explain that hook passes filenames to validate command, and validator recursively finds docspecs if no paths provided. Include installation command.
8. **GitHub Action Integration** - Overview of both workflows, then separate subsections for each
   - **Post-Merge Documentation Updates** - Complete workflow YAML with all required inputs. Explain: three-part discovery strategy (changed files, same directory, parent directories), Claude Code CLI usage with built-in tools to explore the repository, unified diff patch generation, PR creation. Document all optional inputs with defaults. List all safety features (max files, diff truncation, unified diff validation, path validation, no new files, no non-markdown modifications, concurrency control, filesystem exploration in controlled environment). Include the file naming convention (`filename.docspec.md` → `filename.md`). Note the local reference option (`uses: ./`).
   - **Manual Docspec Audit** - Complete workflow YAML. Explain the two-phase approach: Discovery phase (exploration tools only, no editing), Implementation phase (editing tools with `--permission-mode acceptEdits`). Explain that it generates/overwrites the docspec first using `docspec generate`, then validates after updates. Document the workflow dispatch trigger and required input parameter.
9. **Development** - Commands for running tests (including watch mode) and building
10. **License** - MIT

**Constraints:**
- Code examples must match actual source files (especially `src/cli.ts` and `src/index.ts`)
- GitHub Actions sections must include complete workflow YAML, not abbreviated snippets
- Document all input parameters and their defaults explicitly
- Explain discovery strategies and safety features in detail
- Clarify that actions use Claude Code CLI, not the Anthropic API directly
- Show the actual permission modes and tool configurations
- Maintain clear separation between the two workflows and their use cases

**Linking vs Inlining:**
- When referencing existing files (workflows, configuration files, other documentation), use markdown links to the files rather than inlining their content
- For example, link to `.github/workflows/*.yml` files, `action.yml`, `docspec-format.md`, and Python scripts rather than copying their content into the document
- This keeps the document maintainable and avoids duplication
- Only inline content when it's essential for understanding (e.g., a small code snippet example)

## 4. Editing Guidelines

**Source of truth:**
- Use concrete examples from actual codebase files
- Keep code examples synchronized with `src/cli.ts` and `src/index.ts`
- Reference actual file paths and naming conventions from the codebase
- Link to source files where appropriate (use relative paths)

**Action documentation:**
- Include complete YAML workflow snippets, not conceptual descriptions
- Document all input parameters with their exact default values from `action.yml`
- Explain the three-part discovery strategy for finding relevant docspecs (changed files, same directory, parent directories)
- Clarify that workflows use Claude Code CLI (installed via npm), not the Anthropic API directly
- Show actual permission modes (`--permission-mode acceptEdits`) but do not mention specific tool names
- Document both discovery and implementation phases for the improve workflow (refer to "exploration tools" and "editing tools" generically)
- List all safety features explicitly (max files, diff validation, path validation, no new files, etc.)

**Code examples:**
- Show both CLI and library usage clearly
- Include error handling in library examples
- Use actual command names, flags, and options from `src/cli.ts`
- Show complete examples, not fragments

**Level of detail:**
- Provide enough detail for users to successfully integrate docspec
- Explain behavior that isn't obvious (e.g., recursive file finding, directory skipping)
- Document defaults and optional parameters
- Explain the difference between the two workflows clearly

**DO:**
- Maintain clear separation between CLI usage and library usage
- Show validation rules and requirements (minimum 50 chars, non-boilerplate content)
- Explain the file naming convention (`README.docspec.md` → `README.md`)
- Include setup steps (installing docspec, configuring secrets)
- Link to existing files (e.g., `[workflow file](.github/workflows/docspec-sync.yml)`, `[format definition](docspec-format.md)`) rather than inlining their content

**DON'T:**
- Document internal implementation details (validator/generator internals, Python script implementation)
- Include TypeScript type definitions unless needed for clarity
- Duplicate content from `docspec-format.md` (link to it instead)
- Explain how the validator or generator work internally
- Document GitHub Actions runner infrastructure
- Mention specific Claude tools by name (e.g., Read, Glob, Grep, Bash, Edit). Instead, refer to "available tools" or "built-in tools" generically

## 5. Intentional Omissions

This document intentionally excludes:

**Internal implementation details:**
- Validator implementation (`src/validator.ts` internals - section parsing, content validation logic)
- Generator implementation (`src/generator.ts` internals - template rendering)
- Constants and boilerplate management (`src/constants.ts` internal workings)
- Format parser implementation
- TypeScript type definitions (unless needed for API clarity)

**Development infrastructure:**
- Test infrastructure details (Jest configuration, test file structure)
- TypeScript configuration (`tsconfig.json`)
- Build process internals (beyond the `npm run build` command)
- Package publishing details

**GitHub Actions internals:**
- Python script implementation details (only the interface/behavior is documented)
- GitHub Actions runner infrastructure
- Pre-commit hook internals (beyond configuration)
- Claude Code CLI internal workings

**Other:**
- Contributing guidelines (would belong in a separate `CONTRIBUTING.md`)
- Changelog (would belong in `CHANGELOG.md`)
- Detailed format specification (documented in `docspec-format.md` instead)
- Issue templates, PR templates
- Security policy

**Where to find omitted information:**
- Docspec format details → `docspec-format.md`
- Source code implementation → `src/` directory
- Test examples → test files in the repository
- GitHub Actions behavior → workflow files in `.github/workflows/` (docspec-sync.yml and docspec-audit.yml)
