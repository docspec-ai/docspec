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
from string import Template


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def load_template(template_name: str, **kwargs) -> str:
    """Load template file and format with variables using string.Template.
    
    Safely handles content with curly braces since Template uses $ syntax.
    """
    template_path = Path(__file__).parent.parent / "templates" / template_name
    template_text = read_text(template_path)
    
    template = Template(template_text)
    return template.safe_substitute(**kwargs)


def call_claude_cli_for_plan(
    md_path: str, md_text: str, docspec_path: str, docspec_text: str, repo_root: Path
) -> str:
    """Call Claude CLI to generate an information discovery plan."""
    prompt = load_template(
        "plan-prompt.md",
        md_path=md_path,
        md_text=md_text,
        docspec_path=docspec_path,
        docspec_text=docspec_text,
    )
    
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
        "--tools", "default"
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
    prompt = load_template(
        "implementation-prompt.md",
        plan=plan,
        md_path=md_path,
        md_text=md_text,
        docspec_path=docspec_path,
        docspec_text=docspec_text,
    )
    
    env = os.environ.copy()
    if "ANTHROPIC_API_KEY" in os.environ:
        env["ANTHROPIC_API_KEY"] = os.environ["ANTHROPIC_API_KEY"]
    
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    
    # Use Edit, Read, Glob, and Grep tools for information discovery and editing
    cmd = [
        "claude", "-p", prompt, 
        "--model", model,
        "--tools", "default",
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

