#!/bin/sh

# Debug: List Files
echo "Current directory: $(pwd)"
echo "Contents of /app:"
ls -F
echo "Contents of /app/dist:"
if [ -d "dist" ]; then
  ls -R dist
else
  echo "ERROR: /app/dist directory does not exist!"
fi

# Run database migrations
echo "Running Drizzle schema push..."
npx drizzle-kit push

# Try to find main.js and start it
if [ -f "dist/main.js" ]; then
  echo "Starting application from dist/main.js..."
  node dist/main.js
elif [ -f "dist/src/main.js" ]; then
  echo "Starting application from dist/src/main.js..."
  node dist/src/main.js
else
  echo "ERROR: Could not find main.js in dist/ or dist/src/"
  exit 1
fi
