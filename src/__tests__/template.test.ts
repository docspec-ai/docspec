import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { getFormatFilePath, parseFormatFile } from "../template";

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

  describe("parseFormatFile", () => {
    it("parses template content into sections and template string", async () => {
      const templatePath = path.join(tempDir, "format.md");
      await fs.writeFile(
        templatePath,
        `# DOCSPEC: [{{TARGET_FILE}}](/{{TARGET_FILE}})

## 1. Document Purpose
Describe the document.

## 2. Update Triggers
When to update.
`,
        "utf-8"
      );

      const parsed = parseFormatFile(templatePath);

      expect(parsed.sections).toHaveLength(2);
      expect(parsed.sections[0].name).toBe("Document Purpose");
      expect(parsed.sections[0].number).toBe(1);
      expect(parsed.sections[0].boilerplate).toContain("Describe the document.");
      expect(parsed.sections[1].name).toBe("Update Triggers");
      expect(parsed.template).toContain("{{AGENT_INSTRUCTIONS}}");
      expect(parsed.template).toContain("{{SECTIONS}}");
      expect(parsed.template).toContain("{{TARGET_FILE}}");
    });

    it("throws when no section headers found", async () => {
      const templatePath = path.join(tempDir, "empty.md");
      await fs.writeFile(templatePath, "Just some text\nNo sections\n", "utf-8");

      expect(() => parseFormatFile(templatePath)).toThrow("No section headers found");
    });
  });
});
