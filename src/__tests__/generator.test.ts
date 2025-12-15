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
    it("should generate content with the provided name", () => {
      const content = generateDocspecContent("My Test Document");
      expect(content).toContain("# DOCSPEC: My Test Document");
    });

    it("should include all required sections", () => {
      const content = generateDocspecContent("Test");
      REQUIRED_SECTIONS.forEach((section) => {
        expect(content).toContain(section);
      });
    });
  });

  describe("generateDocspec", () => {
    it("should generate a file at the specified path", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath, "Test Document");

      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should use provided document name", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath, "Custom Name");

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: Custom Name");
    });

    it("should extract name from file path if not provided", async () => {
      const filePath = path.join(tempDir, "my-awesome-doc.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: My Awesome Doc");
    });

    it("should handle kebab-case filenames", async () => {
      const filePath = path.join(tempDir, "api-reference.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: Api Reference");
    });

    it("should handle snake_case filenames", async () => {
      const filePath = path.join(tempDir, "user_guide.docspec.md");
      await generateDocspec(filePath);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: User Guide");
    });

    it("should create parent directories if they don't exist", async () => {
      const filePath = path.join(tempDir, "nested", "deep", "test.docspec.md");
      await generateDocspec(filePath, "Test");

      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate valid markdown content", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath, "Test");

      const content = await fs.readFile(filePath, "utf-8");
      
      // Check structure
      expect(content).toContain("---");
      expect(content).toContain("# DOCSPEC:");
      expect(content).toContain("## 1.");
      expect(content).toContain("## 5.");
    });

    it("should include all required sections in generated file", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await generateDocspec(filePath, "Test");

      const content = await fs.readFile(filePath, "utf-8");
      REQUIRED_SECTIONS.forEach((section) => {
        expect(content).toContain(section);
      });
    });
  });
});

