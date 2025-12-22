#!/usr/bin/env python3
"""
Docspec generate script for GitHub Actions.

Takes a markdown file, generates/overwrites its docspec,
uses Claude to discover missing or irrelevant information,
and updates only the content of sections 1-5 (preserving structure).
"""

import os
import subprocess
import importlib.util
from pathlib import Path
from string import Template

# Load shared library module explicitly
_shared_path = Path(__file__).parent.parent.parent / "_shared" / "claude_utils.py"
spec = importlib.util.spec_from_file_location("claude_utils", _shared_path)
claude_utils = importlib.util.module_from_spec(spec)
spec.loader.exec_module(claude_utils)

VERBOSE = claude_utils.VERBOSE
read_text = claude_utils.read_text
run_claude_cli = claude_utils.run_claude_cli


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
    
    # Use shared Claude CLI utility (without permission mode for plan phase)
    result = run_claude_cli(
        prompt=prompt,
        repo_root=repo_root,
        permission_mode=None,
        output_label="CLAUDE CLI OUTPUT - PLAN PHASE",
    )
    
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
    
    # Use shared Claude CLI utility (with permission mode for implementation phase)
    run_claude_cli(
        prompt=prompt,
        repo_root=repo_root,
        output_label="CLAUDE CLI OUTPUT - IMPLEMENTATION PHASE",
    )
    
    # Verify files were actually modified
    print("✅ Claude has updated the files directly")


def validate_docspec(docspec_path: Path) -> None:
    """Validate the docspec file using docspec CLI."""
    cmd = ["docspec"]
    if VERBOSE:
        cmd.append("--verbose")
    cmd.extend(["validate", str(docspec_path)])
    if VERBOSE:
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
    generate_cmd = ["docspec"]
    if VERBOSE:
        generate_cmd.append("--verbose")
    generate_cmd.extend(["generate", str(docspec_path)])
    if VERBOSE:
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

