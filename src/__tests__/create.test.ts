import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { ensureDocAndDocspec, generateDocspecContent } from "../create";
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

  describe("ensureDocAndDocspec", () => {
    it("should create both markdown and docspec for markdown path", async () => {
      const result = await ensureDocAndDocspec("test.md", tempDir);
      expect(result.markdownCreated).toBe(true);
      expect(result.docspecCreated).toBe(true);
      const mdPath = path.join(tempDir, "test.md");
      const docspecPath = path.join(tempDir, markdownToDocspecPath("test.md"));
      const mdExists = await fs.access(mdPath).then(() => true).catch(() => false);
      const docspecExists = await fs.access(docspecPath).then(() => true).catch(() => false);
      expect(mdExists).toBe(true);
      expect(docspecExists).toBe(true);
      expect(await fs.readFile(mdPath, "utf-8")).toBe("");
    });

    it("should generate link to target markdown file in docspec", async () => {
      await ensureDocAndDocspec("test.md", tempDir);
      const filePath = path.join(tempDir, markdownToDocspecPath("test.md"));
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [test.md](/test.md)");
    });

    it("should handle kebab-case markdown filenames", async () => {
      await ensureDocAndDocspec("api-reference.md", tempDir);
      const filePath = path.join(tempDir, ".docspec", "api-reference.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [api-reference.md](/api-reference.md)");
    });

    it("should handle snake_case markdown filenames", async () => {
      await ensureDocAndDocspec("user_guide.md", tempDir);
      const filePath = path.join(tempDir, ".docspec", "user_guide.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [user_guide.md](/user_guide.md)");
    });

    it("should create nested directories under .docspec/", async () => {
      await ensureDocAndDocspec("nested/deep/test.md", tempDir);
      const filePath = path.join(tempDir, ".docspec", "nested", "deep", "test.docspec.md");
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate valid markdown content in docspec", async () => {
      await ensureDocAndDocspec("test.md", tempDir);
      const filePath = path.join(tempDir, ".docspec", "test.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC:");
      expect(content).toContain("## 1.");
      expect(content).toContain("## 5.");
      expect(content).toContain("[test.md](/test.md)");
    });

    it("should include all required sections in generated docspec", async () => {
      await ensureDocAndDocspec("test.md", tempDir);
      const filePath = path.join(tempDir, ".docspec", "test.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      REQUIRED_SECTIONS.forEach((section) => {
        expect(content).toContain(section);
      });
    });

    it("should skip existing files without overwrite", async () => {
      await fs.writeFile(path.join(tempDir, "existing.md"), "# Existing", "utf-8");
      await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
      await fs.writeFile(path.join(tempDir, ".docspec", "existing.docspec.md"), "# DOCSPEC", "utf-8");
      const result = await ensureDocAndDocspec("existing.md", tempDir, { overwrite: false });
      expect(result.markdownCreated).toBe(false);
      expect(result.docspecCreated).toBe(false);
      expect(await fs.readFile(path.join(tempDir, "existing.md"), "utf-8")).toBe("# Existing");
      expect(await fs.readFile(path.join(tempDir, ".docspec", "existing.docspec.md"), "utf-8")).toBe("# DOCSPEC");
    });
  });
});
