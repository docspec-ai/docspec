import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { generateDocspec } from "../create";

const execAsync = promisify(exec);

describe("CLI", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-cli-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const runCli = async (args: string): Promise<{ stdout: string; stderr: string; code: number }> => {
    const cliPath = path.join(__dirname, "../../dist/cli.js");
    try {
      const { stdout, stderr } = await execAsync(`node ${cliPath} ${args}`);
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

    it("should generate a new docspec file under .docspec/ for markdown path", async () => {
      const result = await runCli("new.md");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("✅");
      expect(result.stdout).toContain(".docspec/new.docspec.md");

      const filePath = path.join(tempDir, ".docspec", "new.docspec.md");
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
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
  });

  describe("generate subcommand (file + prompt)", () => {
    it("should generate docspec and write prompt file", async () => {
      await fs.writeFile(path.join(tempDir, "README.md"), "# Hello", "utf-8");
      const result = await runCli("generate README.md --output-prompt prompt.txt");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain(".docspec/README.docspec.md");
      expect(result.stdout).toContain("prompt");
      const promptPath = path.join(tempDir, "prompt.txt");
      const exists = await fs.access(promptPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe("help and version", () => {
    it("should show help message", async () => {
      const result = await runCli("--help");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("changed");
      expect(result.stdout).toContain("generate");
      expect(result.stdout).toContain("markdown_path");
    });

    it("should show version", async () => {
      const result = await runCli("--version");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("0.1.0");
    });
  });
});

