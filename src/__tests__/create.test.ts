import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { generateDocspec, generateDocspecContent } from "../create";
import { REQUIRED_SECTIONS } from "../constants";
import { markdownToDocspecPath } from "../path-utils";

describe("create", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("generateDocspecContent", () => {
    it("should generate content with link to target file", () => {
      const content = generateDocspecContent("README.md");
      expect(content).toContain("# DOCSPEC: [README.md](/README.md)");
    });

    it("should include all required sections", () => {
      const content = generateDocspecContent("test.md");
      REQUIRED_SECTIONS.forEach((section) => {
        expect(content).toContain(section);
      });
    });
  });

  describe("generateDocspec", () => {
    it("should generate a file under .docspec/ for markdown path", async () => {
      await generateDocspec("test.md");
      const filePath = path.join(tempDir, ".docspec", "test.docspec.md");
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate link to target markdown file", async () => {
      await generateDocspec("test.md");
      const filePath = path.join(tempDir, markdownToDocspecPath("test.md"));
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [test.md](/test.md)");
    });

    it("should accept docspec path under .docspec/", async () => {
      await generateDocspec(".docspec/my-awesome-doc.docspec.md");
      const filePath = path.join(tempDir, ".docspec", "my-awesome-doc.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [my-awesome-doc.md](/my-awesome-doc.md)");
    });

    it("should handle kebab-case markdown filenames", async () => {
      await generateDocspec("api-reference.md");
      const filePath = path.join(tempDir, ".docspec", "api-reference.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [api-reference.md](/api-reference.md)");
    });

    it("should handle snake_case markdown filenames", async () => {
      await generateDocspec("user_guide.md");
      const filePath = path.join(tempDir, ".docspec", "user_guide.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [user_guide.md](/user_guide.md)");
    });

    it("should create nested directories under .docspec/", async () => {
      await generateDocspec("nested/deep/test.md");
      const filePath = path.join(tempDir, ".docspec", "nested", "deep", "test.docspec.md");
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate valid markdown content", async () => {
      await generateDocspec("test.md");
      const filePath = path.join(tempDir, ".docspec", "test.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC:");
      expect(content).toContain("## 1.");
      expect(content).toContain("## 5.");
      expect(content).toContain("[test.md](/test.md)");
    });

    it("should include all required sections in generated file", async () => {
      await generateDocspec("test.md");
      const filePath = path.join(tempDir, ".docspec", "test.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      REQUIRED_SECTIONS.forEach((section) => {
        expect(content).toContain(section);
      });
    });
  });
});
