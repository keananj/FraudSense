#!/usr/bin/env bash
# ---------------------------------------------------------------
# run_frontend.sh — install deps and start the React dev server
# ---------------------------------------------------------------
set -e
cd "$(dirname "$0")/frontend"

if [ ! -d node_modules ]; then
  echo "[1/2] Installing npm dependencies..."
  npm install
else
  echo "[1/2] node_modules found - skipping install."
fi

echo "[2/2] Starting frontend on http://localhost:5173"
echo "      (make sure the backend is running on port 5000)"
npm run dev
