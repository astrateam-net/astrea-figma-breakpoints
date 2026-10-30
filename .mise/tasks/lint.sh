#!/usr/bin/env bash
#MISE description="Lint and format-check the repo (Biome)"
set -euo pipefail
bunx biome check --no-errors-on-unmatched "$@"
