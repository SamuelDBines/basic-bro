#!/usr/bin/env bash
set -euo pipefail

# bump type: patch | minor | major
TYPE=${1:-patch}

if [[ "$TYPE" != "patch" && "$TYPE" != "minor" && "$TYPE" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]" >&2
  exit 1
fi

# read current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$TYPE" in
  patch)
    PATCH=$((PATCH + 1))
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

# update package.json version (preserves formatting reasonably)
node -e "
  const fs = require('fs');
  const pkg = require('./package.json');
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

MSG="Version bumped: ${CURRENT_VERSION} → ${NEW_VERSION}"
echo $MSG

git add .
git commit -m "release: $MSG"

pnpm build

pnpm pack

pnpm publish
