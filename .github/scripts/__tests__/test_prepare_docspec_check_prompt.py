"""
Tests for prepare-docspec-check-prompt.py
"""

import importlib
import importlib.util
import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add parent directory to Python path so prompt_utils can be imported
scripts_dir = Path(__file__).parent.parent
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

# Load the script as a module
script_path = scripts_dir / "prepare-docspec-check-prompt.py"
spec = importlib.util.spec_from_file_location("check_script", script_path)
check_script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check_script)


def mock_git_sh(mock_sh, changed_files="", diff_content=""):
    """Helper to mock git commands."""
    def mock_git_cmd(cmd, *args, **kwargs):
        cmd_str = " ".join(cmd)
        if "git diff --name-only" in cmd_str:
            return changed_files
        elif "git diff" in cmd_str:
            return diff_content
        return ""
    
    mock_sh.side_effect = mock_git_cmd


@patch.object(check_script, 'sh')
def test_no_docspecs_found(mock_sh, temp_dir, repo_root, mock_env_vars, change_working_dir):
    """Test that script exits gracefully when no docspecs are found."""
    change_working_dir(repo_root)
    
    mock_git_sh(mock_sh, changed_files="", diff_content="")
    
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    with pytest.raises(SystemExit) as exc_info:
        check_script.main()
    
    assert exc_info.value.code == 0
    assert not (repo_root / "prompt.txt").exists()


@patch.object(check_script, 'sh')
def test_docspec_discovery_direct_change(
    mock_sh, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_docspec_file, create_markdown_file, sample_docspec_content, sample_markdown_content
):
    """Test that directly changed docspec files are discovered."""
    change_working_dir(repo_root)
    
    create_docspec_file("README.docspec.md", sample_docspec_content)
    create_markdown_file("README.md", sample_markdown_content)
    
    mock_git_sh(mock_sh, changed_files="README.docspec.md", diff_content="diff content")
    
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    check_script.main()
    
    assert (repo_root / "prompt.txt").exists()
    prompt_content = (repo_root / "prompt.txt").read_text()
    assert "README.docspec.md" in prompt_content
    assert "README.md" in prompt_content
    assert sample_docspec_content in prompt_content
    assert sample_markdown_content in prompt_content


@patch.object(check_script, 'sh')
def test_docspec_discovery_directory_walk(
    mock_sh, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_docspec_file, create_markdown_file, sample_docspec_content, sample_markdown_content
):
    """Test that docspecs are discovered by walking up directory tree."""
    change_working_dir(repo_root)
    
    subdir = repo_root / "src" / "components"
    subdir.mkdir(parents=True)
    
    create_docspec_file("README.docspec.md", sample_docspec_content)
    create_markdown_file("README.md", sample_markdown_content)
    (subdir / "component.ts").write_text("export const Component = {};")
    
    mock_git_sh(mock_sh, changed_files="src/components/component.ts", diff_content="diff content")
    
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    check_script.main()
    
    assert (repo_root / "prompt.txt").exists()
    prompt_content = (repo_root / "prompt.txt").read_text()
    assert "README.docspec.md" in prompt_content


@patch.object(check_script, 'sh')
def test_missing_target_markdown(
    mock_sh, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_docspec_file, sample_docspec_content
):
    """Test that docspecs without target markdown files are skipped."""
    change_working_dir(repo_root)
    
    create_docspec_file("README.docspec.md", sample_docspec_content)
    
    mock_git_sh(mock_sh, changed_files="README.docspec.md", diff_content="diff content")
    
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    with pytest.raises(SystemExit) as exc_info:
        check_script.main()
    
    assert exc_info.value.code == 0
    assert not (repo_root / "prompt.txt").exists()


@patch.object(check_script, 'sh')
def test_prompt_includes_diff(
    mock_sh, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_docspec_file, create_markdown_file, sample_docspec_content, sample_markdown_content
):
    """Test that the prompt includes the PR diff."""
    change_working_dir(repo_root)
    
    create_docspec_file("README.docspec.md", sample_docspec_content)
    create_markdown_file("README.md", sample_markdown_content)
    
    diff_content = "diff --git a/file.ts b/file.ts\n+new line"
    mock_git_sh(mock_sh, changed_files="README.docspec.md", diff_content=diff_content)
    
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    check_script.main()
    
    prompt_content = (repo_root / "prompt.txt").read_text()
    assert "<diff>" in prompt_content
    assert diff_content in prompt_content
    assert "</diff>" in prompt_content


