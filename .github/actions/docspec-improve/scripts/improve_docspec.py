#!/usr/bin/env python3
"""
Docspec improvement script for GitHub Actions.

Takes a markdown file, generates/overwrites its docspec,
uses Claude to plan improvements, and implements them.
"""

import os
import re
import subprocess
from pathlib import Path
from typing import Optional, Tuple


def sh(cmd: list[str]) -> str:
    """Run shell command and return stdout as string."""
    return subprocess.check_output(cmd, text=True).strip()


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    """Write file content as UTF-8."""
    path.write_text(content, encoding="utf-8")


def extract_unified_diffs(output: str, md_path: str, docspec_path: str) -> tuple[str, str]:
    """Extract two unified diffs from Claude output, matching them to files."""
    lines = output.splitlines()
    diffs: list[tuple[str, str]] = []  # (diff_content, file_path)
    current_diff: list[str] = []
    in_diff = False
    
    for line in lines:
        # Start of a new diff
        if line.startswith("diff --git") or (line.startswith("--- ") and not in_diff):
            if current_diff and in_diff:
                diff_content = "\n".join(current_diff).strip()
                # Try to identify which file this diff is for
                file_path = None
                for check_line in current_diff:
                    if md_path in check_line or Path(md_path).name in check_line:
                        file_path = md_path
                        break
                    elif docspec_path in check_line or Path(docspec_path).name in check_line:
                        file_path = docspec_path
                        break
                if file_path:
                    diffs.append((diff_content, file_path))
                current_diff = []
            in_diff = True
            current_diff.append(line)
        elif in_diff:
            # Continue collecting diff lines
            if line.strip() and (
                line.startswith(("diff ", "--- ", "+++ ", "@@", " ", "+", "-", "\\"))
            ):
                current_diff.append(line)
            else:
                # End of diff, but check if there's another one coming
                if line.strip() == "":
                    current_diff.append(line)
                else:
                    # Non-diff content, end current diff
                    if current_diff:
                        diff_content = "\n".join(current_diff).strip()
                        # Try to identify which file this diff is for
                        file_path = None
                        for check_line in current_diff:
                            if md_path in check_line or Path(md_path).name in check_line:
                                file_path = md_path
                                break
                            elif docspec_path in check_line or Path(docspec_path).name in check_line:
                                file_path = docspec_path
                                break
                        if file_path:
                            diffs.append((diff_content, file_path))
                        current_diff = []
                    in_diff = False
    
    # Add final diff if any
    if current_diff:
        diff_content = "\n".join(current_diff).strip()
        file_path = None
        for check_line in current_diff:
            if md_path in check_line or Path(md_path).name in check_line:
                file_path = md_path
                break
            elif docspec_path in check_line or Path(docspec_path).name in check_line:
                file_path = docspec_path
                break
        if file_path:
            diffs.append((diff_content, file_path))
    
    # Separate diffs by file
    md_diff = None
    docspec_diff = None
    
    for diff_content, file_path in diffs:
        if file_path == md_path:
            md_diff = diff_content
        elif file_path == docspec_path:
            docspec_diff = diff_content
    
    if md_diff is None or docspec_diff is None:
        raise RuntimeError(
            f"Could not identify both diffs. Found {len(diffs)} diff(s). "
            f"Markdown diff: {'found' if md_diff else 'missing'}, "
            f"Docspec diff: {'found' if docspec_diff else 'missing'}"
        )
    
    return md_diff, docspec_diff


def call_claude_cli_for_plan(
    md_path: str, md_text: str, docspec_path: str, docspec_text: str, repo_root: Path
) -> str:
    """Call Claude CLI in plan mode to generate improvement plan."""
    prompt = f"""Analyze the following markdown file and its docspec:

<markdown path="{md_path}">
{md_text}
</markdown>

<docspec path="{docspec_path}">
{docspec_text}
</docspec>

Task:
1. Review the markdown file for quality improvements (clarity, structure, completeness, best practices)
2. Review the docspec to ensure it accurately describes the markdown and follows docspec format requirements
3. Identify specific improvements needed for both files
4. Create a detailed plan for:
   - How to improve the markdown file
   - How to update the docspec to maintain the improved markdown

Output your plan in a clear, structured format."""
    
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
    
    cmd = ["claude", "-p", prompt, "--model", model, "--permission-mode", "plan"]
    print(f"Running Claude CLI in plan mode with model: {model}")
    print(f"Prompt length: {len(prompt)} characters")
    
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
    
    plan = result.stdout.strip()
    if not plan:
        raise RuntimeError("Claude plan mode returned empty output")
    
    return plan


