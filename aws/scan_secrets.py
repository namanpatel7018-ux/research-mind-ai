#!/usr/bin/env python3
"""
ResearchMind AI — Automated Secret & Credential Scanner
======================================================
Scans all tracked files and working tree for accidentally committed or
hardcoded API keys, OAuth secrets, private keys, database passwords, or JWT secrets.

Usage:
    python aws/scan_secrets.py
"""

import os
import re
import sys
from pathlib import Path

# High-confidence regular expression signatures for sensitive credentials
SECRET_PATTERNS = [
    (r"(?i)AIzaSy[0-9A-Za-z_-]{33}", "Google Gemini / Cloud API Key"),
    (r"gsk_[a-zA-Z0-9]{48,64}", "Groq API Key"),
    (r"csk-[a-z0-9]{48,64}", "Cerebras API Key"),
    (r"sk-[a-zA-Z0-9]{32,64}", "OpenAI API Key"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
    (r"(?i)GOCSPX-[0-9a-zA-Z_-]{28}", "Google OAuth Client Secret"),
    (r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", "Private Key Block"),
    (r"(?i)(?:password|passwd|pwd|secret_key)\s*[:=]\s*['\"][^'\"]{8,}['\"]", "Hardcoded Password or Secret"),
]

# Patterns or paths to ignore
IGNORE_PATHS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    ".pytest_cache",
    "__pycache__",
    "tests",
    "backend/tests",
}

# Known test mocks and documentation placeholders to ignore
WHITELIST_VALUES = {
    "test_secret_key_ci_1234567890",
    "test_ci_secret_key_64_characters_long_for_security_checks_12345",
    "your_gemini_api_key_here",
    "your_groq_api_key_here",
    "your_random_secret_key_here",
    "your_secure_random_64_char_hex_secret_key_here",
    "your-random-production-secret",
    "dev-insecure-secret-key-change-in-production-",
    "mock_gemini_key_for_ci",
    "mock_groq_key_for_ci",
}


def should_skip(path: Path) -> bool:
    posix_path = path.as_posix()
    if "example" in posix_path.lower():
        return True
    for ignored in IGNORE_PATHS:
        if ignored in posix_path.split("/"):
            return True
        if posix_path.endswith(ignored):
            return True
    return False


def scan_file(file_path: Path) -> list:
    findings = []
    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return findings

    for line_idx, line in enumerate(content.splitlines(), start=1):
        for pattern, desc in SECRET_PATTERNS:
            match = re.search(pattern, line)
            if match:
                matched_str = match.group(0)
                # Check whitelist
                if any(w in matched_str for w in WHITELIST_VALUES):
                    continue
                # Mask sensitive string for output
                if len(matched_str) > 8:
                    masked = matched_str[:4] + "..." + matched_str[-4:]
                else:
                    masked = "***"
                findings.append({
                    "file": str(file_path),
                    "line": line_idx,
                    "type": desc,
                    "masked": masked,
                })
    return findings


def main():
    root = Path(__file__).resolve().parents[1]
    print(f"Scanning repository for potential secrets: {root}")
    total_findings = 0

    for root_dir, dirs, files in os.walk(root):
        # Modify dirs in-place to avoid traversing ignored paths
        dirs[:] = [d for d in dirs if not should_skip(Path(root_dir) / d)]
        for file in files:
            file_p = Path(root_dir) / file
            if should_skip(file_p) or file.endswith((".png", ".jpg", ".ico", ".pdf", ".pyc", ".lock", ".svg")):
                continue
            # Also skip local gitignored .env files from failing this scanner if they are intentionally local
            if file.startswith(".env") and not file.endswith(".example"):
                continue

            findings = scan_file(file_p)
            for f in findings:
                total_findings += 1
                print(f"[ALERT] {f['type']} detected at {f['file']}:{f['line']} -> {f['masked']}")

    if total_findings == 0:
        print("SUCCESS: No exposed secrets detected in repository files.")
        sys.exit(0)
    else:
        print(f"\nFAILURE: {total_findings} potential secret(s) detected. Please remediate immediately.")
        sys.exit(1)


if __name__ == "__main__":
    main()
