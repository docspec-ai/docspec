import { getDocspecTemplate } from "../constants";

const DEFAULT_TEMPLATE_SECTIONS = [
  "Document Purpose",
  "Update Triggers",
  "Expected Structure",
  "Editing Guidelines",
  "Intentional Omissions",
];

describe("constants", () => {
  describe("getDocspecTemplate", () => {
    it("should generate a template with link to target file", () => {
      const template = getDocspecTemplate("README.md");
      expect(template).toContain("# DOCSPEC: [README.md](/README.md)");
    });

    it("should include all 5 default template sections", () => {
      const template = getDocspecTemplate("Test");
      DEFAULT_TEMPLATE_SECTIONS.forEach((section) => {
        expect(template).toContain(section);
      });
    });

    it("should include section numbers", () => {
      const template = getDocspecTemplate("Test");
      for (let i = 1; i <= 5; i++) {
        expect(template).toContain(`## ${i}.`);
      }
    });

    it("should not inject extra blank lines between intro and first section (no triple newlines)", () => {
      const template = getDocspecTemplate("storefront/README.md");
      expect(template).not.toMatch(/\n{3,}/);
      expect(template).toContain("by agents.\n\n## 1. Document Purpose");
    });
  });
});
