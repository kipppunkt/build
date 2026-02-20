#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION="$1"
TAG="v${VERSION}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Fail if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists" >&2
  exit 1
fi

# Update package.json version if needed
CURRENT_VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
if [ "$CURRENT_VERSION" != "$VERSION" ]; then
  node -e "
    const fs = require('fs');
    const path = '$ROOT_DIR/package.json';
    const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
    pkg.version = '$VERSION';
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
  "
  git -C "$ROOT_DIR" add package.json
  git -C "$ROOT_DIR" commit -m "Bump version to $VERSION"
  git -C "$ROOT_DIR" push
fi

# Tag and push
git -C "$ROOT_DIR" tag "$TAG"
git -C "$ROOT_DIR" push origin "$TAG"

# Publish to npm
cd "$ROOT_DIR"
npm publish
