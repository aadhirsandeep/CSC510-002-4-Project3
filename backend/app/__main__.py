# Copyright (c) 2025 Group 2
# All rights reserved.
# 
# This project and its source code are the property of Group 2:
# - Aryan Tapkire
# - Dilip Irala Narasimhareddy
# - Sachi Vyas
# - Supraj Gijre

"""Console entry point for the FastAPI app package.

This module provides a `main()` function so the package can be executed as a
console script or via `python -m app` and matches the `project.scripts` entry
in pyproject.toml.
"""
from __future__ import annotations

import os
import sys
from typing import List

def main(argv: List[str] | None = None) -> int:
    """Run the FastAPI app using uvicorn.

    Returns process exit code (0 on success). This mirrors a simple CLI
    entrypoint so packaging tools and PEX can find and run the app.
    """
    argv = list(argv or sys.argv[1:])

    # Import here so packaging doesn't require uvicorn at install time until run.
    try:
        import uvicorn
    except Exception as exc:  # pragma: no cover - runtime error path
        print("uvicorn is required to run the app. Install it with 'pip install uvicorn'", file=sys.stderr)
        raise

    # Allow overriding host/port via env vars or CLI args
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))

    # Build uvicorn config and run
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
