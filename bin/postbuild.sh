#!/bin/bash
set -e

echo "Starting Amplify build..."

# Clean and create directory structure
rm -rf ./.amplify-hosting
mkdir -p ./.amplify-hosting/compute/default
mkdir -p ./.amplify-hosting/static

# Build the frontend first (before server to avoid conflicts)
echo "Building frontend..."
npx vite build --outDir ./.amplify-hosting/static

# Build the server with ESM format and externalize native modules
echo "Building server..."
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile=./.amplify-hosting/compute/default/index.mjs \
  --external:better-sqlite3 \
  --external:pg-native \
  --external:@tailwindcss/oxide* \
  --external:lightningcss \
  --external:vite \
  --external:esbuild \
  --packages=external

# Create package.json for ESM
echo '{"type": "module"}' > ./.amplify-hosting/compute/default/package.json

# Copy node_modules for runtime dependencies
echo "Copying dependencies..."
cp -r ./node_modules ./.amplify-hosting/compute/default/node_modules

# Copy deploy manifest
cp deploy-manifest.json ./.amplify-hosting/deploy-manifest.json

echo "Build complete!"
