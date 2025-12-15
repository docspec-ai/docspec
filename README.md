# docspec

Generate and validate docspec files (`*.docspec.md`) with a standardized 5-section format.

## Installation

```bash
npm install docspec
```

Or install globally:

```bash
npm install -g docspec
```

## Usage

### CLI Commands

#### Validate docspec files

Validate specific files:

```bash
docspec validate path/to/file.docspec.md
```

Or validate all `*.docspec.md` files in the current directory tree:

```bash
docspec validate
```

#### Generate a new docspec file

```bash
docspec generate path/to/new-file.docspec.md
```

Optionally specify a document name:

```bash
docspec generate path/to/new-file.docspec.md --name "My Document"
```

### Library Usage

```typescript
import { validateDocspec, generateDocspec } from "docspec";

// Validate a file
const result = await validateDocspec("path/to/file.docspec.md");
if (!result.valid) {
  console.error("Validation errors:", result.errors);
}

// Generate a new docspec file
await generateDocspec("path/to/new-file.docspec.md", "Document Name");
```

## Pre-commit Integration

To use docspec with [pre-commit](https://pre-commit.com/), add the following to your `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: docspec-validate
        name: Validate docspec files
        entry: docspec validate
        language: system
        files: \.docspec\.md$
        pass_filenames: true
```

Then install the pre-commit hooks:

```bash
pre-commit install
```

The hook will automatically validate any modified `*.docspec.md` files on commit.

## Docspec Format

A docspec file must contain the following 5 sections:

1. **Purpose of This Document** - Explain what this Markdown file is supposed to achieve
2. **When This Document Should Be Updated** - Describe triggers based on code changes
3. **Structure & Required Sections** - Describe expected sections and what belongs in them
4. **Style & Editing Guidelines** - Rules specific to this doc or directory
5. **Known Gaps or Intentional Omissions** - Things that should not be documented yet

Each section must be customized and cannot contain only the boilerplate template text.

## Development

### Running Tests

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Building

```bash
npm run build
```

## License

MIT

