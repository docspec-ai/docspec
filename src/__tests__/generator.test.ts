import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { generateDocspec, generateDocspecContent } from "../generator";
import { REQUIRED_SECTIONS } from "../constants";

describe("generator", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-test-"));
  });

  afterEach(async () => {
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
    it("should generate a file at the specified path", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath);

      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate link to target markdown file", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [test.md](/test.md)");
    });

    it("should extract target filename from docspec path", async () => {
      const filePath = path.join(tempDir, "my-awesome-doc.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [my-awesome-doc.md](/my-awesome-doc.md)");
    });

    it("should handle kebab-case filenames", async () => {
      const filePath = path.join(tempDir, "api-reference.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [api-reference.md](/api-reference.md)");
    });

    it("should handle snake_case filenames", async () => {
      const filePath = path.join(tempDir, "user_guide.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [user_guide.md](/user_guide.md)");
    });

    it("should create parent directories if they don't exist", async () => {
      const filePath = path.join(tempDir, "nested", "deep", "test.docspec.md");
      await generateDocspec(filePath);

      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate valid markdown content", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      
      // Check structure
      expect(content).toContain("---");
      expect(content).toContain("# DOCSPEC:");
      expect(content).toContain("## 1.");
      expect(content).toContain("## 5.");
      expect(content).toContain("[test.md](/test.md)");
    });

    it("should include all required sections in generated file", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      REQUIRED_SECTIONS.forEach((section) => {
        expect(content).toContain(section);
      });
    });
  });
});

