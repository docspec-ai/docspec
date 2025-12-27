"""
Tests for prepare-docspec-generate-prompts.py
"""

import importlib.util
import os
import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Load the script as a module
script_path = Path(__file__).parent.parent / "prepare-docspec-generate-prompts.py"
spec = importlib.util.spec_from_file_location("generate_script", script_path)
generate_script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_script)


def test_missing_markdown_file_env_var(temp_dir, repo_root, change_working_dir):
    """Test that script fails when MARKDOWN_FILE is not set."""
    change_working_dir(repo_root)
    
    script_path = Path(__file__).parent.parent / "prepare-docspec-generate-prompts.py"
    
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        cwd=str(repo_root),
        env={},  # No environment variables
    )
    
    assert result.returncode != 0
    assert "MARKDOWN_FILE" in result.stderr


def test_markdown_file_not_found(temp_dir, repo_root, mock_env_vars, change_working_dir):
    """Test that script fails when markdown file doesn't exist."""
    change_working_dir(repo_root)
    
    mock_env_vars(
        MARKDOWN_FILE="nonexistent.md",
    )
    
    script_path = Path(__file__).parent.parent / "prepare-docspec-generate-prompts.py"
    
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        cwd=str(repo_root),
    )
    
    assert result.returncode != 0
    assert "not found" in result.stderr.lower()


def test_docspec_exists_without_overwrite(
    temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_markdown_file, sample_markdown_content
):
    """Test that script fails when docspec exists and overwrite is false."""
    change_working_dir(repo_root)
    
    create_markdown_file("README.md", sample_markdown_content)
    (repo_root / "README.docspec.md").write_text("# DOCSPEC: README.md")
    
    mock_env_vars(
        MARKDOWN_FILE="README.md",
        OVERWRITE_DOCSPEC="false",
    )
    
    script_path = Path(__file__).parent.parent / "prepare-docspec-generate-prompts.py"
    
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=True,
        text=True,
        cwd=str(repo_root),
    )
    
    assert result.returncode != 0
    assert "already exists" in result.stderr.lower()


@patch.object(generate_script.subprocess, 'run')
def test_docspec_generation_success(
    mock_subprocess, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_markdown_file, sample_markdown_content, sample_docspec_content
):
    """Test successful docspec generation and prompt creation."""
    change_working_dir(repo_root)
    
    create_markdown_file("README.md", sample_markdown_content)
    
    # Mock docspec CLI to create the docspec file
    def mock_run(cmd, *args, **kwargs):
        if cmd[0] == "docspec" and cmd[1] == "generate":
            docspec_path = Path(cmd[2])
            docspec_path.write_text(sample_docspec_content, encoding="utf-8")
        mock_result = MagicMock()
        mock_result.returncode = 0
        return mock_result
    
    mock_subprocess.side_effect = mock_run
    
    mock_env_vars(
        MARKDOWN_FILE="README.md",
        OVERWRITE_DOCSPEC="false",
    )
    
    generate_script.main()
    
    # Verify both prompt files exist
    assert (repo_root / "plan_prompt.txt").exists()
    assert (repo_root / "impl_prompt.txt").exists()
    
    # Verify files have content
    plan_prompt = (repo_root / "plan_prompt.txt").read_text()
    impl_prompt = (repo_root / "impl_prompt.txt").read_text()
    
    assert len(plan_prompt) > 0
    assert len(impl_prompt) > 0


@patch.object(generate_script.subprocess, 'run')
def test_template_substitution(
    mock_subprocess, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_markdown_file, sample_markdown_content, sample_docspec_content
):
    """Test that template variables are correctly substituted."""
    change_working_dir(repo_root)
    
    create_markdown_file("README.md", sample_markdown_content)
    
    def mock_run(cmd, *args, **kwargs):
        if cmd[0] == "docspec" and cmd[1] == "generate":
            docspec_path = Path(cmd[2])
            docspec_path.write_text(sample_docspec_content, encoding="utf-8")
        mock_result = MagicMock()
        mock_result.returncode = 0
        return mock_result
    
    mock_subprocess.side_effect = mock_run
    
    mock_env_vars(
        MARKDOWN_FILE="README.md",
        OVERWRITE_DOCSPEC="false",
    )
    
    generate_script.main()
    
    # Read prompt files
    plan_prompt = (repo_root / "plan_prompt.txt").read_text()
    impl_prompt = (repo_root / "impl_prompt.txt").read_text()
    
    # Should contain the markdown path
    assert "README.md" in plan_prompt
    assert "README.md" in impl_prompt
    
    # Should contain the docspec path
    assert "README.docspec.md" in plan_prompt
    assert "README.docspec.md" in impl_prompt
    
    # Should contain the actual content
    assert sample_markdown_content in plan_prompt
    assert sample_docspec_content in plan_prompt


