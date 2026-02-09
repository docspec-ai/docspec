import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { getFormatFilePath, getTemplateContent } from "../template";

describe("template", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-template-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("getFormatFilePath", () => {
    it("returns path to .docspec/docspec-template.md when it exists", async () => {
      await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
      await fs.writeFile(path.join(tempDir, ".docspec", "docspec-template.md"), "# Template", "utf-8");

      const formatPath = getFormatFilePath();

      expect(path.resolve(formatPath)).toBe(path.resolve(process.cwd(), ".docspec", "docspec-template.md"));
    });

    it("seeds .docspec/docspec-template.md from default when missing", () => {
      const formatPath = getFormatFilePath();

      expect(path.resolve(formatPath)).toBe(path.resolve(process.cwd(), ".docspec", "docspec-template.md"));
      const content = require("fs").readFileSync(path.join(process.cwd(), ".docspec", "docspec-template.md"), "utf-8");
      expect(content).toContain("Document Purpose");
      expect(content).toContain("{{TARGET_FILE}}");
    });
  });

  describe("getTemplateContent", () => {
    it("returns template content with placeholder and default sections", () => {
      const content = getTemplateContent();
      expect(content).toContain("{{TARGET_FILE}}");
      expect(content).toContain("Document Purpose");
      expect(content).toContain("Update Triggers");
      expect(content).toContain("Expected Structure");
      expect(content).toContain("Editing Guidelines");
      expect(content).toContain("Intentional Omissions");
    });
  });
});
