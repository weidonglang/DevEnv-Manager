#!/usr/bin/env python3
"""Compatibility entry point for backend/frontend command drift checks."""

from check_tauri_command_contract import main


if __name__ == "__main__":
    raise SystemExit(main())
