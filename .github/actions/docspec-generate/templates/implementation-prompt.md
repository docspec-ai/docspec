Based on this information discovery plan:
<plan>
${plan}
</plan>

You need to update two files:
1. ${md_path} - the markdown file
2. ${docspec_path} - the docspec file

CRITICAL CONSTRAINTS FOR DOCSPEC FILE - YOU MUST PRESERVE THE EXACT STRUCTURE:

1. Read the existing ${docspec_path} file FIRST using the Read tool
2. PRESERVE EXACTLY:
   - The exact header format (e.g., `# DOCSPEC: Readme` or `# DOCSPEC: [README.md](/README.md)`) - keep it EXACTLY as written
   - The exact one-line description format (e.g., `> A specification that ...`) - keep it EXACTLY as written
   - The `## AGENT INSTRUCTIONS` section if it exists - keep it EXACTLY as-is, do not modify
   - The EXACT section header names and numbers (e.g., `## 1. Document Purpose` or `## 2. Update Triggers`) - keep them EXACTLY as written
   - The order of sections - do not reorder them

3. ONLY update the CONTENT within sections 1-5 (the text below each section header)
   - Do NOT change section header text, numbers, or names
   - Do NOT change the format of headers
   - Do NOT modify title, description, or AGENT INSTRUCTIONS

Task:
1. Read ${docspec_path} and note its EXACT structure
2. Read ${md_path}
3. Explore the repository and discover information about:
   - What the codebase actually contains
   - What files exist that relate to the markdown
   - What the actual structure and content of the markdown is
4. For ${docspec_path}: Update ONLY the content text within sections 1-5. Preserve ALL structure, headers, format, and separators exactly as they were.
5. For ${md_path}: Add any missing information identified in the plan
6. Make changes directly to the files

