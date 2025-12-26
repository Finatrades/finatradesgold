#!/bin/bash
set -e

echo "Starting Amplify build..."

# Clean and create directory structure
rm -rf ./.amplify-hosting
mkdir -p ./.amplify-hosting/compute/default
mkdir -p ./.amplify-hosting/static

# Build the frontend first using local vite
echo "Building frontend..."
./node_modules/.bin/vite build --outDir ./.amplify-hosting/static

# Build the server - externalize build-time only dependencies
echo "Building server..."
./node_modules/.bin/esbuild server/index.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile=./.amplify-hosting/compute/default/index.mjs \
  --external:pg-native \
  --external:lightningcss \
  --external:@tailwindcss/oxide* \
  --external:tailwindcss \
  --external:@babel/* \
  --external:vite \
  --external:esbuild \
  --external:postcss \
  --external:autoprefixer \
  --minify

# Create package.json for ESM
echo '{"type": "module"}' > ./.amplify-hosting/compute/default/package.json

# Copy deploy manifest
cp deploy-manifest.json ./.amplify-hosting/deploy-manifest.json

echo "Build complete!"
echo "Output size:"
du -sh ./.amplify-hosting/
du -sh ./.amplify-hosting/compute/
du -sh ./.amplify-hosting/static/
