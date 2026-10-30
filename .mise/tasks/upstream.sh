#!/usr/bin/env bash
#MISE description="Clone or update the reference repos in .upstream/ (gitignored, read-only)"
set -euo pipefail
mkdir -p .upstream
for repo in figma/plugin-typings figma/plugin-samples yuanqing/create-figma-plugin google/styleguide; do
  dir=".upstream/${repo#*/}"
  if [ -d "$dir" ]; then
    git -C "$dir" pull --ff-only --quiet
  else
    git clone --depth 1 --quiet "https://github.com/$repo.git" "$dir"
  fi
  echo "$dir $(git -C "$dir" log -1 --format='%h %cs')"
done
