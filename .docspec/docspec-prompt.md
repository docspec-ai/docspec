## When updating each document

* Compare the target document against the docspec.
* Update the target document to satisfy the docspec.
* Make the smallest changes necessary.
* Preserve existing content that already complies.
* Do not invent content, sections, or facts not implied by the docspec or the repository.

---

## Steps

1. Explore the repository using your available tools to understand the codebase context
2. Understand how the code changes in the diff relate to each docspec's requirements
3. Assess whether the changes warrant **new documentation**: one or more new markdown files that do not exist yet (e.g. to document a new API, feature, or module). If so, create the new markdown file(s), run `docspec create <path>` for each to create the doc and docspec(s), edit as needed, and include in your commit and PR.
4. For any markdown file listed above as having no docspec, decide whether it should have one. If so, run `docspec create <path>` and include the new docspec file in your PR.
5. For each markdown file listed above (with an existing docspec), check if it already satisfies its docspec given the code changes
6. Only update markdown files if changes are actually necessary to satisfy their docspecs - avoid making unnecessary changes
7. Use the Edit tool to modify markdown files directly if changes are needed
8. When you have made any documentation changes: create a branch and open a pull request following these steps exactly:
   - Determine the base branch: use the base branch specified below, or the default branch if none is specified.
   - Fetch the latest base branch: `git fetch origin <base-branch>`.
   - Create a **new** branch from the base branch tip with a unique name: `git checkout -b docspec/docs-sync-$(date +%Y%m%d-%H%M%S) origin/<base-branch>`. Never reuse an existing `docspec/` branch.
   - Commit your changes, push the branch, and open a pull request using the gh CLI (e.g. `gh pr create --base <base-branch>`).
   - Using the `docspec/` prefix ensures the docspec-review workflow will not run again when this PR is merged.
   - If you made no file changes, do not create a branch or PR—treat the branch/PR step as not applicable and do not mark it complete as if a PR was opened.
9. Do not provide any text output - files are modified directly using tools
