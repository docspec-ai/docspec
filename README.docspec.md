---

# DOCSPEC: Readme

> Short phrase: *What this doc is for* (e.g. "Overview of this directory's purpose and structure.")

---

## 1. Purpose of This Document

This is the **main README for the docspec npm package**. It serves as both user-facing documentation and package documentation for the npm registry.

This document must answer:
- How do I install docspec?
- What commands are available and how do I use them?
- How do I use docspec as a library in TypeScript/JavaScript?
- How do I integrate docspec with pre-commit hooks?
- How do I set up the GitHub Actions workflows for automated documentation updates?
- How do I contribute to development?

Document type: This is a **multi-purpose document** combining installation guide, CLI reference, API reference, integration guide, and GitHub Actions documentation.

---

## 2. When This Document Should Be Updated

This document should be updated when:

- CLI commands change in `src/cli.ts` (new commands, modified options, changed behavior)
- Exported API functions or types change in `src/index.ts` (new exports, signature changes, removed exports)
- Validation rules change in `src/validator.ts` or `src/constants.ts` (new requirements, modified checks)
- The docspec format definition changes in `docspec-format.md` (new sections, modified template)
- GitHub Actions workflows change in `action.yml`, `.github/workflows/docspec-sync.yml`, or `.github/workflows/docspec-audit.yml` (new inputs, changed triggers, modified behavior)
- Python scripts change in `.github/actions/docspec-sync/scripts/` or `.github/actions/docspec-audit/scripts/` (workflow behavior changes)
- Package metadata changes in `package.json` (version, scripts, bin commands, dependencies)
- Pre-commit hook configuration changes in `.pre-commit-config.yaml`

---

## 3. Structure & Required Sections

**Required sections and their purpose:**

1. **Installation** - How to install docspec via npm (both local and global installation)

2. **Usage** - How to use the docspec CLI
   - **CLI Commands** subsection - Document each command (`validate`, `generate`) with examples, arguments, and behavior details including directory skipping and error handling

3. **Library Usage** - How to use docspec as a TypeScript/JavaScript library with code examples that match the actual exported API (must include `generateDocspecContent()` and exported types/constants)

4. **Pre-commit Integration** - How to integrate with pre-commit framework, referencing `.pre-commit-config.yaml`

5. **GitHub Action Integration** - Comprehensive documentation for both GitHub Actions workflows
   - **Post-Merge Documentation Updates** subsection - Document the `.github/workflows/docspec-sync.yml` workflow with setup instructions, detailed "How It Works" explanation including discovery strategy (sibling docspecs, ancestor docspecs), configuration options, and safety features
   - **Manual Docspec Audit** subsection - Document the `.github/workflows/docspec-audit.yml` workflow with setup instructions, the two-phase approach (discovery and implementation), pre-discovery generation step, post-implementation validation, and usage instructions

6. **Development** - How to contribute, run tests, and build the project (including test framework details, TypeScript compilation, and `prepublishOnly` script)

7. **License** - Package license information

**Constraints:**
- Code examples must be executable and match the actual API (no theoretical features)
- Workflow names must match actual workflow file names exactly
- File paths must be accurate (e.g., `.github/workflows/docspec-sync.yml`)
- GitHub Actions documentation must be comprehensive with both setup instructions AND detailed "How It Works" explanations

---

## 4. Style & Editing Guidelines

**Code formatting:**
- Use fenced code blocks with language tags (```bash for shell commands, ```typescript for TypeScript examples)
- Code examples must be tested against actual implementation - no invented APIs

**Structure:**
- Preserve hierarchical section structure (## for major sections, ### for subsections, #### for sub-subsections)
- Keep sections in order as defined in section 3

**File references:**
- Always include actual file paths when referencing files (e.g., `.github/workflows/docspec-sync.yml`, `src/cli.ts:92`)
- Use relative links to files in the repository

**GitHub Actions documentation:**
- Include both setup instructions (what files to add, what secrets to configure) AND detailed "How It Works" sections explaining the workflow behavior
- Update Configuration Options sections when `action.yml` inputs change
- Document actual workflow names from the YAML files, not idealized names

**Accuracy requirements:**
- Workflow names must match the `name:` field in workflow YAML files exactly
- When documenting the discovery phase, explain "sibling docspecs" and "ancestor docspecs" clearly
- Update examples when API signatures change

**What NOT to do:**
- Don't add emojis unless explicitly requested
- Don't document theoretical features that don't exist in the code
- Don't remove section structure or placeholders that define the document organization

---

## 5. Known Gaps or Intentional Omissions

**Intentionally omitted implementation details:**
- Internal validator logic (`src/validator.ts` implementation) - only document user-facing behavior
- Internal generator logic (`src/generator.ts` implementation) - only document the public API
- Format parser internals - only document the format specification itself
- Python script implementation details (`.github/actions/*/scripts/*.py`) - only document high-level workflow behavior and what users need to know
- Claude Code CLI internals - only document that it's used and what capabilities it provides
- Test implementation details - only document that tests exist and how to run them
- TypeScript compilation configuration details - only document the build command

**Information deliberately kept elsewhere:**
- Docspec format specification lives in `docspec-format.md` - README only provides overview
- Detailed template structure (placeholders like `{{TARGET_FILE}}`, `{{AGENT_INSTRUCTIONS}}`, `{{SECTIONS}}`) is documented in `docspec-format.md`, not the README

**Not yet documented:**
- Package version number (0.1.0) - this can be omitted as it's available in package.json and npm registry
- Python requirements files - these are implementation details of the GitHub Actions
