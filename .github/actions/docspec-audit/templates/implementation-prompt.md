Based on this information discovery plan:
<plan>
{plan}
</plan>

You need to update two files:
1. {md_path} - the markdown file
2. {docspec_path} - the docspec file

CRITICAL CONSTRAINTS FOR DOCSPEC FILE - YOU MUST PRESERVE THE EXACT STRUCTURE:

1. Read the existing {docspec_path} file FIRST using the Read tool
2. PRESERVE EXACTLY:
   - Any frontmatter (--- at the top) if it exists
   - The exact header format (e.g., `# DOCSPEC: Readme` or `# DOCSPEC: [README.md](/README.md)`) - keep it EXACTLY as written
   - The exact one-line description format (e.g., `> Short phrase: *...*` or `> One line: ...`) - keep it EXACTLY as written
   - Any separator lines (---) between sections - keep them EXACTLY as they are
   - The `## AGENT INSTRUCTIONS` section if it exists - keep it EXACTLY as-is, do not modify
   - The EXACT section header names and numbers (e.g., `## 1. Purpose of This Document` or `## 1. Document Purpose`) - keep them EXACTLY as written
   - The order of sections - do not reorder them

3. ONLY update the CONTENT within sections 1-5 (the text below each section header)
   - Do NOT change section header text, numbers, or names
   - Do NOT change the format of headers
   - Do NOT add or remove separator lines
   - Do NOT modify frontmatter, title, description, or AGENT INSTRUCTIONS

Task:
1. Use Read tool to read {docspec_path} and note its EXACT structure (frontmatter, header format, section names, separators)
2. Use Read tool to read {md_path}
3. Use Read, Glob, and Grep tools to explore the repository and discover information about:
   - What the codebase actually contains
   - What files exist that relate to the markdown
   - What the actual structure and content of the markdown is
4. For {docspec_path}: Update ONLY the content text within sections 1-5. Preserve ALL structure, headers, format, and separators exactly as they were.
5. For {md_path}: Add any missing information identified in the plan
6. Use the Edit tool to make changes directly to the files

IMPORTANT: When editing {docspec_path}, match the existing file's structure exactly. If it has frontmatter, keep it. If section headers say "Purpose of This Document", keep that exact text. Only change the content paragraphs below the headers.

