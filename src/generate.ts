/**
 * Prompt building for the "docspec generate" command (create docspec + LLM prompts).
 * Docspec file creation from template: create.ts.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { generateDocspec } from "./create";
import { markdownToDocspecPath } from "./path-utils";

const PLAN_TEMPLATE = `You are analyzing a markdown file and its docspec to discover missing or irrelevant information. Do not ask questions - create the plan directly.

<markdown path="{{md_path}}">
{{md_text}}
</markdown>

<docspec path="{{docspec_path}}">
{{docspec_text}}
</docspec>

Task: Focus on INFORMATION DISCOVERY. Use all of your available tools to explore the repository and understand what actually exists, then analyze both files and create a plan that identifies:

1. **Missing information in the docspec**: What important details about the markdown file are not captured in sections 1-5?
   - What does the markdown actually contain that isn't mentioned in the docspec?
   - What should trigger updates that isn't currently listed?
   - What structure/guidelines are missing?

2. **Irrelevant or incorrect information in the docspec**: What's in the docspec that doesn't match reality?
   - Does the docspec describe things that aren't actually in the markdown?
   - Are there update triggers that don't make sense?
   - Are there structure requirements that don't match the actual document?

3. **Missing information in the markdown**: What should be documented but isn't?
   - Are there important details missing?
   - Are there sections that should exist but don't?

IMPORTANT: The docspec structure must be preserved:
- Keep the header format: \`# DOCSPEC: [filename]\`
- Keep the one-line description
- Keep the \`## AGENT INSTRUCTIONS\` section exactly as-is
- Keep section headers: \`## 1. Document Purpose\`, \`## 2. Update Triggers\`, etc.
- ONLY update the CONTENT within sections 1-5, not the headers or structure

Output your plan in a clear, structured format focusing on information gaps and corrections.
`;

const IMPL_TEMPLATE = `Based on this information discovery plan:
<plan>
{{PLAN}}
</plan>

You need to update two files:
1. {{md_path}} - the markdown file
2. {{docspec_path}} - the docspec file

CRITICAL CONSTRAINTS FOR DOCSPEC FILE - YOU MUST PRESERVE THE EXACT STRUCTURE:

1. Read the existing {{docspec_path}} file FIRST using the Read tool
2. PRESERVE EXACTLY:
   - The exact header format (e.g. \`# DOCSPEC: Readme\` or \`# DOCSPEC: [README.md](/README.md)\`) - keep it EXACTLY as written
   - The exact one-line description format (e.g. \`> A specification that ...\`) - keep it EXACTLY as written
   - The \`## AGENT INSTRUCTIONS\` section if it exists - keep it EXACTLY as-is, do not modify
   - The EXACT section header names and numbers (e.g. \`## 1. Document Purpose\` or \`## 2. Update Triggers\`) - keep them EXACTLY as written
   - The order of sections - do not reorder them

3. ONLY update the CONTENT within sections 1-5 (the text below each section header)
   - Do NOT change section header text, numbers, or names
   - Do NOT change the format of headers
   - Do NOT modify title, description, or AGENT INSTRUCTIONS

Task:
1. Read {{docspec_path}} and note its EXACT structure
2. Read {{md_path}}
3. Explore the repository and discover information about:
   - What the codebase actually contains
   - What files exist that relate to the markdown
   - What the actual structure and content of the markdown is
4. For {{docspec_path}}: Update ONLY the content text within sections 1-5. Preserve ALL structure, headers, format, and separators exactly as they were.
5. For {{md_path}}: Add any missing information identified in the plan
6. Make changes directly to the files
`;

function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

export interface DocspecGenerateOptions {
  /** Path to the markdown file (repo-relative, e.g. README.md or docs/deploy.md). */
  markdownPath: string;
  /** If true, overwrite existing docspec. If false and docspec exists, throws. */
  overwrite?: boolean;
  /** Repo root (default process.cwd()). */
  repoRoot?: string;
}

/**
 * Generate the docspec file (if missing or overwrite), then build plan and implementation prompts.
 * Returns combined prompt (implementation prompt with {{PLAN}} placeholder) and optional paths to write.
 */
export async function buildDocspecGeneratePrompts(
  options: DocspecGenerateOptions & {
    outputPromptPath?: string;
    outputPlanPath?: string;
  }
): Promise<{ planPrompt: string; implPrompt: string; outputPromptPath?: string; outputPlanPath?: string }> {
  const repoRoot = path.resolve(options.repoRoot ?? process.cwd());
  const mdPath = path.normalize(options.markdownPath).replace(/\\/g, "/");
  const mdFull = path.join(repoRoot, mdPath);
  const docspecPath = markdownToDocspecPath(mdPath);
  const docspecFull = path.join(repoRoot, docspecPath);

  try {
    await fs.access(mdFull);
  } catch {
    throw new Error(`Markdown file not found: ${mdFull}`);
  }

  const docspecExists = await fs.access(docspecFull).then(() => true).catch(() => false);
  if (docspecExists && !options.overwrite) {
    throw new Error(
      `Docspec file already exists: ${docspecPath}. To overwrite, set overwrite to true.`
    );
  }

  await generateDocspec(mdPath);

  const mdText = await fs.readFile(mdFull, "utf-8");
  const docspecText = await fs.readFile(docspecFull, "utf-8");

  const vars: Record<string, string> = {
    md_path: mdPath,
    md_text: mdText,
    docspec_path: docspecPath,
    docspec_text: docspecText,
    "{{PLAN}}": "{{PLAN}}",
  };

  const planPrompt = substitute(PLAN_TEMPLATE, vars);
  const implPrompt = substitute(IMPL_TEMPLATE, vars);

  const outPrompt = options.outputPromptPath
    ? path.resolve(repoRoot, options.outputPromptPath)
    : undefined;
  const outPlan = options.outputPlanPath
    ? path.resolve(repoRoot, options.outputPlanPath)
    : undefined;

  if (outPrompt) {
    await fs.mkdir(path.dirname(outPrompt), { recursive: true });
    await fs.writeFile(outPrompt, implPrompt, "utf-8");
  }
  if (outPlan) {
    await fs.mkdir(path.dirname(outPlan), { recursive: true });
    await fs.writeFile(outPlan, planPrompt, "utf-8");
  }

  return {
    planPrompt,
    implPrompt,
    outputPromptPath: outPrompt,
    outputPlanPath: outPlan,
  };
}