def call_claude_cli_for_implementation(
    plan: str, md_path: str, md_text: str, docspec_path: str, docspec_text: str, repo_root: Path
) -> tuple[str, str]:
    """Call Claude CLI to implement the plan and generate unified diffs."""
    prompt = f"""Based on this improvement plan:
<plan>
{plan}
</plan>

Current markdown:
<markdown path="{md_path}">
{md_text}
</markdown>

Current docspec:
<docspec path="{docspec_path}">
{docspec_text}
</docspec>

Task:
1. Update the markdown file according to the plan
2. Update the docspec file to accurately reflect the improved markdown
3. Output TWO unified diffs:
   - First diff for {md_path}
   - Second diff for {docspec_path}

Format: Output the diffs one after another, each starting with "--- " or "diff --git"
Important: You must output ONLY unified diffs. No explanations, no other text.
Each diff must clearly reference its target file path."""
    
    env = os.environ.copy()
    if "ANTHROPIC_API_KEY" in os.environ:
        env["ANTHROPIC_API_KEY"] = os.environ["ANTHROPIC_API_KEY"]
    
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    
    cmd = ["claude", "-p", prompt, "--model", model]
    print(f"Running Claude CLI for implementation with model: {model}")
    print(f"Prompt length: {len(prompt)} characters")
    
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
    
    output = result.stdout.strip()
    return extract_unified_diffs(output, md_path, docspec_path)


def apply_patch(patch: str, expected_path: str) -> None:
    """Apply unified diff patch using git apply."""
    if not patch.strip():
        return
    
    # Safety: require unified diff markers
    if not (patch.startswith("diff --git") or patch.startswith("--- ")):
        raise RuntimeError("Claude output was not a unified diff.")
    
    # Verify patch mentions expected path
    if expected_path not in patch and Path(expected_path).name not in patch:
        raise RuntimeError(
            f"Patch did not reference expected path: {expected_path}"
        )
    
    p = subprocess.run(
        ["git", "apply", "--whitespace=fix", "-"], input=patch, text=True
    )
    if p.returncode != 0:
        raise RuntimeError(f"git apply failed for {expected_path}")


def validate_docspec(docspec_path: Path) -> None:
    """Validate the docspec file using docspec CLI."""
    try:
        result = subprocess.run(
            ["docspec", "validate", str(docspec_path)],
            text=True,
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"Docspec validation failed: {result.stderr or result.stdout}"
            )
        print(f"✅ Docspec validation passed: {docspec_path}")
    except FileNotFoundError:
        print(f"Warning: docspec CLI not found, skipping validation")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Docspec validation timed out")


def main() -> None:
    """Main entry point."""
    markdown_file = os.environ.get("MARKDOWN_FILE")
    if not markdown_file:
        raise RuntimeError("MARKDOWN_FILE environment variable is not set")
    
    repo_root = Path(".").resolve()
    md_path = repo_root / markdown_file
    
    if not md_path.exists():
        raise RuntimeError(f"Markdown file not found: {md_path}")
    
    # Determine docspec path (Option B convention: README.md -> README.docspec.md)
    docspec_path = md_path.with_suffix(".docspec.md")
    
    print(f"Processing markdown file: {md_path}")
    print(f"Docspec file: {docspec_path}")
    
    # Generate docspec if it doesn't exist or overwrite if it does
    print(f"Generating docspec file: {docspec_path}")
    try:
        subprocess.run(
            ["docspec", "generate", str(docspec_path)],
            check=True,
            text=True,
            capture_output=True,
        )
        print(f"✅ Generated docspec file: {docspec_path}")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Failed to generate docspec: {e.stderr or e.stdout}")
    except FileNotFoundError:
        raise RuntimeError(
            "docspec CLI not found. Please install with: npm install -g docspec"
        )
    
    # Read files
    md_text = read_text(md_path)
    docspec_text = read_text(docspec_path)
    
    # Plan phase
    print("\n📋 Planning improvements with Claude...")
    plan = call_claude_cli_for_plan(
        str(md_path.relative_to(repo_root)),
        md_text,
        str(docspec_path.relative_to(repo_root)),
        docspec_text,
        repo_root,
    )
    print("✅ Plan generated")
    print(f"\nPlan preview (first 500 chars):\n{plan[:500]}...\n")
    
    # Implementation phase
    print("\n🔧 Implementing plan with Claude...")
    md_diff, docspec_diff = call_claude_cli_for_implementation(
        plan,
        str(md_path.relative_to(repo_root)),
        md_text,
        str(docspec_path.relative_to(repo_root)),
        docspec_text,
        repo_root,
    )
    
    # Apply patches
    print(f"\n📝 Applying patch to {md_path.name}...")
    apply_patch(md_diff, str(md_path.relative_to(repo_root)))
    print(f"✅ Applied patch to {md_path.name}")
    
    print(f"\n📝 Applying patch to {docspec_path.name}...")
    apply_patch(docspec_diff, str(docspec_path.relative_to(repo_root)))
    print(f"✅ Applied patch to {docspec_path.name}")
    
    # Validate docspec
    print(f"\n✅ Validating updated docspec...")
    validate_docspec(docspec_path)
    
    print("\n✅ Done! Both files have been improved.")


if __name__ == "__main__":
    main()

