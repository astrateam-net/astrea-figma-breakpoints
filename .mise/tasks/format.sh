#!/usr/bin/env bash
#MISE description="Format and fix the repo (Biome: formatter, organize imports, safe fixes)"
set -euo pipefail
bunx biome check --write --no-errors-on-unmatched "$@"
