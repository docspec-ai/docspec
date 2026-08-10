import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import { buildDocspecReviewPrompt } from "../review";

async function writeDocspecPair(
  root: string,
  mdRel: string,
  mdContent = "# Doc\n",
  docspecBody = "## 1. Purpose\n\nDescribe.\n"
): Promise<void> {
  const mdFull = path.join(root, mdRel);
  await fs.mkdir(path.dirname(mdFull), { recursive: true });
  await fs.writeFile(mdFull, mdContent, "utf-8");
  const withoutExt = mdRel.endsWith(".md") ? mdRel.slice(0, -3) : mdRel;
  const docspecRel = path.join(".docspec", withoutExt + ".docspec.md");
  const docspecFull = path.join(root, docspecRel);
  await fs.mkdir(path.dirname(docspecFull), { recursive: true });
  await fs.writeFile(
    docspecFull,
    `# DOCSPEC: [${mdRel}](/${mdRel})\n\n${docspecBody}`,
    "utf-8"
  );
}

function initGitRepo(dir: string): void {
  execSync("git init", { cwd: dir, stdio: "ignore" });
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: "ignore" });
  execSync('git config user.name "Test"', { cwd: dir, stdio: "ignore" });
}

function gitCommit(dir: string, message: string): string {
  execSync("git add -A", { cwd: dir, stdio: "ignore" });
  execSync(`git commit -m "${message}" --allow-empty`, { cwd: dir, stdio: "ignore" });
  return execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf-8" }).trim();
}

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

  describe("relevance ranking", () => {
    it("prefers the deepest-matching docspec over root docspecs", async () => {
      // Root docspec + nested docspec. A change under nested/ should rank nested higher.
      await writeDocspecPair(tempDir, "README.md", "# Root");
      await writeDocspecPair(tempDir, "nested/guide.md", "# Nested");

      const { prompt } = await buildDocspecReviewPrompt({
        changedFiles: ["nested/src/foo.ts", "nested/src/bar.ts"],
        repoRoot: tempDir,
        maxDocspecs: 10,
      });

      const nestedIdx = prompt.indexOf("## Docspec: .docspec/nested/guide.docspec.md");
      const rootIdx = prompt.indexOf("## Docspec: .docspec/README.docspec.md");
      expect(nestedIdx).toBeGreaterThan(-1);
      // Root may or may not appear (ancestor score 0.1); if it does, nested comes first.
      if (rootIdx !== -1) {
        expect(nestedIdx).toBeLessThan(rootIdx);
      }
    });

    it("ranks by score desc then path asc for determinism", async () => {
      // Two root-level docspecs, same score from a root-level change.
      await writeDocspecPair(tempDir, "aaa.md", "# A");
      await writeDocspecPair(tempDir, "zzz.md", "# Z");

      const { prompt } = await buildDocspecReviewPrompt({
        changedFiles: ["something.ts"],
        repoRoot: tempDir,
      });

      const aaaIdx = prompt.indexOf("## Docspec: .docspec/aaa.docspec.md");
      const zzzIdx = prompt.indexOf("## Docspec: .docspec/zzz.docspec.md");
      expect(aaaIdx).toBeGreaterThan(-1);
      expect(zzzIdx).toBeGreaterThan(-1);
      expect(aaaIdx).toBeLessThan(zzzIdx);
    });

    it("respects maxDocspecs after ranking", async () => {
      await writeDocspecPair(tempDir, "a.md");
      await writeDocspecPair(tempDir, "b.md");
      await writeDocspecPair(tempDir, "c.md");

      const { prompt } = await buildDocspecReviewPrompt({
        changedFiles: ["x.ts"],
        repoRoot: tempDir,
        maxDocspecs: 2,
      });

      const matches = prompt.match(/## Docspec: /g) ?? [];
      expect(matches.length).toBe(2);
    });

    it("gives direct-hit target markdown a large boost", async () => {
      await writeDocspecPair(tempDir, "README.md");
      await writeDocspecPair(tempDir, "nested/guide.md");

      // Changing nested/guide.md is a direct hit; root only gets ancestor score.
      const { prompt } = await buildDocspecReviewPrompt({
        changedFiles: ["nested/guide.md"],
        repoRoot: tempDir,
        maxDocspecs: 1,
      });

      expect(prompt).toContain("## Docspec: .docspec/nested/guide.docspec.md");
      expect(prompt).not.toContain("## Docspec: .docspec/README.docspec.md");
    });
  });

  describe("batch mode", () => {
    it("emits path pairs and no inlined markdown content", async () => {
      await writeDocspecPair(tempDir, "foo.md", "# Foo body that should not be inlined");

      const { prompt } = await buildDocspecReviewPrompt({
        changedFiles: ["foo.md", "src/x.ts"],
        repoRoot: tempDir,
        mode: "batch",
        base: "BASESHA",
        merge: "MERGESHA",
        baseRef: "main",
      });

      expect(prompt).toContain("## Ranked docspecs to review");
      expect(prompt).toContain("### .docspec/foo.docspec.md");
      expect(prompt).toContain("Target markdown: `foo.md`");
      expect(prompt).toContain("## Changed files");
      expect(prompt).toContain("- foo.md");
      expect(prompt).toContain("Git range: BASESHA..MERGESHA");
      // Must NOT inline the markdown/docspec bodies.
      expect(prompt).not.toContain("<markdown>");
      expect(prompt).not.toContain("<docspec>");
      expect(prompt).not.toContain("# Foo body that should not be inlined");
    });

    it("includes the incremental commit protocol and draft-PR-on-first-push", async () => {
      await writeDocspecPair(tempDir, "foo.md");

      const { prompt } = await buildDocspecReviewPrompt({
        changedFiles: ["foo.md"],
        repoRoot: tempDir,
        mode: "batch",
        base: "aaa",
        merge: "bbb",
        baseRef: "develop",
      });

      expect(prompt).toContain("## Batch mode instructions");
      expect(prompt).toContain("Incremental commit protocol");
      expect(prompt).toContain("gh pr create --draft");
      expect(prompt).toContain("On the very first push");
      expect(prompt).toContain("git checkout -b docspec/docs-sync-");
      expect(prompt).toContain("origin/develop");
      expect(prompt).toContain("gh pr ready");
      // Protocol must appear AFTER the user docspec-prompt content.
      const stepsIdx = prompt.indexOf("## Steps");
      const batchIdx = prompt.indexOf("## Batch mode instructions");
      expect(stepsIdx).toBeGreaterThan(-1);
      expect(batchIdx).toBeGreaterThan(stepsIdx);
    });

    it("emits diffstat section rather than full diff", async () => {
      initGitRepo(tempDir);
      await writeDocspecPair(tempDir, "foo.md");
      const base = gitCommit(tempDir, "initial");
      await fs.writeFile(path.join(tempDir, "foo.md"), "# Foo updated\n", "utf-8");
      await fs.writeFile(path.join(tempDir, "src.ts"), "console.log(1)\n", "utf-8");
      const merge = gitCommit(tempDir, "changes");

      const { prompt } = await buildDocspecReviewPrompt({
        repoRoot: tempDir,
        mode: "batch",
        base,
        merge,
        baseRef: "main",
      });

      expect(prompt).toContain("<diffstat>");
      expect(prompt).not.toContain("<diff>");
      expect(prompt).toContain(`Git range: ${base}..${merge}`);
    });
  });

  describe("excludeCommits", () => {
    it("drops files touched only by excluded commits", async () => {
      initGitRepo(tempDir);
      await writeDocspecPair(tempDir, "keep.md", "# Keep");
      await writeDocspecPair(tempDir, "drop.md", "# Drop");
      const base = gitCommit(tempDir, "initial");

      // Commit A: touches keep.md (via a companion code file under same dir for scoring)
      await fs.writeFile(path.join(tempDir, "keep-code.ts"), "a\n", "utf-8");
      await fs.writeFile(path.join(tempDir, "keep.md"), "# Keep v2\n", "utf-8");
      gitCommit(tempDir, "normal change");

      // Commit B (docspec bot): touches only drop.md
      await fs.writeFile(path.join(tempDir, "drop.md"), "# Drop v2\n", "utf-8");
      const excluded = gitCommit(tempDir, "docs: docspec daily sync");

      const merge = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      const { prompt } = await buildDocspecReviewPrompt({
        repoRoot: tempDir,
        mode: "batch",
        base,
        merge,
        excludeCommits: [excluded],
      });

      expect(prompt).toContain("keep.md");
      expect(prompt).toContain(".docspec/keep.docspec.md");
      // drop.md was only touched by the excluded commit — must not appear in changed files.
      const changedSection = prompt.slice(
        prompt.indexOf("## Changed files"),
        prompt.indexOf("## Diffstat")
      );
      expect(changedSection).not.toContain("drop.md");
    });

    it("keeps a file touched by both an excluded and a normal commit", async () => {
      initGitRepo(tempDir);
      await writeDocspecPair(tempDir, "shared.md", "# Shared");
      const base = gitCommit(tempDir, "initial");

      await fs.writeFile(path.join(tempDir, "shared.md"), "# Shared v2\n", "utf-8");
      gitCommit(tempDir, "human edit");

      await fs.writeFile(path.join(tempDir, "shared.md"), "# Shared v3\n", "utf-8");
      const excluded = gitCommit(tempDir, "docs: docspec sync");

      const merge = execSync("git rev-parse HEAD", { cwd: tempDir, encoding: "utf-8" }).trim();

      const { prompt } = await buildDocspecReviewPrompt({
        repoRoot: tempDir,
        mode: "batch",
        base,
        merge,
        excludeCommits: [excluded],
      });

      expect(prompt).toContain("shared.md");
      expect(prompt).toContain(".docspec/shared.docspec.md");
    });

    it("is a no-op when excludeCommits is empty (inline regression)", async () => {
      await writeDocspecPair(tempDir, "foo.md", "# Foo content");

      const { prompt } = await buildDocspecReviewPrompt({
        changedFiles: ["foo.md"],
        repoRoot: tempDir,
        excludeCommits: [],
      });

      expect(prompt).toContain("<diff>");
      expect(prompt).toContain("## Docspec: .docspec/foo.docspec.md");
      expect(prompt).toContain("# Foo content");
    });
  });
});
