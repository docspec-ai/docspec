import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

describe("CLI", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-cli-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  beforeAll(async () => {
    const cliPath = path.resolve(process.cwd(), "dist", "cli.js");
    try {
      await fs.access(cliPath);
    } catch {
      throw new Error(
        "CLI tests require dist/cli.js. Run 'npm run build' before 'npm test'."
      );
    }
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const runCli = async (args: string): Promise<{ stdout: string; stderr: string; code: number }> => {
    const cliPath = path.resolve(originalCwd, "dist", "cli.js");
    try {
      const { stdout, stderr } = await execAsync(`node "${cliPath}" ${args}`, {
        cwd: tempDir,
      });
      return { stdout: stdout || "", stderr: stderr || "", code: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || "",
        stderr: error.stderr || "",
        code: error.code || 1,
      };
    }
  };

  describe("default command (docspec <markdown_path>)", () => {
    it("should seed .docspec/docspec.md from default when missing", async () => {
      const result = await runCli("seed-test.md");
      expect(result.code).toBe(0);
      const templatePath = path.join(tempDir, ".docspec", "docspec.md");
      const templateExists = await fs.access(templatePath).then(() => true).catch(() => false);
      expect(templateExists).toBe(true);
      const content = await fs.readFile(templatePath, "utf-8");
      expect(content).toContain("Document Purpose");
      expect(content).toContain("{{TARGET_FILE}}");
    });

    it("should create both empty markdown and docspec for markdown path", async () => {
      const result = await runCli("new.md");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("✅");
      expect(result.stdout).toContain(".docspec/new.docspec.md");

      const mdPath = path.join(tempDir, "new.md");
      const docspecPath = path.join(tempDir, ".docspec", "new.docspec.md");
      const mdExists = await fs.access(mdPath).then(() => true).catch(() => false);
      const docspecExists = await fs.access(docspecPath).then(() => true).catch(() => false);
      expect(mdExists).toBe(true);
      expect(docspecExists).toBe(true);
      const mdContent = await fs.readFile(mdPath, "utf-8");
      expect(mdContent).toBe("");
    });

    it("should generate file with correct content", async () => {
      await runCli("test.md");

      const filePath = path.join(tempDir, ".docspec", "test.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [test.md](/test.md)");
      expect(content).toContain("Document Purpose");
    });

    it("should create nested directories under .docspec/", async () => {
      const result = await runCli("nested/deep/test.md");

      expect(result.code).toBe(0);
      const filePath = path.join(tempDir, ".docspec", "nested", "deep", "test.docspec.md");
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate link to target markdown file", async () => {
      await runCli("my-awesome-doc.md");

      const filePath = path.join(tempDir, ".docspec", "my-awesome-doc.docspec.md");
      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [my-awesome-doc.md](/my-awesome-doc.md)");
    });

    it("should do nothing when both files exist (no --overwrite)", async () => {
      await fs.writeFile(path.join(tempDir, "existing.md"), "# Existing", "utf-8");
      await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
      await fs.writeFile(path.join(tempDir, ".docspec", "existing.docspec.md"), "# DOCSPEC", "utf-8");

      const result = await runCli("existing.md");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("already exist");
      const mdContent = await fs.readFile(path.join(tempDir, "existing.md"), "utf-8");
      expect(mdContent).toBe("# Existing");
      const docspecContent = await fs.readFile(path.join(tempDir, ".docspec", "existing.docspec.md"), "utf-8");
      expect(docspecContent).toBe("# DOCSPEC");
    });

    it("should overwrite both when --overwrite", async () => {
      await fs.writeFile(path.join(tempDir, "overwrite.md"), "# Old", "utf-8");
      await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
      await fs.writeFile(path.join(tempDir, ".docspec", "overwrite.docspec.md"), "# Old docspec", "utf-8");

      const result = await runCli("overwrite.md --overwrite");

      expect(result.code).toBe(0);
      const mdContent = await fs.readFile(path.join(tempDir, "overwrite.md"), "utf-8");
      expect(mdContent).toBe("");
      const docspecContent = await fs.readFile(path.join(tempDir, ".docspec", "overwrite.docspec.md"), "utf-8");
      expect(docspecContent).toContain("# DOCSPEC:");
      expect(docspecContent).toContain("Document Purpose");
    });
  });

  describe("help and version", () => {
    it("should show help message", async () => {
      const result = await runCli("--help");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("review");
      expect(result.stdout).toContain("markdown_path");
      expect(result.stdout).toContain("overwrite");
    });

    it("should show version", async () => {
      const result = await runCli("--version");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("0.4.0");
    });
  });
});

