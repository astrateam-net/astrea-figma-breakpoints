#!/usr/bin/env bash
#MISE description="Run the unit tests of all workspaces (turbo, bun test)"
set -euo pipefail
bunx turbo run test
