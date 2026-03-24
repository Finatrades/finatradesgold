#!/bin/bash
set -e

# Install any missing npm packages
npm install 2>&1 || true

# Push schema to DB — use 'yes' to accept the default choice on any interactive prompts
# (e.g. drizzle-kit asking whether a new table should be created vs renamed)
yes "" | npx drizzle-kit push --force 2>&1 || true
