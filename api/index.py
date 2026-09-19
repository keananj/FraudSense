import json
import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predictor import get_predictor

# --------------------------------------------------------------------------
# Penyesuaian Path untuk Vercel Serverless
# --------------------------------------------------------------------------
BASE = os.path.dirname(__file__)
# vectorizer.joblib, model.joblib, dan metrics.json ditaruh langsung di
# folder /api, jadi kita arahkan langsung ke BASE folder api tersebut.
MODEL_DIR = BASE
# Vercel's filesystem is read-only except /tmp, and /tmp is not shared or
# persisted across invocations/instances -- feedback here is best-effort,
# not durable storage.
FEEDBACK_PATH = "/tmp/feedback.json"

app = FastAPI(
    title="FraudSense API",
    description="Fraud message detection system using machine learning.",
    version="1.0.0",
)

# Mengizinkan Vercel Frontend berkomunikasi dengan fungsi ini secara Cross-Origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Request / response schemas
# --------------------------------------------------------------------------
class PredictRequest(BaseModel):
    text: str = Field(..., description="The message text to analyze.")


class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=10, description="Overall app rating (1-10).")
    agreed_with_classification: bool = Field(..., description="Did the user originally agree with the classification?")
    changed_mind: bool = Field(..., description="Did the result change the user's mind?")
    comments: str = Field("", description="Free-text feedback / review.")
    tested_message: str = Field("", description="The message the user tested.")


# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------
@app.get("/api/health")
def health():
    # Cek apakah file model.joblib ada langsung di dalam folder api
    model_ready = os.path.exists(os.path.join(MODEL_DIR, "model.joblib"))
    return {
        "status": "ok" if model_ready else "model_missing",
        "service": "FraudSense API (Serverless)",
        "model_ready": model_ready,
    }


@app.post("/api/predict")
def predict(req: PredictRequest):
    text = req.text
    if not isinstance(text, str) or not text.strip():
        raise HTTPException(status_code=400, detail="Please provide a non-empty 'text' field.")
    if len(text) > 20000:
        raise HTTPException(status_code=400, detail="Message too long (20000 character limit).")

    try:
        result = get_predictor().predict(text)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model artifact (.joblib) not found in api directory.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/feedback")
def submit_feedback(req: FeedbackRequest):
    """Store a user-testing questionnaire submission (best-effort, see FEEDBACK_PATH note above)."""
    entry = req.model_dump()
    entry["timestamp"] = datetime.now(timezone.utc).isoformat()

    records = []
    if os.path.exists(FEEDBACK_PATH):
        try:
            with open(FEEDBACK_PATH) as f:
                records = json.load(f)
        except (json.JSONDecodeError, OSError):
            records = []
    records.append(entry)
    with open(FEEDBACK_PATH, "w") as f:
        json.dump(records, f, indent=2)

    return {"status": "saved", "total_submissions": len(records)}


@app.get("/api/feedback")
def get_feedback():
    """Return aggregated user-testing results."""
    if not os.path.exists(FEEDBACK_PATH):
        return {"count": 0, "average_rating": None, "submissions": []}
    with open(FEEDBACK_PATH) as f:
        records = json.load(f)

    if not records:
        return {"count": 0, "average_rating": None, "submissions": []}

    ratings = [r["rating"] for r in records if "rating" in r]
    avg = round(sum(ratings) / len(ratings), 2) if ratings else None
    changed = sum(1 for r in records if r.get("changed_mind"))
    return {
        "count": len(records),
        "average_rating": avg,
        "changed_mind_count": changed,
        "submissions": records,
    }


@app.get("/api/metrics")
def metrics():
    path = os.path.join(MODEL_DIR, "metrics.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404,
                            detail="Metrics not found. Run train.py first.")
    with open(path) as f:
        return json.load(f)
