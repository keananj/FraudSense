from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import joblib
import os

app = FastAPI()

# Tambahkan CORS agar frontend React-mu bisa akses backend tanpa diblokir
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Contoh cara load model biner .joblib dengan aman di Vercel
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model_svm.joblib")

@app.get("/api")
def hello_backend():
    return {"status": "FraudSense Backend Serverless is Live!"}

@app.post("/api/predict")
def predict_message(data: dict):
    # Masukkan logika preprocessing dan prediksi FraudSense-mu di sini
    return {"result": "success"}
