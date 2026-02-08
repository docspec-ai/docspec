## When updating each document

* Compare the target document against this docspec.
* Update the target document to satisfy this docspec.
* Make the smallest changes necessary.
* Preserve existing content that already complies.
* Do not invent content, sections, or facts not implied by this docspec or the repository.

---

## Steps

1. Explore the repository using your available tools to understand the codebase context
2. Understand how the code changes in the diff relate to each docspec's requirements
3. Assess whether the changes warrant **new documentation**: one or more new markdown files that do not exist yet (e.g. to document a new API, feature, or module). If so, create the new markdown file(s), run `docspec create <path>` for each to create the doc and docspec(s), edit as needed, and include in your commit and PR.
4. For any markdown file listed above as having no docspec, decide whether it should have one. If so, run `docspec create <path>` and include the new docspec file in your PR.
5. For each markdown file listed above (with an existing docspec), check if it already satisfies its docspec given the code changes
6. Only update markdown files if changes are actually necessary to satisfy their docspecs - avoid making unnecessary changes
7. Use the Edit tool to modify markdown files directly if changes are needed
8. When you have made any documentation changes: create a new branch, commit your changes, push the branch, and open a pull request using the gh CLI (e.g. gh pr create). If you made no file changes, do not create a branch or PR.
9. Do not provide any text output - files are modified directly using tools
