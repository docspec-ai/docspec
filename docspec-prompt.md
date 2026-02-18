## When updating each document

* Compare the target document against the docspec.
* Update the target document to satisfy the docspec.
* Make the smallest changes necessary.
* Preserve existing content that already complies.
* Do not invent content, sections, or facts not implied by the docspec or the repository.

---

## Steps

1. For each docspec listed above, assess whether its target markdown satisfies the docspec. Compare the markdown to the docspec's **Expected Structure** (section 3) and **Document Purpose** (section 1)—section order, required sections, and content. If it does not match, update the markdown. Any diff or change list is context only; the task is always doc-vs-docspec.
2. Explore the repository as needed to understand context (e.g. for new docs or docspecs).
3. Assess whether the scope warrants **new documentation**: one or more new markdown files that do not exist yet. If so, create the file(s), run `docspec create <path>` for each, edit as needed, and include in your commit and PR.
4. For any markdown file listed above as having no docspec, decide whether it should have one. If so, run `docspec create <path>` and include the new docspec file in your PR.
5. Only update markdown files when necessary to satisfy their docspecs—avoid unnecessary changes.
6. Use the Edit tool to modify markdown files directly when changes are needed.
7. When you have made any documentation changes: create a new branch whose name starts with `docspec/` (e.g. `docspec/docs-sync`), commit your changes, push the branch, and open a pull request using the gh CLI. **IMPORTANT**: If a base branch is specified below, you MUST target that branch when creating the PR (e.g. `gh pr create --base <branch-name>`). If no base branch is specified, use the default branch. Using the `docspec/` prefix ensures the docspec-review workflow will not run again when this PR is merged. If you made no file changes, do not create a branch or PR—treat the branch/PR step as not applicable and do not mark it complete as if a PR was opened.
8. Do not provide any text output—files are modified directly using tools.
