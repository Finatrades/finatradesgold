#!/bin/bash
set -e

echo "Starting Amplify build..."

# Clean and create directory structure
rm -rf ./.amplify-hosting
mkdir -p ./.amplify-hosting/compute/default
mkdir -p ./.amplify-hosting/static

# Build the frontend first
echo "Building frontend..."
npx vite build --outDir ./.amplify-hosting/static

# Build the server - bundle all dependencies inline (no external node_modules needed)
echo "Building server..."
npx esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile=./.amplify-hosting/compute/default/index.mjs \
  --external:pg-native \
  --minify

# Create package.json for ESM
echo '{"type": "module"}' > ./.amplify-hosting/compute/default/package.json

# Copy deploy manifest
cp deploy-manifest.json ./.amplify-hosting/deploy-manifest.json

echo "Build complete!"
echo "Output size:"
du -sh ./.amplify-hosting/