@patch.object(generate_script.subprocess, 'run')
def test_overwrite_existing_docspec(
    mock_subprocess, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_markdown_file, sample_markdown_content, sample_docspec_content
):
    """Test that existing docspec can be overwritten when overwrite is true."""
    change_working_dir(repo_root)
    
    create_markdown_file("README.md", sample_markdown_content)
    old_docspec = "# OLD DOCSPEC"
    (repo_root / "README.docspec.md").write_text(old_docspec)
    
    def mock_run(cmd, *args, **kwargs):
        if cmd[0] == "docspec" and cmd[1] == "generate":
            docspec_path = Path(cmd[2])
            docspec_path.write_text(sample_docspec_content, encoding="utf-8")
        mock_result = MagicMock()
        mock_result.returncode = 0
        return mock_result
    
    mock_subprocess.side_effect = mock_run
    
    mock_env_vars(
        MARKDOWN_FILE="README.md",
        OVERWRITE_DOCSPEC="true",
    )
    
    generate_script.main()
    
    # Verify docspec was overwritten
    docspec_content = (repo_root / "README.docspec.md").read_text()
    assert docspec_content == sample_docspec_content
    assert old_docspec not in docspec_content


@patch.object(generate_script.subprocess, 'run')
def test_docspec_cli_not_found(
    mock_subprocess, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_markdown_file, sample_markdown_content
):
    """Test that script fails gracefully when docspec CLI is not found."""
    change_working_dir(repo_root)
    
    create_markdown_file("README.md", sample_markdown_content)
    
    # Mock FileNotFoundError when trying to run docspec
    mock_subprocess.side_effect = FileNotFoundError("docspec: command not found")
    
    mock_env_vars(
        MARKDOWN_FILE="README.md",
        OVERWRITE_DOCSPEC="false",
    )
    
    with pytest.raises(RuntimeError) as exc_info:
        generate_script.main()
    
    assert "docspec CLI not found" in str(exc_info.value)


@patch.object(generate_script.subprocess, 'run')
def test_docspec_cli_failure(
    mock_subprocess, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_markdown_file, sample_markdown_content
):
    """Test that script fails when docspec CLI returns an error."""
    change_working_dir(repo_root)
    
    create_markdown_file("README.md", sample_markdown_content)
    
    # Mock subprocess.CalledProcessError
    from subprocess import CalledProcessError
    error = CalledProcessError(
        returncode=1,
        cmd=["docspec", "generate", "README.docspec.md"],
        stderr="Error: Failed to generate docspec"
    )
    mock_subprocess.side_effect = error
    
    mock_env_vars(
        MARKDOWN_FILE="README.md",
        OVERWRITE_DOCSPEC="false",
    )
    
    with pytest.raises(RuntimeError) as exc_info:
        generate_script.main()
    
    assert "Failed to generate docspec" in str(exc_info.value)


@patch.object(generate_script.subprocess, 'run')
def test_prompt_files_structure(
    mock_subprocess, temp_dir, repo_root, mock_env_vars, change_working_dir,
    create_markdown_file, sample_markdown_content, sample_docspec_content
):
    """Test that prompt files have correct structure and content."""
    change_working_dir(repo_root)
    
    create_markdown_file("README.md", sample_markdown_content)
    
    def mock_run(cmd, *args, **kwargs):
        if cmd[0] == "docspec" and cmd[1] == "generate":
            docspec_path = Path(cmd[2])
            docspec_path.write_text(sample_docspec_content, encoding="utf-8")
        mock_result = MagicMock()
        mock_result.returncode = 0
        return mock_result
    
    mock_subprocess.side_effect = mock_run
    
    mock_env_vars(
        MARKDOWN_FILE="README.md",
        OVERWRITE_DOCSPEC="false",
    )
    
    generate_script.main()
    
    # Verify both prompt files exist and have content
    assert (repo_root / "plan_prompt.txt").exists()
    assert (repo_root / "impl_prompt.txt").exists()
    
    plan = (repo_root / "plan_prompt.txt").read_text()
    impl = (repo_root / "impl_prompt.txt").read_text()
    
    assert "Task:" in plan
    assert "{{PLAN}}" in impl  # Should remain as-is for github-ai-actions
    assert "CRITICAL CONSTRAINTS" in impl

