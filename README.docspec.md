# DOCSPEC: [README.md](/README.md)

> The main README for the docspec project, providing an overview, installation instructions, usage examples, and integration guides.

## AGENT INSTRUCTIONS

**Target document:** `README.md`

**Your task:**

* Compare the target document against this docspec.  
* Update the target document to satisfy this docspec.  
* Make the smallest changes necessary.  
* Preserve existing content that already complies.  
* Do not invent content, sections, or facts not implied by this docspec or the repository.

## 1. Document Purpose

This document serves as the primary entry point for users and contributors to the docspec project. It must:

- Explain what docspec is and why it exists (a specification format and toolchain for agent-maintained documentation)
- Provide clear installation instructions for both local and global npm installations
- Demonstrate how to use the CLI commands (`validate` and `generate`)
- Show library usage examples with TypeScript/JavaScript code
- Explain integration options (pre-commit hooks and GitHub Actions)
- Provide development setup instructions (testing, building)

This is a **project overview and user guide** that balances high-level concepts with practical, copy-pasteable examples. It should enable both end users and contributors to get started quickly.

## 2. Update Triggers

This document should be updated when:

- **CLI commands change**: New commands added, existing command syntax modified, or command behavior changes
- **API changes**: The library exports (`validateDocspec`, `generateDocspec`) change their signatures or return types
- **New features added**: New capabilities that users should know about (e.g., new validation rules, new generator options)
- **Installation methods change**: Package name, installation commands, or distribution method changes
- **Integration examples change**: Pre-commit hook configuration or GitHub Action setup requirements change
- **Development workflow changes**: Test commands, build process, or contribution guidelines change
- **Package metadata changes**: Version, description, or other package.json fields that affect user experience

This document should **NOT** be updated for:
- Internal refactoring that doesn't change public APIs or CLI behavior
- Test-only changes that don't affect user-facing functionality
- Documentation-only changes to other files (unless they affect how users interact with the tool)
- Dependency updates that don't change behavior or requirements

## 3. Expected Structure

The document should contain these sections in order:

1. **Title and brief description** - Project name and one-line explanation of what docspec is
2. **The Docspec Format** - Brief overview of the format with link to `docspec-format.md` for details. Lists the 5 required sections and mentions the validator requirement
3. **Installation** - npm install commands for both local and global installation
4. **Usage** - Two subsections:
   - **CLI Commands** - Examples for `validate` and `generate` commands with clear use cases
   - **Library Usage** - TypeScript code examples showing how to import and use the library functions
5. **Pre-commit Integration** - Complete `.pre-commit-config.yaml` example and installation instructions
6. **GitHub Action Integration** - Comprehensive guide including:
   - Setup instructions with complete workflow YAML
   - Configuration options and their defaults
   - How it works (discovery, processing, patch generation)
   - Safety features
7. **Development** - Brief sections on running tests and building
8. **License** - MIT license statement

**Constraints:**
- Keep code examples minimal but complete (users should be able to copy-paste)
- Link to `docspec-format.md` rather than duplicating format details
- For GitHub Actions, include both the basic setup and advanced configuration examples
- Don't include exhaustive API documentation (that belongs in code comments or separate docs)
- Keep the tone practical and action-oriented

## 4. Editing Guidelines

**Tone and style:**
- Write in clear, direct language suitable for both technical users and contributors
- Use active voice where possible ("Run this command" not "This command should be run")
- Be concise but complete - every example should work as written

**Code examples:**
- All code blocks must be syntactically correct and tested
- Include both simple and advanced use cases where relevant
- Use realistic file paths and configuration values
- For YAML examples, ensure proper indentation and formatting

**Accuracy requirements:**
- CLI command syntax must match the actual implementation in `src/cli.ts`
- Library API examples must match exports in `src/index.ts`
- Version numbers, package names, and file paths must be accurate
- GitHub Action inputs must match the actual action definition in `action.yml`

**Do:**
- Verify all commands work before including them
- Keep examples up-to-date with the latest codebase
- Use consistent formatting (markdown, code blocks, etc.)
- Link to related files (like `docspec-format.md`) rather than duplicating content
- Include both npm local and global installation options

**Don't:**
- Invent new CLI commands or API methods not in the codebase
- Include placeholder text or TODOs
- Duplicate content that exists in other documentation files
- Add speculative features or future plans
- Use overly technical jargon without explanation

## 5. Intentional Omissions

This document deliberately does not cover:

- **Detailed format specification**: The `docspec-format.md` file contains the complete format definition. This README only provides a brief overview and link.
- **Internal implementation details**: How the validator or generator work internally is not relevant to users
- **Exhaustive API documentation**: Type definitions and detailed parameter descriptions belong in code comments and TypeScript definitions, not the README
- **Contributing guidelines**: If a separate CONTRIBUTING.md exists, link to it rather than duplicating
- **Changelog or version history**: These belong in CHANGELOG.md or release notes
- **Troubleshooting or FAQ**: These can be added if needed, but aren't required for the initial user experience
- **Alternative installation methods**: Focus on npm as the primary distribution method unless others become officially supported
