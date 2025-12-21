You are analyzing a markdown file and its docspec to discover missing or irrelevant information. Do not ask questions - create the plan directly.

<markdown path="{md_path}">
{md_text}
</markdown>

<docspec path="{docspec_path}">
{docspec_text}
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
- Keep the header format: `# DOCSPEC: [filename]`
- Keep the one-line description
- Keep the `## AGENT INSTRUCTIONS` section exactly as-is
- Keep section headers: `## 1. Document Purpose`, `## 2. Update Triggers`, etc.
- ONLY update the CONTENT within sections 1-5, not the headers or structure

Output your plan in a clear, structured format focusing on information gaps and corrections.

