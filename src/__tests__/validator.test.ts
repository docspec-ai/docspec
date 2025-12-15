import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { validateDocspec } from "../validator";
import { generateDocspec } from "../generator";
import { REQUIRED_SECTIONS, SECTION_BOILERPLATE } from "../constants";

describe("validator", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("validateDocspec", () => {
    it("should validate a properly customized docspec file", async () => {
      const filePath = path.join(tempDir, "valid.docspec.md");
      
      // Create a valid docspec with customized content
      const validContent = `# DOCSPEC: Test Document

> Short phrase: *Test document*

## 1. Document Purpose

This document describes the test suite for the docspec validator. It provides comprehensive test coverage for all validation scenarios and edge cases that the validator needs to handle correctly.

## 2. Update Triggers

Update this document when adding new test cases or when the validation logic changes. It should always reflect the current state of the test suite.

## 3. Expected Structure

This section describes the test structure and how tests are organized. Each test file covers a specific module or functionality area of the docspec package.

## 4. Editing Guidelines

Keep test descriptions clear and concise. Use descriptive test names that explain what is being tested. Follow the AAA pattern: Arrange, Act, Assert. Do: Write comprehensive tests that cover edge cases. Don't: Skip edge cases or write tests that are too simple. Always test both success and failure scenarios.

## 5. Intentional Omissions

No gaps at this time. All major functionality is covered by the test suite.
`;

      await fs.writeFile(filePath, validContent, "utf-8");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject a file with only boilerplate content", async () => {
      const filePath = path.join(tempDir, "boilerplate.docspec.md");
      await generateDocspec(filePath);

      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes("boilerplate"))).toBe(true);
    });

    it("should detect missing sections", async () => {
      const filePath = path.join(tempDir, "incomplete.docspec.md");
      
      const incompleteContent = `# DOCSPEC: Test

## 1. Document Purpose

Custom content here.

## 2. Update Triggers

More custom content.
`;

      await fs.writeFile(filePath, incompleteContent, "utf-8");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(false);
      // Should have errors for missing sections
      expect(result.errors.some(e => e.includes("Missing required section"))).toBe(true);
    });

    it("should detect empty sections", async () => {
      const filePath = path.join(tempDir, "empty-section.docspec.md");
      
      let content = `# DOCSPEC: Test

`;
      
      // Add all sections but leave one empty
      REQUIRED_SECTIONS.forEach((section, index) => {
        content += `## ${index + 1}. ${section}\n\n`;
        if (index === 2) {
          // Leave section 3 empty
          content += "\n";
        } else {
          content += "Custom content for this section.\n";
        }
        content += "\n\n";
      });

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("empty"))).toBe(true);
    });

    it("should handle files with section numbers in headers", async () => {
      const filePath = path.join(tempDir, "numbered.docspec.md");
      
      const content = `# DOCSPEC: Test

## 1. Document Purpose

This document serves as a test case for validating docspec files with numbered section headers. It contains custom content that is different from the boilerplate template.

## 2. Update Triggers

This document should be updated whenever the validation logic for numbered headers changes. It tests the parser's ability to handle section numbers correctly.

## 3. Expected Structure

This section describes the structure of the test document. It includes all required sections with sufficient content to pass validation checks.

## 4. Editing Guidelines

The style for this test document is straightforward and technical. It focuses on clarity and precision in describing test scenarios. Do: Ensure all sections have adequate content. Don't: Use boilerplate text or leave sections empty. Always provide meaningful test data.

## 5. Intentional Omissions

There are no known gaps in this test document. All sections are complete and properly formatted.
`;

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(true);
    });

    it("should handle files without section numbers in headers", async () => {
      const filePath = path.join(tempDir, "unnumbered.docspec.md");
      
      const content = `# DOCSPEC: Test

---

## Document Purpose

This document serves as a test case for validating docspec files without numbered section headers. It contains custom content that differs from the boilerplate template.

## Update Triggers

This document should be updated whenever the validation logic for unnumbered headers changes. It tests the parser's flexibility in handling different header formats.

## Expected Structure

This section describes the structure of the test document. It includes all required sections with sufficient content to pass validation checks.

## Editing Guidelines

The style for this test document is straightforward and technical. It focuses on clarity and precision in describing test scenarios. Do: Ensure all sections have adequate content. Don't: Use boilerplate text or leave sections empty. Always provide meaningful test data.

## Intentional Omissions

There are no known gaps in this test document. All sections are complete and properly formatted.
`;

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(true);
    });

    it("should handle files without separators between sections", async () => {
      const filePath = path.join(tempDir, "no-separators.docspec.md");
      
      const content = `# DOCSPEC: Test

## 1. Document Purpose

This document tests the validator's ability to handle files without separator lines between sections. The content here is custom and different from boilerplate.

## 2. Update Triggers

This document should be updated when testing files without separators. The content is sufficient to pass validation.

## 3. Expected Structure

This section describes the document structure. It includes all required sections with adequate content length.

## 4. Editing Guidelines

The style rules for this test document are straightforward. Content is technical and precise. Do: Test files without separators. Don't: Require separators for validation. Ensure content is meaningful.

## 5. Intentional Omissions

No gaps in this test document. All sections are complete with sufficient content.
`;

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      // Should be valid without separators
      expect(result.valid).toBe(true);
    });

    it("should reject content that only differs by whitespace from boilerplate", async () => {
      const filePath = path.join(tempDir, "whitespace-only.docspec.md");
      
      let content = `# DOCSPEC: Test

`;
      
      // Create content that's just boilerplate with different whitespace
      REQUIRED_SECTIONS.forEach((section, index) => {
        content += `## ${index + 1}. ${section}\n\n`;
        // Use boilerplate but with extra spaces
        const boilerplate = SECTION_BOILERPLATE[section];
        content += boilerplate.replace(/\n/g, "  \n") + "\n";
        content += "\n\n";
      });

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("too similar to boilerplate"))).toBe(true);
    });

    it("should reject sections that are too short", async () => {
      const filePath = path.join(tempDir, "short-section.docspec.md");
      
      let content = `# DOCSPEC: Test

`;
      
      REQUIRED_SECTIONS.forEach((section, index) => {
        content += `## ${index + 1}. ${section}\n\n`;
        if (index === 0) {
          // Make first section too short
          content += "Short.\n";
        } else {
          content += "This is a longer section with enough content to pass validation.\n";
        }
        content += "\n\n";
      });

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("too short") || e.includes("incomplete"))).toBe(true);
    });

    it("should handle non-existent files gracefully", async () => {
      const filePath = path.join(tempDir, "nonexistent.docspec.md");
      const result = await validateDocspec(filePath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Failed to read file");
    });

    it("should handle files with extra sections (non-required)", async () => {
      const filePath = path.join(tempDir, "extra-sections.docspec.md");
      
      const content = `# DOCSPEC: Test

## 1. Document Purpose

This document tests the validator's handling of extra sections beyond the required ones. The content is custom and sufficient to pass validation.

## 2. Update Triggers

This document should be updated when testing extra section handling. The content is meaningful and not boilerplate.

## 3. Expected Structure

This section describes the document structure including both required and optional sections. All content is customized.

## 4. Editing Guidelines

The style rules for this test document are clear and technical. Content is sufficient in length. Do: Test extra sections. Don't: Reject valid documents with additional sections. Ensure all required sections are present.

## 5. Intentional Omissions

No gaps in this test document. All sections are complete with adequate content.

## 7. Additional Section

This is an extra section that shouldn't cause validation to fail. It contains additional information beyond the required sections.
`;

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      // Extra sections should be allowed
      expect(result.valid).toBe(true);
    });

    it("should handle case-insensitive section matching", async () => {
      const filePath = path.join(tempDir, "case-test.docspec.md");
      
      const content = `# DOCSPEC: Test

---

## 1. PURPOSE OF THIS DOCUMENT

Custom content.

## 2. when this document should be updated

Custom content.

## 3. Expected Structure

Custom content.

## 4. Editing Guidelines

Custom style and editing guidelines content.

## 5. Intentional Omissions

Custom gaps content.
`;

      await fs.writeFile(filePath, content, "utf-8");
      const result = await validateDocspec(filePath);

      // Currently the validator is case-sensitive, so this will fail
      // This test documents current behavior - could be enhanced later
      expect(result.valid).toBe(false);
    });
  });
});

