# docspec

Docspec is a specification format and toolchain for maintainable, structured documentation. It defines standards for documenting documentation itself, including what content is required, when it must be updated, and how it should be organized. This enables automated validation and long-term consistency.

## The Docspec Format

Each `*.docspec.md` file is a specification for another document. The format is defined in [`docspec-format.md`](docspec-format.md), which serves as both the format definition and a reference example.

The format includes 5 required sections:
1. **Document Purpose** - What this document exists to explain or enable
2. **Update Triggers** - What kinds of changes should cause this document to be updated
3. **Expected Structure** - The sections this document should contain
4. **Editing Guidelines** - How edits to this document should be made
5. **Intentional Omissions** - What this document deliberately does not cover

Each section must be customized—the validator ensures sections contain meaningful content beyond the boilerplate template.

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
docspec generate path/to/README.docspec.md
```

This will generate a docspec file that references the target markdown file (e.g., `README.docspec.md` references `README.md`).

### Library Usage

```typescript
import { validateDocspec, generateDocspec } from "docspec";

// Validate a file
const result = await validateDocspec("path/to/file.docspec.md");
if (!result.valid) {
  console.error("Validation errors:", result.errors);
}

// Generate a new docspec file
await generateDocspec("path/to/README.docspec.md");
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

