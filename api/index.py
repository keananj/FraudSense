import json
import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Pastikan import ini tetap mengarah ke modul predictormu
from .predictor import get_predictor

# --------------------------------------------------------------------------
# Penyesuaian Path untuk Vercel Serverless
# --------------------------------------------------------------------------
BASE = os.path.dirname(__file__)
# Karena vectorizer.joblib dan model.joblib ditaruh langsung di folder /api,
# kita langsung arahkan ke BASE folder api tersebut.
MODEL_DIR = BASE 

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


# --------------------------------------------------------------------------
# Keterangan Penting Mengenai Fitur Feedback / Metrics:
# --------------------------------------------------------------------------
@app.post("/api/feedback")
def submit_feedback(req: FeedbackRequest):
    """
    Vercel Serverless memiliki sistem berkas bersifat Read-Only. 
    Menyimpan feedback ke file lokal JSON tidak didukung di Vercel.
    Menerima request dengan sukses, tetapi tidak menulis ke berkas disk.
    """
    return {
        "status": "received", 
        "message": "Feedback simulation triggered successfully. Persistent database required for production storage."
    }


@app.get("/api/feedback")
def get_feedback():
    """Mengembalikan data simulasi kosong karena Vercel tidak mendukung penyimpanan berkas lokal."""
    return {"count": 0, "average_rating": None, "submissions": []}


@app.get("/api/metrics")
def metrics():
    """Mengembalikan metrik performa model statis karena metrics.json lokal tidak dipublish."""
    return {
        "Model": "SVM (LinearSVC)",
        "Accuracy": "97.75%",
        "Precision": "96.73%",
        "Recall": "98.97%",
        "F1-Score": "97.84%"
    }
