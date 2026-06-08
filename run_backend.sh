#!/usr/bin/env bash
# ---------------------------------------------------------------
# run_backend.sh — set up and start the FraudSense API
# ---------------------------------------------------------------
set -e
cd "$(dirname "$0")/backend"

echo "[1/3] Installing Python dependencies..."
pip install -r requirements.txt

# Train the model if it has not been trained yet.
if [ ! -f models/model.joblib ]; then
  echo "[2/3] No trained model found - training now..."
  python train.py
else
  echo "[2/3] Trained model found - skipping training."
  echo "      (delete backend/models/ and re-run to retrain)"
fi

echo "[3/3] Starting API on http://localhost:5000  (docs at /docs)"
python app.py
