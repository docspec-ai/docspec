#!/usr/bin/env python3
"""
Shared utilities for Claude CLI operations.

Common functions used by docspec-check and docspec-generate scripts.
"""

import os
import subprocess
from pathlib import Path
from typing import List, Optional

VERBOSE = os.getenv("VERBOSE", "true").lower() not in ("false", "0", "no")  # Default to verbose


def _format_cmd_for_logging(cmd: List[str]) -> str:
    """Format command for logging, replacing large prompt arguments with summaries."""
    formatted = []
    i = 0
    while i < len(cmd):
        # Check if this is a prompt argument (-p followed by prompt)
        if cmd[i] == "-p" and i + 1 < len(cmd):
            prompt = cmd[i + 1]
            formatted.append("-p")
            formatted.append(f"[PROMPT: {len(prompt)} chars]")
            i += 2
        else:
            formatted.append(cmd[i])
            i += 1
    return " ".join(formatted)


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def verify_claude_cli() -> None:
    """Verify Claude CLI is installed and accessible."""
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


def check_api_key(env: dict) -> None:
    """Validate ANTHROPIC_API_KEY is set."""
    if "ANTHROPIC_API_KEY" not in env or not env["ANTHROPIC_API_KEY"]:
        raise RuntimeError(
            "ANTHROPIC_API_KEY environment variable is not set or is empty"
        )


def build_claude_cmd(
    prompt: str,
    model: str,
    tools: str = "default",
    permission_mode: Optional[str] = "acceptEdits",
) -> List[str]:
    """Build Claude CLI command with specified options."""
    cmd = [
        "claude", "-p", prompt,
        "--model", model,
        "--tools", tools,
        "--no-session-persistence",  # Don't save sessions in automated scripts
    ]
    
    if permission_mode:
        cmd.extend(["--permission-mode", permission_mode])
    
    # Add verbose flag if enabled
    if VERBOSE:
        cmd.append("--verbose")
    
    return cmd


def run_claude_cli(
    prompt: str,
    repo_root: Path,
    model: Optional[str] = None,
    tools: str = "default",
    permission_mode: Optional[str] = "acceptEdits",
    timeout: int = 300,
    output_label: str = "CLAUDE CLI OUTPUT",
) -> subprocess.CompletedProcess:
    """
    Execute Claude CLI with consistent error handling and verbose output.
    
    Args:
        prompt: The prompt to send to Claude
        repo_root: Repository root directory for working directory
        model: Model to use (defaults to claude-sonnet-4-5)
        tools: Tools to enable (defaults to "default")
        permission_mode: Permission mode (defaults to "acceptEdits", pass None to disable)
        timeout: Timeout in seconds (defaults to 300)
        output_label: Label for verbose output (defaults to "CLAUDE CLI OUTPUT")
    
    Returns:
        CompletedProcess from subprocess.run
    
    Raises:
        RuntimeError: If CLI is not found, API key is missing, or execution fails
    """
    # Prepare environment
    env = os.environ.copy()
    if "ANTHROPIC_API_KEY" in os.environ:
        env["ANTHROPIC_API_KEY"] = os.environ["ANTHROPIC_API_KEY"]
    
    # Get model
    if model is None:
        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    
    # Verify CLI is available
    verify_claude_cli()
    
    # Check API key
    check_api_key(env)
    
    # Build command
    cmd = build_claude_cmd(prompt, model, tools, permission_mode)
    
    # Log execution
    if permission_mode:
        print(f"Running Claude CLI to edit files directly with model: {model}")
    else:
        print(f"Running Claude CLI with model: {model}")
    print(f"Prompt length: {len(prompt)} characters")
    if VERBOSE:
        print("[DEBUG] Verbose mode enabled for Claude CLI")
        print(f"[DEBUG] Full command: {_format_cmd_for_logging(cmd)}")
        print(f"[DEBUG] Working directory: {repo_root}")
    
    # Execute
    try:
        result = subprocess.run(
            cmd,
            text=True,
            capture_output=True,
            cwd=str(repo_root),
            env=env,
            timeout=timeout,
        )
        
        # In verbose mode, print the captured output
        if VERBOSE:
            print("\n" + "="*80)
            print(f"{output_label} (verbose mode):")
            print("="*80 + "\n")
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)
            print("\n" + "="*80)
            print(f"END OF {output_label}")
            print("="*80 + "\n")
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Claude CLI timed out after {timeout} seconds")
    except FileNotFoundError:
        raise RuntimeError(
            "Claude CLI not found. Please install with: npm install -g @anthropic-ai/claude-code"
        )
    
    # Check result
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
    
    if VERBOSE:
        print("[DEBUG] Claude CLI completed successfully")
    
    return result

