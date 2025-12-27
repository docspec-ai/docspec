#!/usr/bin/env python3
"""
Shared utilities for prompt file I/O operations.
"""

from pathlib import Path


def write_prompt_file(path: Path, content: str) -> None:
    """
    Write prompt content to a file with validation.
    
    Args:
        path: File path to write to
        content: Prompt content to write
        
    Raises:
        ValueError: If content is empty or only whitespace
        IOError: If file cannot be written
    """
    if not content or not content.strip():
        raise ValueError("Prompt content cannot be empty or only whitespace")
    
    # Ensure parent directory exists
    path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write content
    path.write_text(content, encoding="utf-8")