@patch.object(check_script, 'sh')
def test_multiple_docspecs(
    mock_sh, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_docspec_file, create_markdown_file, sample_docspec_content, sample_markdown_content
):
    """Test that multiple docspecs are included in the prompt."""
    change_working_dir(repo_root)
    
    create_docspec_file("README.docspec.md", sample_docspec_content)
    create_markdown_file("README.md", sample_markdown_content)
    create_docspec_file("docs/API.docspec.md", sample_docspec_content)
    create_markdown_file("docs/API.md", sample_markdown_content)
    
    mock_git_sh(mock_sh, changed_files="README.docspec.md\ndocs/API.docspec.md", diff_content="diff content")
    
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    check_script.main()
    
    prompt_content = (repo_root / "prompt.txt").read_text()
    assert "README.docspec.md" in prompt_content
    assert "docs/API.docspec.md" in prompt_content


def test_max_docspecs_limit(
    temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_docspec_file, create_markdown_file, sample_docspec_content, sample_markdown_content
):
    """Test that MAX_DOCSPECS limit is respected."""
    change_working_dir(repo_root)
    
    for i in range(15):
        create_docspec_file(f"docspec{i}.docspec.md", sample_docspec_content)
        create_markdown_file(f"docspec{i}.md", sample_markdown_content)
    
    changed_files = "\n".join([f"docspec{i}.docspec.md" for i in range(15)])
    
    # Set environment variable BEFORE re-executing the module
    # This ensures MAX_DOCSPECS is read correctly at module load time
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        MAX_DOCSPECS="10",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    # Re-execute the module loader to re-evaluate MAX_DOCSPECS with the new env var
    # This re-runs all module-level code including MAX_DOCSPECS = int(os.getenv(...))
    spec.loader.exec_module(check_script)
    
    # Patch 'sh' after re-execution with the mock git commands
    with patch.object(check_script, 'sh') as mock_sh:
        mock_git_sh(mock_sh, changed_files=changed_files, diff_content="diff content")
        check_script.main()
    
    prompt_content = (repo_root / "prompt.txt").read_text()
    docspec_count = prompt_content.count("## Docspec:")
    assert docspec_count == 10


def test_max_docspecs_limit_different_value(
    temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_docspec_file, create_markdown_file, sample_docspec_content, sample_markdown_content
):
    """Test that MAX_DOCSPECS limit is respected with a different value (proves the fix works)."""
    change_working_dir(repo_root)
    
    for i in range(15):
        create_docspec_file(f"docspec{i}.docspec.md", sample_docspec_content)
        create_markdown_file(f"docspec{i}.md", sample_markdown_content)
    
    changed_files = "\n".join([f"docspec{i}.docspec.md" for i in range(15)])
    
    # Set environment variable to a different value (5 instead of default 10)
    # This test would fail with the old buggy implementation
    mock_env_vars(
        BASE_SHA="abc123",
        MERGE_SHA="def456",
        MAX_DOCSPECS="5",
        PROMPT_OUTPUT_FILE=str(repo_root / "prompt.txt"),
    )
    
    # Re-execute the module loader to re-evaluate MAX_DOCSPECS with the new env var
    # This re-runs all module-level code including MAX_DOCSPECS = int(os.getenv(...))
    spec.loader.exec_module(check_script)
    
    # Patch 'sh' after re-execution with the mock git commands
    with patch.object(check_script, 'sh') as mock_sh:
        mock_git_sh(mock_sh, changed_files=changed_files, diff_content="diff content")
        check_script.main()
    
    prompt_content = (repo_root / "prompt.txt").read_text()
    docspec_count = prompt_content.count("## Docspec:")
    assert docspec_count == 5


def test_missing_environment_variables(temp_dir, repo_root, change_working_dir):
    """Test that script fails with appropriate error when env vars are missing."""
    change_working_dir(repo_root)
    
    script_path = Path(__file__).parent.parent / "prepare-docspec-check-prompt.py"
    
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        cwd=str(repo_root),
        env={},
    )
    
    assert result.returncode != 0
    assert "BASE_SHA" in result.stderr or "MERGE_SHA" in result.stderr
