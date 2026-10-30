#!/usr/bin/env bash
#MISE description="Rebuild the plugin on every change (import apps/plugin/manifest.json in Figma Desktop)"
set -euo pipefail
bunx turbo run dev --filter=@astrea/breakpoints-plugin
