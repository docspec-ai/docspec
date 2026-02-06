import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { buildDocspecGeneratePrompts } from "../generate";

describe("generate", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-generate-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("throws when markdown file does not exist", async () => {
    await expect(
      buildDocspecGeneratePrompts({
        markdownPath: "missing.md",
        repoRoot: tempDir,
      })
    ).rejects.toThrow("Markdown file not found");
  });

  it("creates docspec and returns plan and impl prompts", async () => {
    await fs.writeFile(path.join(tempDir, "README.md"), "# Hello World", "utf-8");

    const result = await buildDocspecGeneratePrompts({
      markdownPath: "README.md",
      repoRoot: tempDir,
    });

    expect(result.planPrompt).toContain("<markdown path=\"README.md\">");
    expect(result.planPrompt).toContain("# Hello World");
    expect(result.planPrompt).toContain("<docspec path=\".docspec/README.docspec.md\">");
    expect(result.implPrompt).toContain("{{PLAN}}");
    expect(result.implPrompt).toContain("README.md");
    expect(result.implPrompt).toContain(".docspec/README.docspec.md");

    const docspecPath = path.join(tempDir, ".docspec", "README.docspec.md");
    const docspecExists = await fs.access(docspecPath).then(() => true).catch(() => false);
    expect(docspecExists).toBe(true);
  });

  it("throws when docspec exists and overwrite is false", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "README.md"), "# Hi", "utf-8");
    await fs.writeFile(path.join(tempDir, ".docspec", "README.docspec.md"), "existing", "utf-8");

    await expect(
      buildDocspecGeneratePrompts({
        markdownPath: "README.md",
        repoRoot: tempDir,
        overwrite: false,
      })
    ).rejects.toThrow("Docspec file already exists");
  });

  it("overwrites docspec when overwrite is true", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "README.md"), "# Hi", "utf-8");
    await fs.writeFile(path.join(tempDir, ".docspec", "README.docspec.md"), "old content", "utf-8");

    await buildDocspecGeneratePrompts({
      markdownPath: "README.md",
      repoRoot: tempDir,
      overwrite: true,
    });

    const content = await fs.readFile(path.join(tempDir, ".docspec", "README.docspec.md"), "utf-8");
    expect(content).toContain("# DOCSPEC:");
    expect(content).not.toBe("old content");
  });

  it("writes prompts to output paths when provided", async () => {
    await fs.writeFile(path.join(tempDir, "doc.md"), "# Doc", "utf-8");

    const result = await buildDocspecGeneratePrompts({
      markdownPath: "doc.md",
      repoRoot: tempDir,
      outputPromptPath: "prompt.txt",
      outputPlanPath: "plan.txt",
    });

    expect(result.outputPromptPath).toBe(path.join(tempDir, "prompt.txt"));
    expect(result.outputPlanPath).toBe(path.join(tempDir, "plan.txt"));
    const promptContent = await fs.readFile(path.join(tempDir, "prompt.txt"), "utf-8");
    const planContent = await fs.readFile(path.join(tempDir, "plan.txt"), "utf-8");
    expect(promptContent).toBe(result.implPrompt);
    expect(planContent).toBe(result.planPrompt);
  });

  it("writes docspec under repoRoot when repoRoot differs from cwd", async () => {
    const repoDir = path.join(tempDir, "repo");
    await fs.mkdir(repoDir, { recursive: true });
    await fs.writeFile(path.join(repoDir, "README.md"), "# Repo readme", "utf-8");
    process.chdir(tempDir);

    const result = await buildDocspecGeneratePrompts({
      markdownPath: "README.md",
      repoRoot: repoDir,
    });

    expect(result.planPrompt).toContain("# Repo readme");
    expect(result.planPrompt).toContain("<docspec path=\".docspec/README.docspec.md\">");
    const docspecPath = path.join(repoDir, ".docspec", "README.docspec.md");
    const docspecExists = await fs.access(docspecPath).then(() => true).catch(() => false);
    expect(docspecExists).toBe(true);
    const docspecContent = await fs.readFile(docspecPath, "utf-8");
    expect(docspecContent).toContain("# DOCSPEC:");
  });

  it("preserves $ replacement patterns in markdown and docspec content literally", async () => {
    const mdContent = [
      "# Regex and shell notes",
      "In JS replace(), use `$&` for the matched string.",
      "Use `$1` and `$2` for capture groups.",
      "In shell, `` $` `` is before match, `$'` is after.",
    ].join("\n");
    await fs.writeFile(path.join(tempDir, "notes.md"), mdContent, "utf-8");

    const result = await buildDocspecGeneratePrompts({
      markdownPath: "notes.md",
      repoRoot: tempDir,
      overwrite: true,
    });

    // Must appear literally (no $ interpreted as replacement patterns)
    expect(result.planPrompt).toContain("use `$&` for the matched string");
    expect(result.planPrompt).toContain("`$1` and `$2` for capture groups");
    expect(result.planPrompt).toContain("`` $` `` is before match");
    expect(result.planPrompt).toContain("`$'` is after");
    // Placeholder {{md_text}} must not appear in the interpolated content
    expect(result.planPrompt).not.toMatch(/\{\{md_text\}\}/);
    expect(result.implPrompt).not.toMatch(/\{\{md_text\}\}/);
  });

  it("preserves literal {{docspec_path}} and {{docspec_text}} inside markdown content", async () => {
    const mdContent = [
      "# Template docs",
      "In this project we use placeholders like `{{docspec_path}}` and `{{docspec_text}}`.",
      "Do not replace these when generating the prompt.",
    ].join("\n");
    await fs.writeFile(path.join(tempDir, "templating.md"), mdContent, "utf-8");

    const result = await buildDocspecGeneratePrompts({
      markdownPath: "templating.md",
      repoRoot: tempDir,
      overwrite: true,
    });

    // Literal {{docspec_path}} and {{docspec_text}} from the markdown must remain unchanged
    expect(result.planPrompt).toContain("like `{{docspec_path}}` and `{{docspec_text}}`");
    // Template placeholders (outside inserted content) are still substituted
    expect(result.planPrompt).toContain("<docspec path=\".docspec/templating.docspec.md\">");
  });
});
