import {
  markdownToDocspecPath,
  docspecToMarkdownPath,
  isDocspecPath,
} from "../path-utils";

describe("path-utils", () => {
  describe("markdownToDocspecPath", () => {
    it("converts README.md to .docspec/README.docspec.md", () => {
      expect(markdownToDocspecPath("README.md")).toBe(".docspec/README.docspec.md");
    });

    it("converts path without .md suffix by appending .docspec.md", () => {
      expect(markdownToDocspecPath("README")).toBe(".docspec/README.docspec.md");
    });

    it("converts nested path docs/deploy.md", () => {
      expect(markdownToDocspecPath("docs/deploy.md")).toBe(".docspec/docs/deploy.docspec.md");
    });

    it("normalizes backslashes to forward slashes", () => {
      expect(markdownToDocspecPath("docs\\deploy.md")).toBe(".docspec/docs/deploy.docspec.md");
    });

    it("maps absolute paths to .docspec/<basename>.docspec.md to avoid .docspec/var/...", () => {
      const absolute = "/var/folders/6n/xyz/T/docspec-test-abc/boilerplate.docspec.md";
      expect(markdownToDocspecPath(absolute)).toBe(".docspec/boilerplate.docspec.docspec.md");
    });
  });

  describe("docspecToMarkdownPath", () => {
    it("converts .docspec/README.docspec.md to README.md", () => {
      expect(docspecToMarkdownPath(".docspec/README.docspec.md")).toBe("README.md");
    });

    it("converts nested docspec path to markdown path", () => {
      expect(docspecToMarkdownPath(".docspec/docs/deploy.docspec.md")).toBe("docs/deploy.md");
    });

    it("returns path as-is when not under .docspec/ or not .docspec.md", () => {
      expect(docspecToMarkdownPath("README.md")).toBe("README.md");
      expect(docspecToMarkdownPath(".docspec/other.md")).toBe(".docspec/other.md");
    });
  });

  describe("isDocspecPath", () => {
    it("returns true for paths under .docspec/ ending in .docspec.md", () => {
      expect(isDocspecPath(".docspec/README.docspec.md")).toBe(true);
      expect(isDocspecPath(".docspec/docs/deploy.docspec.md")).toBe(true);
    });

    it("returns false for paths not under .docspec/", () => {
      expect(isDocspecPath("README.md")).toBe(false);
      expect(isDocspecPath("docs/README.docspec.md")).toBe(false);
    });

    it("returns false for .docspec paths not ending in .docspec.md", () => {
      expect(isDocspecPath(".docspec/README.md")).toBe(false);
    });
  });
});
