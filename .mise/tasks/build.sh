#!/usr/bin/env bash
#MISE description="Build all workspaces (turbo): apps/plugin → build/ + manifest.json"
set -euo pipefail
bunx turbo run build
