import * as path from "path";

const DOCSPEC_DIR = ".docspec";
const DOCSPEC_EXT = ".docspec.md";
const MD_EXT = ".md";

/**
 * Convert a markdown file path to its docspec path under .docspec/.
 * e.g. README.md -> .docspec/README.docspec.md, docs/deploy.md -> .docspec/docs/deploy.docspec.md
 * Absolute paths (e.g. /var/folders/.../file.md) are mapped to .docspec/<basename>.docspec.md
 * so we never create .docspec/var/... under the repo.
 */
export function markdownToDocspecPath(mdPath: string): string {
  const normalized = path.normalize(mdPath).replace(/\\/g, "/");
  const base = path.isAbsolute(normalized) ? path.basename(normalized) : normalized;
  const withoutExt = base.endsWith(MD_EXT) ? base.slice(0, -MD_EXT.length) : base;
  return path.join(DOCSPEC_DIR, withoutExt + DOCSPEC_EXT).replace(/\\/g, "/");
}

/**
 * Convert a docspec file path (under .docspec/) to its target markdown path.
 * e.g. .docspec/README.docspec.md -> README.md, .docspec/docs/deploy.docspec.md -> docs/deploy.md
 */
export function docspecToMarkdownPath(docspecPath: string): string {
  const normalized = path.normalize(docspecPath).replace(/\\/g, "/");
  const withoutPrefix = normalized.startsWith(DOCSPEC_DIR + "/")
    ? normalized.slice((DOCSPEC_DIR + "/").length)
    : normalized;
  if (!withoutPrefix.endsWith(DOCSPEC_EXT)) {
    return normalized; // not a docspec path, return as-is
  }
  return withoutPrefix.slice(0, -DOCSPEC_EXT.length) + MD_EXT;
}

/**
 * Check if a path is under .docspec/ and ends with .docspec.md
 */
export function isDocspecPath(filePath: string): boolean {
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  return (
    normalized.startsWith(DOCSPEC_DIR + "/") && normalized.endsWith(DOCSPEC_EXT)
  );
}
