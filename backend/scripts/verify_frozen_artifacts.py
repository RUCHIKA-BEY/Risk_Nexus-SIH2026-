"""Verify that every frozen/immutable file matches backend/FROZEN_CHECKSUMS.sha256.

Run from anywhere:  python backend/scripts/verify_frozen_artifacts.py
Exit code 0 = all files intact; 1 = a file is missing or changed (do NOT "fix" by
re-hashing: restore the original file from the integration package instead).
"""
from __future__ import annotations

import hashlib
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def main() -> int:
    manifest = BACKEND / "FROZEN_CHECKSUMS.sha256"
    failures = 0
    for line in manifest.read_text().splitlines():
        if not line.strip():
            continue
        expected, rel = line.split(maxsplit=1)
        rel = rel.lstrip("*")
        path = BACKEND / rel
        if not path.exists():
            print(f"MISSING  {rel}")
            failures += 1
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        ok = actual == expected
        failures += not ok
        print(f"{'OK      ' if ok else 'CHANGED '} {rel}")
    print(f"\n{'PASS' if not failures else 'FAIL'}: {failures} problem(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
