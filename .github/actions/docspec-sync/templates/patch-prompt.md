Merged PR diff (context):
<diff>
{diff}
</diff>

Docspec (requirements for the markdown file):
<docspec path="{md_path}.docspec">
{docspec}
</docspec>

Current markdown content:
<markdown path="{md_path}">
{md_text}
</markdown>

Task:
1. Explore the repository using your available tools (Read, Glob, Grep, Bash, etc.) to understand the codebase context
2. Understand how the code changes in the diff relate to the documentation
3. Update the markdown file at {md_path} to satisfy the docspec given the code changes
4. If no changes are needed, output an empty string
5. Output ONLY a unified diff against the markdown file at path: {md_path}

Important: You must output ONLY a unified diff. No explanations, no other text. Start with "--- " or "diff --git".

