#!/usr/bin/env bash
#MISE description="Typecheck all workspaces (turbo) and the TypeScript mise tasks"
set -euo pipefail
bunx turbo run typecheck
# mise tasks written in TypeScript (not a workspace)
bunx tsc -p .mise/tsconfig.json
