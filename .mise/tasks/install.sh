#!/usr/bin/env bash
#MISE description="Install dependencies from bun.lock (frozen in CI)"
set -euo pipefail
if [ -n "${CI:-}" ]; then
  bun install --frozen-lockfile
else
  bun install
fi
