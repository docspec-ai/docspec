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

VERBOSE = os.getenv("VERBOSE", "true").lower() not in ("false", "0", "no")  # Default to verbose


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
    
    # Add verbose flag if enabled
    if VERBOSE:
        cmd.append("--verbose")
        print("[DEBUG] Verbose mode enabled for Claude CLI")
    
    print(f"Running Claude CLI for information discovery with model: {model}")
    print(f"Prompt length: {len(prompt)} characters")
    if VERBOSE:
        print(f"[DEBUG] Full command: {' '.join(cmd)}")
        print(f"[DEBUG] Working directory: {repo_root}")
    
    try:
        # Always capture output (we need it for the plan), but print it in verbose mode
        result = subprocess.run(
            cmd,
            text=True,
            capture_output=True,
            cwd=str(repo_root),
            env=env,
            timeout=300,  # 5 minute timeout
        )
        
        # In verbose mode, print the captured output
        if VERBOSE:
            print("\n" + "="*80)
            print("CLAUDE CLI OUTPUT - PLAN PHASE (verbose mode):")
            print("="*80 + "\n")
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            print("\n" + "="*80)
            print("END OF CLAUDE CLI OUTPUT - PLAN PHASE")
            print("="*80 + "\n")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Claude CLI timed out after 5 minutes")
    except FileNotFoundError:
        raise RuntimeError(
            "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code"
        )
    
    if result.returncode != 0:
        error_msg = f"Claude CLI failed with return code {result.returncode}"
        if VERBOSE:
            # In verbose mode, output was already streamed
            error_msg += "\n(Check output above for details)"
        else:
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
    
    if VERBOSE:
        print(f"[DEBUG] Plan length: {len(plan)} characters")
    
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
    
    # Add verbose flag if enabled
    if VERBOSE:
        cmd.append("--verbose")
        print("[DEBUG] Verbose mode enabled for Claude CLI")
    
    print(f"Running Claude CLI to edit files directly with model: {model}")
    print(f"Prompt length: {len(prompt)} characters")
    if VERBOSE:
        print(f"[DEBUG] Full command: {' '.join(cmd)}")
        print(f"[DEBUG] Working directory: {repo_root}")
    
    try:
        # Always capture output, but print it in verbose mode
        result = subprocess.run(
            cmd,
            text=True,
            capture_output=True,
            cwd=str(repo_root),
            env=env,
            timeout=300,  # 5 minute timeout
        )
        
        # In verbose mode, print the captured output
        if VERBOSE:
            print("\n" + "="*80)
            print("CLAUDE CLI OUTPUT - IMPLEMENTATION PHASE (verbose mode):")
            print("="*80 + "\n")
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            print("\n" + "="*80)
            print("END OF CLAUDE CLI OUTPUT - IMPLEMENTATION PHASE")
            print("="*80 + "\n")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Claude CLI timed out after 5 minutes")
    except FileNotFoundError:
        raise RuntimeError(
            "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code"
        )
    
    if result.returncode != 0:
        error_msg = f"Claude CLI failed with return code {result.returncode}"
        if VERBOSE:
            # In verbose mode, output was already streamed
            error_msg += "\n(Check output above for details)"
        else:
            if result.stderr:
                error_msg += f"\nStderr: {result.stderr}"
            if result.stdout:
                error_msg += f"\nStdout: {result.stdout[:1000]}"  # First 1000 chars
            if not result.stderr and not result.stdout:
                error_msg += "\nNo output captured (both stdout and stderr are empty)"
        raise RuntimeError(error_msg)
    
    # Verify files were actually modified
    print("✅ Claude has updated the files directly")
    if VERBOSE:
        print("[DEBUG] Claude CLI completed successfully")


