#!/usr/bin/env python3
"""
Simple script to discover docspec files and prepare a comprehensive prompt for github-ai-actions.

This script:
1. Discovers relevant *.docspec.md files based on PR changes
2. Reads each docspec and its target markdown file
3. Prepares a single comprehensive prompt that includes all docspecs
4. Outputs the prompt to stdout for use with github-ai-actions
"""

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import List, Optional

RE_DOCSPEC = re.compile(r".*\.docspec\.md$")
MAX_DOCSPECS = int(os.getenv("MAX_DOCSPECS", "10"))


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def sh(cmd: List[str]) -> str:
    """Run shell command and return stdout as string."""
    return subprocess.check_output(cmd, text=True).strip()


def list_changed_files(base_sha: str, merge_sha: str) -> List[str]:
    """List files changed in PR using three-dot diff: base...merge."""
    out = sh(["git", "diff", "--name-only", f"{base_sha}...{merge_sha}"])
    return [line for line in out.splitlines() if line]


def target_markdown_for_docspec(docspec_path: Path) -> Optional[Path]:
    """
    Map docspec file to target markdown file.
    
    Option B convention: README.docspec.md -> README.md
    """
    name = docspec_path.name
    if name.endswith(".docspec.md"):
        return docspec_path.with_name(name[:-len(".docspec.md")] + ".md")
    return None


def find_candidate_docspecs(repo_root: Path, changed_files: List[str]) -> List[Path]:
    """
    Find candidate docspec files to process.
    
    Strategy:
    1) If docspec files changed directly, include them.
    2) For each changed file, walk up the directory tree from its directory
       to repo root, looking for *.docspec.md files at each level.
    """
    candidates: List[Path] = []

    # 1) Directly changed docspecs
    for f in changed_files:
        if RE_DOCSPEC.match(f):
            p = repo_root / f
            if p.exists():
                candidates.append(p)

    # 2) For each changed file, walk up directory tree
    for f in changed_files:
        file_path = repo_root / f
        if not file_path.exists():
            continue
        
        current_dir = file_path.parent
        
        # Walk up to repo root
        while current_dir != repo_root.parent:
            # Look for docspecs in this directory
            for docspec_file in current_dir.glob("*.docspec.md"):
                if docspec_file not in candidates:
                    candidates.append(docspec_file)
            
            # Move to parent
            current_dir = current_dir.parent

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
    max_chars = int(os.getenv("MAX_DIFF_CHARS", "120000"))
    diff = sh(["git", "diff", f"{base_sha}...{merge_sha}"])
    if len(diff) > max_chars:
        diff = diff[:max_chars] + "\n\n[DIFF TRUNCATED]\n"
    return diff


def main() -> None:
    """Main entry point."""
    repo_root = Path(".").resolve()
    
    base_sha = os.environ["BASE_SHA"]
    merge_sha = os.environ["MERGE_SHA"]
    
    # Discover docspec files
    changed = list_changed_files(base_sha, merge_sha)
    diff = pr_diff_text(base_sha, merge_sha)
    docspec_paths = find_candidate_docspecs(repo_root, changed)
    
    if not docspec_paths:
        print("No relevant docspec files found.")
        sys.exit(0)
    
    # Build comprehensive prompt
    prompt_parts = [
        "Merged PR diff (context):",
        "<diff>",
        diff,
        "</diff>",
        "",
        "The following docspec files were discovered based on the PR changes. For each docspec, check if its target markdown file needs to be updated based on the code changes:",
        ""
    ]
    
    # Track if any docspecs were successfully added
    docspecs_added = 0
    
    for docspec_path in docspec_paths:
        target_md = target_markdown_for_docspec(docspec_path)
        if not target_md or not target_md.exists():
            continue
        
        docspec = read_text(docspec_path)
        md_text = read_text(target_md)
        
        prompt_parts.extend([
            f"## Docspec: {docspec_path.relative_to(repo_root)}",
            f"Target markdown: {target_md.relative_to(repo_root)}",
            "",
            "<docspec>",
            docspec,
            "</docspec>",
            "",
            "<markdown>",
            md_text,
            "</markdown>",
            "",
        ])
        docspecs_added += 1
    
    # If no docspecs were added (all had missing target markdown files), exit early
    if docspecs_added == 0:
        print("No relevant docspec files found with valid target markdown files.")
        sys.exit(0)
    
    prompt_parts.extend([
        "Task:",
        "1. Explore the repository using your available tools to understand the codebase context",
        "2. Understand how the code changes in the diff relate to each docspec's requirements",
        "3. For each markdown file listed above, check if it already satisfies its docspec given the code changes",
        "4. Only update markdown files if changes are actually necessary to satisfy their docspecs - avoid making unnecessary changes",
        "5. Use the Edit tool to modify markdown files directly if changes are needed",
        "6. Do not provide any text output - files are modified directly using tools",
    ])
    
    # Output the prompt
    prompt = "\n".join(prompt_parts)
    print(prompt)


if __name__ == "__main__":
    main()

