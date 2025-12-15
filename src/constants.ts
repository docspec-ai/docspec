/**
 * Required section headers for docspec files
 */
export const REQUIRED_SECTIONS = [
  "Purpose of This Document",
  "When This Document Should Be Updated",
  "Structure & Required Sections",
  "Style & Editing Guidelines",
  "Known Gaps or Intentional Omissions",
] as const;

/**
 * Boilerplate template text for each section
 */
export const SECTION_BOILERPLATE: Record<string, string> = {
  "Purpose of This Document": `Explain **what this Markdown file is supposed to achieve**, not what it currently contains.

What questions should this document always be able to answer? What *kind* of document is it (overview, spec, tutorial, ops runbook, etc.)?`,

  "When This Document Should Be Updated": `Describe **triggers** based on code changes.

Write as concrete rules that can be checked against a diff. Examples: "If new subdirectories are added, update the contents section" or "If public APIs change, update the interaction section."`,

  "Structure & Required Sections": `Describe the **expected sections** and what belongs in each, without restating the actual content.

For each section, specify: its name/role, what it should cover (conceptual, not literal), and any constraints (e.g., "Keep high-level; don't enumerate every file").`,

  "Style & Editing Guidelines": `Rules **specific to this doc or directory**, not global writing rules.

Include both style preferences (e.g., "Use non-technical language" or "Prefer bullet lists") and concrete editing guidelines (e.g., "Do: Update examples when APIs change" or "Don't: Remove placeholder sections").`,

  "Known Gaps or Intentional Omissions": `Note things that **should not be documented yet** or are deliberately vague.

Examples: "Auth design is intentionally not detailed here; see \`/security/README.md\`" or "This doc avoids internal business logic; keep it conceptual."`,
};

/**
 * Generate the full docspec template
 */
export function getDocspecTemplate(name: string): string {
  const sections = REQUIRED_SECTIONS.map((sectionName, index) => {
    const sectionNumber = index + 1;
    const boilerplate = SECTION_BOILERPLATE[sectionName];
    return `## ${sectionNumber}. ${sectionName}\n\n${boilerplate}`;
  }).join("\n\n---\n\n");

  return `---

# DOCSPEC: ${name}

> Short phrase: *What this doc is for* (e.g. "Overview of this directory's purpose and structure.")

---

${sections}
`;
}

