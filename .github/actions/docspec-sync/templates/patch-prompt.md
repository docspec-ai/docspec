Merged PR diff (context):
<diff>
${diff}
</diff>

Docspec (requirements for the markdown file):
<docspec path="${docspec_path}">
${docspec}
</docspec>

Current markdown content:
<markdown path="${md_path}">
${md_text}
</markdown>

Task:
1. Explore the repository using your available tools to understand the codebase context
2. Understand how the code changes in the diff relate to the documentation
3. If the markdown file at ${md_path} already satisfies the docspec given the code changes, do not make any changes
4. Only update the markdown file if changes are actually necessary to satisfy the docspec - avoid making unnecessary changes for the sake of doing something
5. Use the Edit tool to modify the markdown file at ${md_path} directly if changes are needed
6. Do not provide any text output - files are modified directly using tools

