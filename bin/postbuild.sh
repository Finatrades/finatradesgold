#!/bin/bash
set -e

echo "Starting Amplify build..."

# Clean and create directory structure
rm -rf ./.amplify-hosting
mkdir -p ./.amplify-hosting/compute/default
mkdir -p ./.amplify-hosting/static

# Build the server
echo "Building server..."
npx esbuild server/index.ts --bundle --platform=node --target=node20 --outfile=./.amplify-hosting/compute/default/index.js --external:better-sqlite3 --external:pg-native

# Copy node_modules for runtime dependencies
echo "Copying dependencies..."
cp -r ./node_modules ./.amplify-hosting/compute/default/node_modules

# Build the frontend
echo "Building frontend..."
npx vite build --outDir ./.amplify-hosting/static

# Copy deploy manifest
cp deploy-manifest.json ./.amplify-hosting/deploy-manifest.json

echo "Build complete!"
