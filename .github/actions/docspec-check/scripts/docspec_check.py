#!/usr/bin/env python3
"""
Docspec check script for GitHub Actions.

Discovers relevant *.docspec.md files based on PR changes,
calls Claude API to update markdown files directly.
"""

import os
import re
import subprocess
import sys
import importlib.util
from pathlib import Path
from string import Template
from typing import List, Optional

# Load shared library module explicitly
_shared_path = Path(__file__).parent.parent.parent / "_shared" / "claude_utils.py"
spec = importlib.util.spec_from_file_location("claude_utils", _shared_path)
claude_utils = importlib.util.module_from_spec(spec)
spec.loader.exec_module(claude_utils)

VERBOSE = claude_utils.VERBOSE
read_text = claude_utils.read_text
run_claude_cli = claude_utils.run_claude_cli

RE_DOCSPEC = re.compile(r".*\.docspec\.md$")

MAX_DOCSPECS = int(os.getenv("MAX_DOCSPECS", "10"))
MAX_DIFF_CHARS = int(os.getenv("MAX_DIFF_CHARS", "120000"))  # guardrail


def sh(cmd: List[str]) -> str:
    """Run shell command and return stdout as string."""
    if VERBOSE:
        print(f"[DEBUG] Running command: {' '.join(cmd)}")
    return subprocess.check_output(cmd, text=True).strip()


def load_template(template_name: str, **kwargs) -> str:
    """Load template file and format with variables using string.Template.
    
    Safely handles content with curly braces since Template uses $ syntax.
    """
    template_path = Path(__file__).parent.parent / "templates" / template_name
    template_text = read_text(template_path)
    
    template = Template(template_text)
    return template.safe_substitute(**kwargs)


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
    diff = sh(["git", "diff", f"{base_sha}...{merge_sha}"])
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[DIFF TRUNCATED]\n"
    return diff


def call_claude_cli_for_patch(
    diff: str, docspec: str, md_path: str, md_text: str, docspec_path: str, repo_root: Path
) -> None:
    """Call Claude Code CLI to update markdown file directly."""
    prompt = load_template(
        "patch-prompt.md",
        diff=diff,
        docspec=docspec,
        md_path=md_path,
        md_text=md_text,
        docspec_path=docspec_path,
    )
    
    # Use shared Claude CLI utility
    run_claude_cli(
        prompt=prompt,
        repo_root=repo_root,
        output_label="CLAUDE CLI OUTPUT",
    )
    
    # Verify file was actually modified
    print("✅ Claude has updated the file directly")


def main() -> None:
    """Main entry point."""
    if VERBOSE:
        print("[DEBUG] Verbose logging enabled")
        print(f"[DEBUG] MAX_DOCSPECS: {MAX_DOCSPECS}")
        print(f"[DEBUG] MAX_DIFF_CHARS: {MAX_DIFF_CHARS}")
    
    repo = os.environ["REPO"]
    pr_number = os.environ["PR_NUMBER"]
    base_sha = os.environ["BASE_SHA"]
    merge_sha = os.environ["MERGE_SHA"]
    
    if VERBOSE:
        print(f"[DEBUG] Repo: {repo}")
        print(f"[DEBUG] PR number: {pr_number}")
        print(f"[DEBUG] Base SHA: {base_sha}")
        print(f"[DEBUG] Merge SHA: {merge_sha}")

    repo_root = Path(".").resolve()
    if VERBOSE:
        print(f"[DEBUG] Repository root: {repo_root}")
    
    changed = list_changed_files(base_sha, merge_sha)
    if VERBOSE:
        print(f"[DEBUG] Changed files ({len(changed)}): {', '.join(changed[:10])}{'...' if len(changed) > 10 else ''}")
    
    diff = pr_diff_text(base_sha, merge_sha)
    if VERBOSE:
        print(f"[DEBUG] PR diff length: {len(diff)} characters")

    docspec_paths = find_candidate_docspecs(repo_root, changed)
    if not docspec_paths:
        print("No relevant docspec files found.")
        return

    print(f"Found {len(docspec_paths)} docspec file(s) to process.")
    if VERBOSE:
        for i, path in enumerate(docspec_paths, 1):
            print(f"[DEBUG]   {i}. {path}")

    for docspec_path in docspec_paths:
        target_md = target_markdown_for_docspec(docspec_path)
        if not target_md or not target_md.exists():
            print(f"Skipping docspec without valid target: {docspec_path}")
            if VERBOSE:
                print(f"[DEBUG] Target markdown would be: {target_md}")
            continue

        print(f"Processing {docspec_path} -> {target_md}")
        
        if VERBOSE:
            print(f"[DEBUG] Reading docspec file: {docspec_path}")
        docspec = read_text(docspec_path)
        if VERBOSE:
            print(f"[DEBUG] Docspec file size: {len(docspec)} characters")
        
        if VERBOSE:
            print(f"[DEBUG] Reading target markdown file: {target_md}")
        md_text = read_text(target_md)
        if VERBOSE:
            print(f"[DEBUG] Markdown file size: {len(md_text)} characters")

        # Store original content to check if file was modified
        original_md_text = md_text

        call_claude_cli_for_patch(
            diff, docspec, str(target_md), md_text, str(docspec_path.relative_to(repo_root)), repo_root
        )
        
        # Check if file was actually modified
        if not target_md.exists():
            raise RuntimeError(f"Markdown file was deleted: {target_md}")
        
        new_md_text = read_text(target_md)
        if VERBOSE:
            print(f"[DEBUG] New markdown file size: {len(new_md_text)} characters")
            print(f"[DEBUG] File changed: {new_md_text != original_md_text}")
        
        if new_md_text == original_md_text:
            print(f"No change needed for {target_md}")
            continue
        
        print(f"Updated {target_md}.")
        if VERBOSE:
            # Show a diff summary
            original_lines = original_md_text.splitlines()
            new_lines = new_md_text.splitlines()
            print(f"[DEBUG] Line count: {len(original_lines)} -> {len(new_lines)}")

    print("Done.")


if __name__ == "__main__":
    main()

