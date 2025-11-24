#!/usr/bin/env bash
set -euo pipefail

# Build a wheel for the backend package.
# Usage: ./scripts/build_wheel.sh

HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

echo "Building wheel in ${HERE}"

python3 -m pip install --upgrade pip setuptools wheel

rm -rf dist
mkdir -p dist

echo "Running pip wheel . -w dist"
python3 -m pip wheel . -w dist

echo "Built wheels:"
ls -la dist/*.whl || true

echo "Done."
