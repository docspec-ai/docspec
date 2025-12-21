#!/usr/bin/env python3
"""
Docspec information discovery script for GitHub Actions.

Takes a markdown file, generates/overwrites its docspec,
uses Claude to discover missing or irrelevant information,
and updates only the content of sections 1-5 (preserving structure).
"""

import os
import subprocess
from pathlib import Path


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def call_claude_cli_for_plan(
    md_path: str, md_text: str, docspec_path: str, docspec_text: str, repo_root: Path
) -> str:
    """Call Claude CLI to generate an information discovery plan."""
    prompt = f"""You are analyzing a markdown file and its docspec to discover missing or irrelevant information. Do not ask questions - create the plan directly.

<markdown path="{md_path}">
{md_text}
</markdown>

<docspec path="{docspec_path}">
{docspec_text}
</docspec>

Task: Focus on INFORMATION DISCOVERY. Use all of your available tools to explore the repository and understand what actually exists, then analyze both files and create a plan that identifies:

1. **Missing information in the docspec**: What important details about the markdown file are not captured in sections 1-5?
   - What does the markdown actually contain that isn't mentioned in the docspec?
   - What should trigger updates that isn't currently listed?
   - What structure/guidelines are missing?

2. **Irrelevant or incorrect information in the docspec**: What's in the docspec that doesn't match reality?
   - Does the docspec describe things that aren't actually in the markdown?
   - Are there update triggers that don't make sense?
   - Are there structure requirements that don't match the actual document?

3. **Missing information in the markdown**: What should be documented but isn't?
   - Are there important details missing?
   - Are there sections that should exist but don't?

IMPORTANT: The docspec structure must be preserved:
- Keep the header format: `# DOCSPEC: [filename]`
- Keep the one-line description
- Keep the `## AGENT INSTRUCTIONS` section exactly as-is
- Keep section headers: `## 1. Document Purpose`, `## 2. Update Triggers`, etc.
- ONLY update the CONTENT within sections 1-5, not the headers or structure

Output your plan in a clear, structured format focusing on information gaps and corrections."""
    
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
    
    # Use regular mode with exploration tools for information discovery
    cmd = [
        "claude", "-p", prompt, 
        "--model", model,
        "--tools", "Read,Glob,Grep"
    ]
    print(f"Running Claude CLI for information discovery with model: {model}")
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
) -> None:
    """Call Claude CLI to implement the plan by directly editing both files."""
    prompt = f"""Based on this information discovery plan:
<plan>
{plan}
</plan>

You need to update two files:
1. {md_path} - the markdown file
2. {docspec_path} - the docspec file

CRITICAL CONSTRAINTS FOR DOCSPEC FILE - YOU MUST PRESERVE THE EXACT STRUCTURE:

1. Read the existing {docspec_path} file FIRST using the Read tool
2. PRESERVE EXACTLY:
   - Any frontmatter (--- at the top) if it exists
   - The exact header format (e.g., `# DOCSPEC: Readme` or `# DOCSPEC: [README.md](/README.md)`) - keep it EXACTLY as written
   - The exact one-line description format (e.g., `> Short phrase: *...*` or `> One line: ...`) - keep it EXACTLY as written
   - Any separator lines (---) between sections - keep them EXACTLY as they are
   - The `## AGENT INSTRUCTIONS` section if it exists - keep it EXACTLY as-is, do not modify
   - The EXACT section header names and numbers (e.g., `## 1. Purpose of This Document` or `## 1. Document Purpose`) - keep them EXACTLY as written
   - The order of sections - do not reorder them

3. ONLY update the CONTENT within sections 1-5 (the text below each section header)
   - Do NOT change section header text, numbers, or names
   - Do NOT change the format of headers
   - Do NOT add or remove separator lines
   - Do NOT modify frontmatter, title, description, or AGENT INSTRUCTIONS

Task:
1. Use Read tool to read {docspec_path} and note its EXACT structure (frontmatter, header format, section names, separators)
2. Use Read tool to read {md_path}
3. Use Read, Glob, and Grep tools to explore the repository and discover information about:
   - What the codebase actually contains
   - What files exist that relate to the markdown
   - What the actual structure and content of the markdown is
4. For {docspec_path}: Update ONLY the content text within sections 1-5. Preserve ALL structure, headers, format, and separators exactly as they were.
5. For {md_path}: Add any missing information identified in the plan
6. Use the Edit tool to make changes directly to the files

IMPORTANT: When editing {docspec_path}, match the existing file's structure exactly. If it has frontmatter, keep it. If section headers say "Purpose of This Document", keep that exact text. Only change the content paragraphs below the headers."""
    
    env = os.environ.copy()
    if "ANTHROPIC_API_KEY" in os.environ:
        env["ANTHROPIC_API_KEY"] = os.environ["ANTHROPIC_API_KEY"]
    
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    
    # Use Edit, Read, Glob, and Grep tools for information discovery and editing
    cmd = [
        "claude", "-p", prompt, 
        "--model", model,
        "--tools", "Edit,Read,Glob,Grep",
        "--permission-mode", "acceptEdits"
    ]
    print(f"Running Claude CLI to edit files directly with model: {model}")
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
    
    # Verify files were actually modified
    print("✅ Claude has updated the files directly")


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
            cwd=str(repo_root),
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
    print("\n📋 Discovering information gaps with Claude...")
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
    print("\n🔧 Updating files based on information discovery...")
    call_claude_cli_for_implementation(
        plan,
        str(md_path.relative_to(repo_root)),
        md_text,
        str(docspec_path.relative_to(repo_root)),
        docspec_text,
        repo_root,
    )
    
    # Verify files were changed
    print(f"\n📝 Verifying changes to {md_path.name} and {docspec_path.name}...")
    if not md_path.exists():
        raise RuntimeError(f"Markdown file was deleted: {md_path}")
    if not docspec_path.exists():
        raise RuntimeError(f"Docspec file was deleted: {docspec_path}")
    
    new_md_text = read_text(md_path)
    new_docspec_text = read_text(docspec_path)
    
    if new_md_text == md_text:
        print(f"⚠️  Warning: {md_path.name} appears unchanged")
    else:
        print(f"✅ {md_path.name} has been updated")
    
    if new_docspec_text == docspec_text:
        print(f"⚠️  Warning: {docspec_path.name} appears unchanged")
    else:
        print(f"✅ {docspec_path.name} has been updated")
    
    # Validate docspec
    print(f"\n✅ Validating updated docspec...")
    validate_docspec(docspec_path)
    
    print("\n✅ Done! Files have been updated with discovered information.")


if __name__ == "__main__":
    main()

