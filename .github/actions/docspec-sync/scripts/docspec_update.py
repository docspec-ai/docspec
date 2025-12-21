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

RE_DOCSPEC = re.compile(r".*\.docspec\.md$")

MAX_DOCSPECS = int(os.getenv("MAX_DOCSPECS", "10"))
MAX_DIFF_CHARS = int(os.getenv("MAX_DIFF_CHARS", "120000"))  # guardrail


def sh(cmd: List[str]) -> str:
    """Run shell command and return stdout as string."""
    return subprocess.check_output(cmd, text=True).strip()


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def load_template(template_name: str, **kwargs) -> str:
    """Load template file and format with variables."""
    template_path = Path(__file__).parent.parent / "templates" / template_name
    template_text = read_text(template_path)
    return template_text.format(**kwargs)


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


def extract_unified_diff(output: str) -> str:
    """Extract unified diff from Claude CLI output."""
    # Look for unified diff markers
    lines = output.splitlines()
    diff_start = None
    diff_end = len(lines)
    
    # Find start of diff (either "diff --git" or "--- ")
    for i, line in enumerate(lines):
        if line.startswith("diff --git") or line.startswith("--- "):
            diff_start = i
            break
    
    if diff_start is None:
        # No diff markers found, return empty or try to find diff-like content
        # Look for lines that look like diff hunks
        for i, line in enumerate(lines):
            if line.startswith("@@"):
                diff_start = max(0, i - 1)  # Include the --- line before, but guard against negative index
                break
    
    if diff_start is None:
        return ""
    
    # Extract from diff_start to end, but remove trailing non-diff content
    diff_lines = lines[diff_start:]
    # Find the last diff line to exclude trailing non-diff content
    diff_end = len(diff_lines)
    for i in range(len(diff_lines) - 1, -1, -1):
        if diff_lines[i].strip() and (
            diff_lines[i].startswith(("diff ", "--- ", "+++ ", "@@", " ", "+", "-", "\\"))
        ):
            diff_end = i + 1
            break
    
    return "\n".join(diff_lines[:diff_end]).strip()


def call_claude_cli_for_patch(
    diff: str, docspec: str, md_path: str, md_text: str, repo_root: Path
) -> str:
    """Call Claude Code CLI to generate unified diff patch."""
    prompt = load_template(
        "patch-prompt.md",
        diff=diff,
        docspec=docspec,
        md_path=md_path,
        md_text=md_text,
    )
    
    # Call claude CLI
    env = os.environ.copy()
    if "ANTHROPIC_API_KEY" in os.environ:
        env["ANTHROPIC_API_KEY"] = os.environ["ANTHROPIC_API_KEY"]
    
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    
    # Verify CLI is available
    try:
        claude_check = subprocess.run(
            ["claude", "--version"],
            text=True,
            capture_output=True,
            timeout=10,
        )
        if claude_check.returncode != 0:
            print(f"Warning: 'claude --version' failed: {claude_check.stderr}")
    except FileNotFoundError:
        raise RuntimeError(
            "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code"
        )
    except Exception as e:
        print(f"Warning: Could not verify Claude CLI: {e}")
    
    # Check API key
    if "ANTHROPIC_API_KEY" not in env or not env["ANTHROPIC_API_KEY"]:
        raise RuntimeError(
            "ANTHROPIC_API_KEY environment variable is not set or is empty"
        )
    
    cmd = ["claude", "-p", prompt, "--model", model]
    print(f"Running Claude CLI with model: {model}")
    print(f"Prompt length: {len(prompt)} characters")
    print(f"Command: claude -p [prompt] --model {model}")
    
    try:
        result = subprocess.run(
            cmd,
            text=True,
            capture_output=True,
            cwd=str(repo_root),
            env=env,
            timeout=300,  # 5 minute timeout
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("Claude CLI timed out after 5 minutes")
    except FileNotFoundError:
        raise RuntimeError(
            "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code"
        )
    
    if result.returncode != 0:
        error_msg = f"Claude CLI failed with return code {result.returncode}"
        if result.stderr:
            error_msg += f"\nStderr: {result.stderr}"
        if result.stdout:
            error_msg += f"\nStdout: {result.stdout[:1000]}"  # First 1000 chars
        if not result.stderr and not result.stdout:
            error_msg += "\nNo output captured (both stdout and stderr are empty)"
        raise RuntimeError(error_msg)
    
    # Extract unified diff from output
    output = result.stdout.strip()
    return extract_unified_diff(output)


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

    for docspec_path in docspec_paths:
        target_md = target_markdown_for_docspec(docspec_path)
        if not target_md or not target_md.exists():
            print(f"Skipping docspec without valid target: {docspec_path}")
            continue

        print(f"Processing {docspec_path} -> {target_md}")

        docspec = read_text(docspec_path)
        md_text = read_text(target_md)

        patch = call_claude_cli_for_patch(
            diff, docspec, str(target_md), md_text, repo_root
        )
        if not patch:
            print(f"No change needed for {target_md}")
            continue

        # Hard safety: patch must mention the file path
        # Unified diffs use relative paths, so check for relative path and common formats
        target_relative = str(target_md.relative_to(repo_root))
        target_filename = target_md.name
        # Check for relative path, filename, and common git diff path formats (a/... and b/...)
        path_found = (
            target_relative in patch
            or target_filename in patch
            or f"a/{target_relative}" in patch
            or f"b/{target_relative}" in patch
        )
        if not path_found:
            raise RuntimeError(
                f"Patch did not reference expected path: {target_relative} (or {target_filename})"
            )

        apply_patch(patch)
        print(f"Updated {target_md} via patch.")

    print("Done.")


if __name__ == "__main__":
    main()

