import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { generateDocspec } from "../generator";

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

  describe("validate command", () => {
    it("should validate a valid docspec file", async () => {
      const filePath = path.join(tempDir, "valid.docspec.md");
      
      const validContent = `# DOCSPEC: Test

## 1. Document Purpose

This document serves as a test case for the CLI validation command. It contains custom content that is different from the boilerplate template and sufficient to pass validation.

## 2. Update Triggers

This document should be updated when testing CLI validation functionality. The content is meaningful and customized for testing purposes.

## 3. Expected Structure

This section describes the structure of the test document. It includes all required sections with adequate content to pass validation checks.

## 4. Editing Guidelines

The style for this test document is straightforward and technical. It focuses on clarity and precision in describing test scenarios. Do: Ensure all sections have adequate content. Don't: Use boilerplate text or leave sections empty. Always provide meaningful test data.

## 5. Intentional Omissions

There are no known gaps in this test document. All sections are complete and properly formatted with sufficient content.
`;

      await fs.writeFile(filePath, validContent, "utf-8");
      const result = await runCli(`validate ${filePath}`);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("✅");
    });

    it("should reject an invalid docspec file", async () => {
      const filePath = path.join(tempDir, "invalid.docspec.md");
      await generateDocspec(filePath); // This creates boilerplate-only content

      const result = await runCli(`validate ${filePath}`);

      expect(result.code).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain("❌");
      expect(output).toContain("boilerplate");
    });

    it("should validate multiple files", async () => {
      const file1 = path.join(tempDir, "file1.docspec.md");
      const file2 = path.join(tempDir, "file2.docspec.md");
      
      const validContent = `# DOCSPEC: Test

## 1. Document Purpose

This document serves as a test case for validating multiple docspec files. It contains custom content that is different from the boilerplate template.

## 2. Update Triggers

This document should be updated when testing multiple file validation. The content is meaningful and customized for testing purposes.

## 3. Expected Structure

This section describes the structure of the test document. It includes all required sections with adequate content to pass validation checks.

## 4. Editing Guidelines

The style for this test document is straightforward and technical. It focuses on clarity and precision in describing test scenarios. Do: Ensure all sections have adequate content. Don't: Use boilerplate text or leave sections empty. Always provide meaningful test data.

## 5. Intentional Omissions

There are no known gaps in this test document. All sections are complete and properly formatted with sufficient content.
`;

      await fs.writeFile(file1, validContent, "utf-8");
      await fs.writeFile(file2, validContent, "utf-8");

      const result = await runCli(`validate ${file1} ${file2}`);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("file1.docspec.md");
      expect(result.stdout).toContain("file2.docspec.md");
    });

    it("should find all docspec files when no paths provided", async () => {
      const file1 = path.join(tempDir, "file1.docspec.md");
      const file2 = path.join(tempDir, "nested", "file2.docspec.md");
      
      await fs.mkdir(path.join(tempDir, "nested"), { recursive: true });
      
      const validContent = `# DOCSPEC: Test

## 1. Document Purpose

This document serves as a test case for validating multiple docspec files. It contains custom content that is different from the boilerplate template.

## 2. Update Triggers

This document should be updated when testing multiple file validation. The content is meaningful and customized for testing purposes.

## 3. Expected Structure

This section describes the structure of the test document. It includes all required sections with adequate content to pass validation checks.

## 4. Editing Guidelines

The style for this test document is straightforward and technical. It focuses on clarity and precision in describing test scenarios. Do: Ensure all sections have adequate content. Don't: Use boilerplate text or leave sections empty. Always provide meaningful test data.

## 5. Intentional Omissions

There are no known gaps in this test document. All sections are complete and properly formatted with sufficient content.
`;

      await fs.writeFile(file1, validContent, "utf-8");
      await fs.writeFile(file2, validContent, "utf-8");

      const result = await runCli("validate");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("file1.docspec.md");
      expect(result.stdout).toContain("file2.docspec.md");
    });

    it("should handle non-existent files gracefully", async () => {
      const result = await runCli("validate nonexistent.docspec.md");

      expect(result.code).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain("Failed to read file");
    });

    it("should skip node_modules and .git directories", async () => {
      await fs.mkdir(path.join(tempDir, "node_modules"), { recursive: true });
      await fs.mkdir(path.join(tempDir, ".git"), { recursive: true });
      
      const fileInNodeModules = path.join(tempDir, "node_modules", "test.docspec.md");
      const fileInGit = path.join(tempDir, ".git", "test.docspec.md");
      
      await fs.writeFile(fileInNodeModules, "test", "utf-8");
      await fs.writeFile(fileInGit, "test", "utf-8");

      const result = await runCli("validate");

      // Should not find files in node_modules or .git
      expect(result.stdout).not.toContain("node_modules");
      expect(result.stdout).not.toContain(".git");
    });
  });

  describe("generate command", () => {
    it("should generate a new docspec file", async () => {
      const filePath = path.join(tempDir, "new.docspec.md");
      const result = await runCli(`generate ${filePath}`);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("✅");
      expect(result.stdout).toContain("new.docspec.md");

      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate file with correct content", async () => {
      const filePath = path.join(tempDir, "test.docspec.md");
      await runCli(`generate ${filePath}`);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [test.md](/test.md)");
      expect(content).toContain("Document Purpose");
    });

    it("should auto-append .docspec.md if not present", async () => {
      const filePath = path.join(tempDir, "test");
      await runCli(`generate ${filePath}`);

      const fullPath = filePath + ".docspec.md";
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should create nested directories", async () => {
      const filePath = path.join(tempDir, "nested", "deep", "test.docspec.md");
      const result = await runCli(`generate ${filePath}`);

      expect(result.code).toBe(0);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should generate link to target markdown file", async () => {
      const filePath = path.join(tempDir, "my-awesome-doc.docspec.md");
      await runCli(`generate ${filePath}`);

      const content = await fs.readFile(filePath, "utf-8");
      expect(content).toContain("# DOCSPEC: [my-awesome-doc.md](/my-awesome-doc.md)");
    });
  });

  describe("help and version", () => {
    it("should show help message", async () => {
      const result = await runCli("--help");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("validate");
      expect(result.stdout).toContain("generate");
    });

    it("should show version", async () => {
      const result = await runCli("--version");

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("0.1.0");
    });
  });
});

