import * as fs from "fs";
import * as path from "path";

/**
 * Seed .docspec/docspec-template.md from the bundled docspec-template.md if it doesn't exist.
 */
function seedDefaultFormatFile(): string {
  const cwd = process.cwd();
  const userPath = path.join(cwd, ".docspec", "docspec-template.md");
  const defaultPath = path.join(__dirname, "..", "docspec-template.md");
  if (!fs.existsSync(defaultPath)) {
    throw new Error(
      `Default template not found at ${defaultPath}. ` +
        `Create .docspec/docspec-template.md in your project or ensure the docspec package is installed correctly.`
    );
  }
  fs.mkdirSync(path.join(cwd, ".docspec"), { recursive: true });
  fs.copyFileSync(defaultPath, userPath);
  return userPath;
}

/**
 * Path to the template file (.docspec/docspec-template.md). Seeds from bundled default if missing.
 */
export function getFormatFilePath(): string {
  const cwd = process.cwd();
  const userPath = path.join(cwd, ".docspec", "docspec-template.md");
  if (fs.existsSync(userPath)) return userPath;
  return seedDefaultFormatFile();
}

/**
 * Read the template file content (with path resolution and seeding). Used when generating new docspecs.
 */
export function getTemplateContent(): string {
  const formatPath = getFormatFilePath();
  return fs.readFileSync(formatPath, "utf-8");
}
