#!/usr/bin/env python3
"""
Docspec updater script for GitHub Actions.

Discovers relevant *.docspec.md files based on PR changes,
calls Claude API to generate unified diff patches,
and applies them to update markdown files.
"""

import os
import re
import subprocess
from pathlib import Path
from typing import List, Optional

from anthropic import Anthropic

RE_DOCSPEC = re.compile(r".*\.docspec\.md$")

MAX_DOCSPECS = int(os.getenv("MAX_DOCSPECS", "10"))
MAX_DIFF_CHARS = int(os.getenv("MAX_DIFF_CHARS", "120000"))  # guardrail


def sh(cmd: List[str]) -> str:
    """Run shell command and return stdout as string."""
    return subprocess.check_output(cmd, text=True).strip()


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def target_markdown_for_docspec(docspec_path: Path) -> Optional[Path]:
    """
    Map docspec file to target markdown file.
    
    Option B convention: README.docspec.md -> README.md
    """
    name = docspec_path.name
    if name.endswith(".docspec.md"):
        # README.docspec.md -> README.md
        return docspec_path.with_name(name[:-len(".docspec.md")] + ".md")
    return None


def list_changed_files(base_sha: str, merge_sha: str) -> List[str]:
    """List files changed in PR using three-dot diff: base...merge."""
    out = sh(["git", "diff", "--name-only", f"{base_sha}...{merge_sha}"])
    return [line for line in out.splitlines() if line]


def find_candidate_docspecs(repo_root: Path, changed_files: List[str]) -> List[Path]:
    """
    Find candidate docspec files to process.
    
    Strategy:
    1) If docspec files changed directly, include them.
    2) Also include docspecs that correspond to changed markdown files.
    """
    changed_set = set(changed_files)
    candidates: List[Path] = []

    # 1) Changed docspecs
    for f in changed_files:
        if RE_DOCSPEC.match(f):
            p = repo_root / f
            if p.exists():
                candidates.append(p)

    # 2) Docspecs that pair with changed .md (Option B: README.docspec.md)
    for f in changed_files:
        if f.endswith(".md") and not f.endswith(".docspec.md"):
            md_path = repo_root / f
            # Option B: README.docspec.md pairs with README.md
            docspec_path = md_path.with_suffix("").with_name(md_path.stem + ".docspec.md")
            if docspec_path.exists():
                candidates.append(docspec_path)

    # De-dupe while preserving order
    seen = set()
    uniq: List[Path] = []
    for p in candidates:
        rp = str(p.resolve())
        if rp not in seen:
            seen.add(rp)
            uniq.append(p)

    return uniq[:MAX_DOCSPECS]


def pr_diff_text(base_sha: str, merge_sha: str) -> str:
    """Get PR diff text, truncated if too long."""
    diff = sh(["git", "diff", f"{base_sha}...{merge_sha}"])
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[DIFF TRUNCATED]\n"
    return diff


def call_claude_for_patch(
    client: Anthropic, diff: str, docspec: str, md_path: str, md_text: str
) -> str:
    """Call Claude API to generate unified diff patch for markdown file."""
    system = (
        "You are a repo documentation maintenance tool.\n"
        "You must output ONLY a unified diff patch.\n"
        "Patch must modify ONLY the target markdown file path provided.\n"
        "If no change is needed, output an empty string.\n"
        "Never add new files. Never modify non-markdown files.\n"
    )

    user = f"""Merged PR diff (context):
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
Update the markdown to satisfy the docspec given the code changes in the diff.
If doc does not need changes, output empty.
Output ONLY a unified diff against the markdown file at path: {md_path}
"""

    msg = client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        max_tokens=4000,
        temperature=0,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    # anthropic python SDK returns content blocks
    text = "".join(block.text for block in msg.content if hasattr(block, "text"))
    return text.strip()


def apply_patch(patch: str) -> None:
    """Apply unified diff patch using git apply."""
    if not patch.strip():
        return
    # Safety: require unified diff markers
    if not (patch.startswith("diff --git") or patch.startswith("--- ")):
        raise RuntimeError("Claude output was not a unified diff.")
    p = subprocess.run(
        ["git", "apply", "--whitespace=fix", "-"], input=patch, text=True
    )
    if p.returncode != 0:
        raise RuntimeError("git apply failed.")


def main() -> None:
    """Main entry point."""
    repo = os.environ["REPO"]
    pr_number = os.environ["PR_NUMBER"]
    base_sha = os.environ["BASE_SHA"]
    merge_sha = os.environ["MERGE_SHA"]

    repo_root = Path(".").resolve()
    changed = list_changed_files(base_sha, merge_sha)
    diff = pr_diff_text(base_sha, merge_sha)

    docspec_paths = find_candidate_docspecs(repo_root, changed)
    if not docspec_paths:
        print("No relevant docspec files found.")
        return

    print(f"Found {len(docspec_paths)} docspec file(s) to process.")

    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    for docspec_path in docspec_paths:
        target_md = target_markdown_for_docspec(docspec_path)
        if not target_md or not target_md.exists():
            print(f"Skipping docspec without valid target: {docspec_path}")
            continue

        print(f"Processing {docspec_path} -> {target_md}")

        docspec = read_text(docspec_path)
        md_text = read_text(target_md)

        patch = call_claude_for_patch(
            client, diff, docspec, str(target_md), md_text
        )
        if not patch:
            print(f"No change needed for {target_md}")
            continue

        # Hard safety: patch must mention the file path
        if str(target_md) not in patch:
            raise RuntimeError(
                f"Patch did not reference expected path: {target_md}"
            )

        apply_patch(patch)
        print(f"Updated {target_md} via patch.")

    print("Done.")


if __name__ == "__main__":
    main()

