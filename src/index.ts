/**
 * docspec - Generate docspec files and prompts
 */

export {
  copyLatestBoilerplate,
  generateDocspecContent,
  ensureDocAndDocspec,
} from "./create";
export type {
  CopyLatestBoilerplateResult,
  EnsureDocAndDocspecOptions,
  EnsureDocAndDocspecResult,
} from "./create";
export {
  markdownToDocspecPath,
  docspecToMarkdownPath,
  isDocspecPath,
} from "./path-utils";
export { buildDocspecReviewPrompt } from "./review";
export type { DocspecReviewOptions } from "./review";
export { logger, LogLevel } from "./logger";

