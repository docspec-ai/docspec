#!/usr/bin/env python3
"""
Prepare prompts for docspec-generate workflow.

This script:
1. Generates/overwrites the docspec file if needed
2. Reads the markdown and docspec files
3. Prepares plan and implementation prompt templates with content substituted
4. Outputs both prompts for use with github-ai-actions
"""

import os
import subprocess
from pathlib import Path
from string import Template


def read_text(path: Path) -> str:
    """Read file content as UTF-8."""
    return path.read_text(encoding="utf-8")


def substitute_template(template: str, **kwargs) -> str:
    """
    Substitute variables in template using ${variable} syntax.
    
    Uses Template.safe_substitute() to ensure that only variables in the original
    template are replaced, not patterns that appear in substituted values.
    This prevents corruption when markdown/docspec content contains template-like
    patterns (e.g., documentation about template systems).
    """
    t = Template(template)
    return t.safe_substitute(**kwargs)


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
    
    # Generate docspec if it doesn't exist or overwrite if it does
    print(f"Generating docspec file: {docspec_path}")
    generate_cmd = ["docspec", "generate", str(docspec_path)]
    
    try:
        subprocess.run(
            generate_cmd,
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
    
    # Prompt templates (embedded)
    plan_template = """You are analyzing a markdown file and its docspec to discover missing or irrelevant information. Do not ask questions - create the plan directly.

<markdown path="${md_path}">
${md_text}
</markdown>

<docspec path="${docspec_path}">
${docspec_text}
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

Output your plan in a clear, structured format focusing on information gaps and corrections.
"""

    impl_template = """Based on this information discovery plan:
<plan>
{{PLAN}}
</plan>

You need to update two files:
1. ${md_path} - the markdown file
2. ${docspec_path} - the docspec file

CRITICAL CONSTRAINTS FOR DOCSPEC FILE - YOU MUST PRESERVE THE EXACT STRUCTURE:

1. Read the existing ${docspec_path} file FIRST using the Read tool
2. PRESERVE EXACTLY:
   - The exact header format (e.g., `# DOCSPEC: Readme` or `# DOCSPEC: [README.md](/README.md)`) - keep it EXACTLY as written
   - The exact one-line description format (e.g., `> A specification that ...`) - keep it EXACTLY as written
   - The `## AGENT INSTRUCTIONS` section if it exists - keep it EXACTLY as-is, do not modify
   - The EXACT section header names and numbers (e.g., `## 1. Document Purpose` or `## 2. Update Triggers`) - keep them EXACTLY as written
   - The order of sections - do not reorder them

3. ONLY update the CONTENT within sections 1-5 (the text below each section header)
   - Do NOT change section header text, numbers, or names
   - Do NOT change the format of headers
   - Do NOT modify title, description, or AGENT INSTRUCTIONS

Task:
1. Read ${docspec_path} and note its EXACT structure
2. Read ${md_path}
3. Explore the repository and discover information about:
   - What the codebase actually contains
   - What files exist that relate to the markdown
   - What the actual structure and content of the markdown is
4. For ${docspec_path}: Update ONLY the content text within sections 1-5. Preserve ALL structure, headers, format, and separators exactly as they were.
5. For ${md_path}: Add any missing information identified in the plan
6. Make changes directly to the files
"""
    
    # Substitute variables in templates
    plan_prompt = substitute_template(
        plan_template,
        md_path=str(md_path.relative_to(repo_root)),
        md_text=md_text,
        docspec_path=str(docspec_path.relative_to(repo_root)),
        docspec_text=docspec_text,
    )
    
    impl_prompt = substitute_template(
        impl_template,
        md_path=str(md_path.relative_to(repo_root)),
        md_text=md_text,
        docspec_path=str(docspec_path.relative_to(repo_root)),
        docspec_text=docspec_text,
        # Note: {{PLAN}} is left as-is for github-ai-actions to replace when enable_plan: 'true'
    )
    
    # Output prompts (plan first, then implementation, separated by a marker)
    # We'll use a special marker that we can split on
    print("===PLAN_PROMPT_START===")
    print(plan_prompt)
    print("===PLAN_PROMPT_END===")
    print("===IMPL_PROMPT_START===")
    print(impl_prompt)
    print("===IMPL_PROMPT_END===")


if __name__ == "__main__":
    main()

