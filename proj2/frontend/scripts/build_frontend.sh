#!/usr/bin/env bash
set -euo pipefail

# Build the frontend and create a dist.zip suitable for attaching to a Release.
# Usage: ./proj2/frontend/scripts/build_frontend.sh

HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

echo "Building frontend in ${HERE}"

# prefer npm ci when package-lock.json exists
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build

# package the build output (Vite outDir is 'build' in this project)
rm -f dist.zip
if [ -d build ]; then
  zip -r dist.zip build
  echo "Created: $HERE/dist.zip (from build/)"
elif [ -d dist ]; then
  zip -r dist.zip dist
  echo "Created: $HERE/dist.zip (from dist/)"
else
  echo "No build/ or dist/ directory found after build" >&2
  exit 2
fi

echo "Frontend build complete."
