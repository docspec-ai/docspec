import { REQUIRED_SECTIONS, SECTION_BOILERPLATE, getDocspecTemplate } from "../constants";

describe("constants", () => {
  describe("REQUIRED_SECTIONS", () => {
    it("should have exactly 5 required sections", () => {
      expect(REQUIRED_SECTIONS).toHaveLength(5);
    });

    it("should contain all expected section names", () => {
      const expectedSections = [
        "Purpose of This Document",
        "When This Document Should Be Updated",
        "Structure & Required Sections",
        "Style & Editing Guidelines",
        "Known Gaps or Intentional Omissions",
      ];

      expectedSections.forEach((section) => {
        expect(REQUIRED_SECTIONS).toContain(section);
      });
    });
  });

  describe("SECTION_BOILERPLATE", () => {
    it("should have boilerplate for all required sections", () => {
      REQUIRED_SECTIONS.forEach((section) => {
        expect(SECTION_BOILERPLATE[section]).toBeDefined();
        expect(SECTION_BOILERPLATE[section].length).toBeGreaterThan(0);
      });
    });
  });

  describe("getDocspecTemplate", () => {
    it("should generate a template with the document name", () => {
      const template = getDocspecTemplate("Test Document");
      expect(template).toContain("# DOCSPEC: Test Document");
    });

    it("should include all 5 required sections", () => {
      const template = getDocspecTemplate("Test");
      REQUIRED_SECTIONS.forEach((section) => {
        expect(template).toContain(section);
      });
    });

    it("should include section numbers", () => {
      const template = getDocspecTemplate("Test");
      for (let i = 1; i <= 5; i++) {
        expect(template).toContain(`## ${i}.`);
      }
    });

    it("should include boilerplate content for each section", () => {
      const template = getDocspecTemplate("Test");
      REQUIRED_SECTIONS.forEach((section) => {
        const boilerplate = SECTION_BOILERPLATE[section];
        // Check that at least part of the boilerplate is present
        expect(template).toContain(boilerplate.split("\n")[0]);
      });
    });

    it("should include separators between sections", () => {
      const template = getDocspecTemplate("Test");
      // Should have separators for 5 sections
      const separatorCount = (template.match(/^---$/gm) || []).length;
      expect(separatorCount).toBeGreaterThanOrEqual(2); // At least front matter and between sections
    });

    it("should have proper front matter format", () => {
      const template = getDocspecTemplate("Test");
      expect(template).toMatch(/^---\n/);
    });
  });
});

