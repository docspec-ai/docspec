import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { buildDocspecReviewPrompt } from "../review";

describe("review", () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docspec-review-test-"));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns empty prompt when no docspecs match changed files", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec", "sub"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, ".docspec", "sub", "bar.docspec.md"),
      "# DOCSPEC: bar\n\n## 1. Purpose\n\n",
      "utf-8"
    );
    await fs.mkdir(path.join(tempDir, "sub"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "sub", "bar.md"), "# Bar", "utf-8");
    await fs.writeFile(path.join(tempDir, "root-only.js"), "code", "utf-8");

    const { prompt } = await buildDocspecReviewPrompt({
      changedFiles: ["root-only.js"],
      repoRoot: tempDir,
    });

    expect(prompt).toBe("");
  });

  it("builds prompt when changed file is the target markdown of a docspec", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    const docspecContent = "# DOCSPEC: [foo.md](/foo.md)\n\n## 1. Purpose\n\nDescribe foo.";
    await fs.writeFile(path.join(tempDir, ".docspec", "foo.docspec.md"), docspecContent, "utf-8");
    await fs.writeFile(path.join(tempDir, "foo.md"), "# Foo content", "utf-8");

    const { prompt, outputPath } = await buildDocspecReviewPrompt({
      changedFiles: ["foo.md"],
      repoRoot: tempDir,
    });

    expect(prompt).toContain("<diff>");
    expect(prompt).toContain("## Docspec: .docspec/foo.docspec.md");
    expect(prompt).toContain("Target markdown: foo.md");
    expect(prompt).toContain("<docspec>");
    expect(prompt).toContain(docspecContent);
    expect(prompt).toContain("<markdown>");
    expect(prompt).toContain("# Foo content");
    expect(prompt).toContain("## Steps");
    expect(outputPath).toBeNull();
  });

  it("builds prompt for specific reviewFiles (manual review)", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    const docspecContent = "# DOCSPEC: [foo.md](/foo.md)\n\n## 1. Purpose\n\nDescribe foo.";
    await fs.writeFile(path.join(tempDir, ".docspec", "foo.docspec.md"), docspecContent, "utf-8");
    await fs.writeFile(path.join(tempDir, "foo.md"), "# Foo content", "utf-8");

    const { prompt } = await buildDocspecReviewPrompt({
      reviewFiles: ["foo.md"],
      repoRoot: tempDir,
    });

    expect(prompt).toContain("(no diff available)");
    expect(prompt).toContain("For each docspec below, compare its target markdown to the docspec");
    expect(prompt).toContain("## Docspec: .docspec/foo.docspec.md");
    expect(prompt).toContain("Target markdown: foo.md");
    expect(prompt).toContain(docspecContent);
    expect(prompt).toContain("# Foo content");
  });

  it("writes prompt to outputPath when provided", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, ".docspec", "bar.docspec.md"),
      "# DOCSPEC: bar\n\n## 1. Purpose\n\n",
      "utf-8"
    );
    await fs.writeFile(path.join(tempDir, "bar.md"), "# Bar", "utf-8");

    const { prompt, outputPath } = await buildDocspecReviewPrompt({
      changedFiles: ["bar.md"],
      repoRoot: tempDir,
      outputPath: "out/prompt.txt",
    });

    expect(prompt.length).toBeGreaterThan(0);
    expect(outputPath).toBe(path.join(tempDir, "out", "prompt.txt"));
    const written = await fs.readFile(path.join(tempDir, "out", "prompt.txt"), "utf-8");
    expect(written).toBe(prompt);
  });

  it("uses review-task.md when docspec-prompt.md is missing and copies to docspec-prompt.md", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    const legacyContent = "Task:\n1. Legacy step.";
    await fs.writeFile(
      path.join(tempDir, ".docspec", "review-task.md"),
      legacyContent,
      "utf-8"
    );
    await fs.writeFile(
      path.join(tempDir, ".docspec", "bar.docspec.md"),
      "# DOCSPEC: bar\n\n## 1. Purpose\n\n",
      "utf-8"
    );
    await fs.writeFile(path.join(tempDir, "bar.md"), "# Bar", "utf-8");

    const { prompt } = await buildDocspecReviewPrompt({
      changedFiles: ["bar.md"],
      repoRoot: tempDir,
    });

    expect(prompt).toContain("Legacy step.");
    const agentPromptAfter = await fs.readFile(
      path.join(tempDir, ".docspec", "docspec-prompt.md"),
      "utf-8"
    );
    expect(agentPromptAfter).toBe(legacyContent);
  });

  it("includes base branch in prompt when baseRef is provided", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    const docspecContent = "# DOCSPEC: [foo.md](/foo.md)\n\n## 1. Purpose\n\nDescribe foo.";
    await fs.writeFile(path.join(tempDir, ".docspec", "foo.docspec.md"), docspecContent, "utf-8");
    await fs.writeFile(path.join(tempDir, "foo.md"), "# Foo content", "utf-8");

    const { prompt } = await buildDocspecReviewPrompt({
      changedFiles: ["foo.md"],
      repoRoot: tempDir,
      baseRef: "develop",
    });

    expect(prompt).toContain("**Base branch for PR**: develop");
    expect(prompt).toContain("## Docspec: .docspec/foo.docspec.md");
  });

  it("does not include base branch line when baseRef is not provided", async () => {
    await fs.mkdir(path.join(tempDir, ".docspec"), { recursive: true });
    const docspecContent = "# DOCSPEC: [foo.md](/foo.md)\n\n## 1. Purpose\n\nDescribe foo.";
    await fs.writeFile(path.join(tempDir, ".docspec", "foo.docspec.md"), docspecContent, "utf-8");
    await fs.writeFile(path.join(tempDir, "foo.md"), "# Foo content", "utf-8");

    const { prompt } = await buildDocspecReviewPrompt({
      changedFiles: ["foo.md"],
      repoRoot: tempDir,
    });

    expect(prompt).not.toContain("**Base branch for PR**:");
    expect(prompt).toContain("## Docspec: .docspec/foo.docspec.md");
  });
});
