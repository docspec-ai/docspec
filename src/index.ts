/**
 * docspec - Generate docspec files and prompts
 */

export {
  generateDocspecContent,
  ensureDocAndDocspec,
} from "./create";
export type { EnsureDocAndDocspecOptions, EnsureDocAndDocspecResult } from "./create";
export {
  markdownToDocspecPath,
  docspecToMarkdownPath,
  isDocspecPath,
} from "./path-utils";
export { buildDocspecReviewPrompt } from "./review";
export type { DocspecReviewOptions } from "./review";
export { REQUIRED_SECTIONS, SECTION_BOILERPLATE } from "./constants";
export { logger, LogLevel } from "./logger";

