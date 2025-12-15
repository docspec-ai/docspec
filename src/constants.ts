/**
 * Required section headers for docspec files
 */
export const REQUIRED_SECTIONS = [
  "Document Purpose",
  "Update Triggers",
  "Expected Structure",
  "Editing Guidelines",
  "Intentional Omissions",
] as const;

/**
 * Boilerplate template text for each section
 */
export const SECTION_BOILERPLATE: Record<string, string> = {
  "Document Purpose": `What this document exists to explain or enable.
What questions it must reliably answer.
What kind of doc it is (overview, agent guide, spec, tutorial, etc.).`,

  "Update Triggers": `What kinds of changes should cause this document to be updated.
Describe in terms of detectable changes (structure, APIs, workflows, behavior).
Also note changes that **should not** trigger updates.`,

  "Expected Structure": `The sections this document should contain.
For each section: what it covers at a high level and any constraints
(e.g., "high-level only", "no exhaustive lists", "link out instead of duplicating").`,

  "Editing Guidelines": `How edits to this document should be made.
Local rules for tone, level of detail, and scope.
Explicit do/don't guidance to avoid drift, speculation, or redundancy.`,

  "Intentional Omissions": `What this document deliberately does not cover.
Where that information lives instead, if applicable.`,
};

/**
 * Generate the full docspec template
 * @param targetFilePath The path to the target markdown file (e.g., "README.md")
 */
export function getDocspecTemplate(targetFilePath: string): string {
  const sections = REQUIRED_SECTIONS.map((sectionName, index) => {
    const sectionNumber = index + 1;
    const boilerplate = SECTION_BOILERPLATE[sectionName];
    return `## ${sectionNumber}. ${sectionName}\n\n${boilerplate}`;
  }).join("\n\n---\n\n");

  return `---

# DOCSPEC: [${targetFilePath}](/${targetFilePath})

> One line: what this document is for.

---

${sections}
`;
}

