"""
Pytest fixtures for testing docspec prompt preparation scripts.
"""

import json
import os
import subprocess
from pathlib import Path
from typing import Dict, Generator
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def temp_dir(tmp_path: Path) -> Path:
    """Create a temporary directory for test files."""
    return tmp_path


@pytest.fixture
def repo_root(temp_dir: Path) -> Path:
    """Create a mock repository root directory."""
    repo = temp_dir / "repo"
    repo.mkdir()
    return repo


@pytest.fixture
def mock_git_output(monkeypatch):
    """Mock git command output."""
    def _mock_git(cmd_outputs: Dict[str, str]):
        """Create a mock for subprocess.check_output that returns different outputs based on command."""
        def mock_check_output(cmd, *args, **kwargs):
            cmd_str = " ".join(cmd)
            for pattern, output in cmd_outputs.items():
                if pattern in cmd_str:
                    return output.encode() if isinstance(output, str) else output
            # Default: return empty output
            return b""
        
        monkeypatch.setattr(subprocess, "check_output", mock_check_output)
    
    return _mock_git


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Mock environment variables."""
    def _set_env(**kwargs):
        for key, value in kwargs.items():
            monkeypatch.setenv(key, value)
    
    return _set_env


@pytest.fixture
def sample_docspec_content() -> str:
    """Sample docspec file content."""
    return """# DOCSPEC: README.md

> A specification for the README.md file.

## AGENT INSTRUCTIONS

When updating this file, follow these guidelines.

## 1. Document Purpose

This README provides an overview of the project.

## 2. Update Triggers

- When new features are added
- When API changes occur

## 3. Content Structure

- Introduction
- Installation
- Usage

## 4. Writing Guidelines

Use clear, concise language.

## 5. Examples

Include code examples where appropriate.
"""


@pytest.fixture
def sample_markdown_content() -> str:
    """Sample markdown file content."""
    return r"""# Project Name

This is a sample project.

## Installation

```bash
npm install
```

## Usage

```javascript
const example = require('example');
```
"""


@pytest.fixture
def create_docspec_file(repo_root: Path):
    """Helper to create a docspec file."""
    def _create(path: str, content: str) -> Path:
        file_path = repo_root / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        return file_path
    
    return _create


@pytest.fixture
def create_markdown_file(repo_root: Path):
    """Helper to create a markdown file."""
    def _create(path: str, content: str) -> Path:
        file_path = repo_root / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content, encoding="utf-8")
        return file_path
    
    return _create


@pytest.fixture
def change_working_dir(monkeypatch):
    """Change the current working directory for a test."""
    def _change_dir(path: Path):
        monkeypatch.chdir(path)
    
    return _change_dir