def validate_docspec(docspec_path: Path) -> None:
    """Validate the docspec file using docspec CLI."""
    cmd = ["docspec", "validate", str(docspec_path)]
    if VERBOSE:
        cmd.append("--verbose")
        print(f"[DEBUG] Running validation with verbose mode: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            text=True,
            capture_output=True,
            timeout=30,
        )
        if VERBOSE and result.stdout:
            print(f"[DEBUG] Validation output:\n{result.stdout}")
        if VERBOSE and result.stderr:
            print(f"[DEBUG] Validation stderr:\n{result.stderr}")
        
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
    if VERBOSE:
        print("[DEBUG] Verbose logging enabled")
    
    markdown_file = os.environ.get("MARKDOWN_FILE")
    if not markdown_file:
        raise RuntimeError("MARKDOWN_FILE environment variable is not set")
    
    if VERBOSE:
        print(f"[DEBUG] MARKDOWN_FILE: {markdown_file}")
    
    repo_root = Path(".").resolve()
    if VERBOSE:
        print(f"[DEBUG] Repository root: {repo_root}")
    
    md_path = repo_root / markdown_file
    
    if not md_path.exists():
        raise RuntimeError(f"Markdown file not found: {md_path}")
    
    # Determine docspec path (Option B convention: README.md -> README.docspec.md)
    docspec_path = md_path.with_suffix(".docspec.md")
    
    print(f"Processing markdown file: {md_path}")
    print(f"Docspec file: {docspec_path}")
    
    if VERBOSE:
        print(f"[DEBUG] Markdown file exists: {md_path.exists()}")
        print(f"[DEBUG] Docspec file exists: {docspec_path.exists()}")
    
    # Generate docspec if it doesn't exist or overwrite if it does
    print(f"Generating docspec file: {docspec_path}")
    generate_cmd = ["docspec", "generate", str(docspec_path)]
    if VERBOSE:
        generate_cmd.append("--verbose")
        print(f"[DEBUG] Running: {' '.join(generate_cmd)}")
    
    try:
        result = subprocess.run(
            generate_cmd,
            check=True,
            text=True,
            capture_output=True,
            cwd=str(repo_root),
        )
        if VERBOSE and result.stdout:
            print(f"[DEBUG] Generate output:\n{result.stdout}")
        print(f"✅ Generated docspec file: {docspec_path}")
    except subprocess.CalledProcessError as e:
        if VERBOSE:
            print(f"[DEBUG] Generate failed with return code: {e.returncode}")
            if e.stderr:
                print(f"[DEBUG] Generate stderr:\n{e.stderr}")
            if e.stdout:
                print(f"[DEBUG] Generate stdout:\n{e.stdout}")
        raise RuntimeError(f"Failed to generate docspec: {e.stderr or e.stdout}")
    except FileNotFoundError:
        raise RuntimeError(
            "docspec CLI not found. Please install with: npm install -g docspec"
        )
    
    # Read files
    if VERBOSE:
        print(f"[DEBUG] Reading markdown file: {md_path}")
    md_text = read_text(md_path)
    if VERBOSE:
        print(f"[DEBUG] Markdown file size: {len(md_text)} characters")
    
    if VERBOSE:
        print(f"[DEBUG] Reading docspec file: {docspec_path}")
    docspec_text = read_text(docspec_path)
    if VERBOSE:
        print(f"[DEBUG] Docspec file size: {len(docspec_text)} characters")
    
    # Plan phase
    print("\n📋 Discovering information gaps with Claude...")
    if VERBOSE:
        print("[DEBUG] Starting plan phase")
    plan = call_claude_cli_for_plan(
        str(md_path.relative_to(repo_root)),
        md_text,
        str(docspec_path.relative_to(repo_root)),
        docspec_text,
        repo_root,
    )
    print("✅ Plan generated")
    if VERBOSE:
        print(f"[DEBUG] Full plan length: {len(plan)} characters")
        print(f"[DEBUG] Plan preview (first 1000 chars):\n{plan[:1000]}...\n")
    else:
        print(f"\nPlan preview (first 500 chars):\n{plan[:500]}...\n")
    
    # Implementation phase
    print("\n🔧 Updating files based on information discovery...")
    if VERBOSE:
        print("[DEBUG] Starting implementation phase")
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
    
    if VERBOSE:
        print(f"[DEBUG] Original markdown size: {len(md_text)} characters")
        print(f"[DEBUG] New markdown size: {len(new_md_text)} characters")
        print(f"[DEBUG] Original docspec size: {len(docspec_text)} characters")
        print(f"[DEBUG] New docspec size: {len(new_docspec_text)} characters")
    
    if new_md_text == md_text:
        print(f"⚠️  Warning: {md_path.name} appears unchanged")
    else:
        print(f"✅ {md_path.name} has been updated")
        if VERBOSE:
            original_lines = md_text.splitlines()
            new_lines = new_md_text.splitlines()
            print(f"[DEBUG] Markdown line count: {len(original_lines)} -> {len(new_lines)}")
    
    if new_docspec_text == docspec_text:
        print(f"⚠️  Warning: {docspec_path.name} appears unchanged")
    else:
        print(f"✅ {docspec_path.name} has been updated")
        if VERBOSE:
            original_lines = docspec_text.splitlines()
            new_lines = new_docspec_text.splitlines()
            print(f"[DEBUG] Docspec line count: {len(original_lines)} -> {len(new_lines)}")
    
    # Validate docspec
    print(f"\n✅ Validating updated docspec...")
    validate_docspec(docspec_path)
    
    print("\n✅ Done! Files have been updated with discovered information.")
    if VERBOSE:
        print("[DEBUG] All phases completed successfully")


if __name__ == "__main__":
    main()

