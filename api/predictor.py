"""
predictor.py
------------
Loads the trained model + vectorizer and produces the system outputs
described in the proposal:

  - Binary classification (fraud / not fraud)
  - Confidence score (probability the message is fraudulent)
  - Risk level (low / medium / high)
  - Explainability details (suspicious keywords, URLs, reasons)
"""

import os

import joblib
import numpy as np

from explain import build_explanation
from preprocess import clean_text

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")


class FraudPredictor:
    """Wraps the trained pipeline for single-message inference."""

    def __init__(self):
        self.model = joblib.load(os.path.join(MODEL_DIR, "model.joblib"))
        self.vectorizer = joblib.load(os.path.join(MODEL_DIR, "vectorizer.joblib"))

    def _confidence(self, X) -> float:
        """
        Return P(fraud) in [0, 1].

        Naive Bayes / Logistic Regression expose predict_proba directly.
        LinearSVC does not, so we map its decision_function through a
        logistic squashing function as an approximate confidence.
        """
        if hasattr(self.model, "predict_proba"):
            return float(self.model.predict_proba(X)[0][1])
        score = float(self.model.decision_function(X)[0])
        return float(1.0 / (1.0 + np.exp(-score)))

    @staticmethod
    def _risk_level(prob: float) -> str:
        if prob >= 0.75:
            return "high"
        if prob >= 0.45:
            return "medium"
        return "low"

    def predict(self, text: str) -> dict:
        """Classify one message and return the full result dict."""
        raw = (text or "").strip()
        if not raw:
            return {"error": "Empty input. Please enter a message to analyze."}

        cleaned = clean_text(raw)
        X = self.vectorizer.transform([cleaned])
        prob = self._confidence(X)
        label = int(prob >= 0.5)

        explanation = build_explanation(raw, label, self.vectorizer, self.model)

        return {
            "label": label,                              # 1 = fraud, 0 = legit
            "label_text": "Fraud" if label else "Not Fraud",
            "confidence": round(prob, 4),                # P(fraud)
            "confidence_pct": round(prob * 100, 1),
            "risk_level": self._risk_level(prob),
            "explanation": explanation,
            "cleaned_text": cleaned,
        }


# Module-level singleton so the model is loaded only once.
_predictor = None


def get_predictor() -> FraudPredictor:
    global _predictor
    if _predictor is None:
        _predictor = FraudPredictor()
    return _predictor


if __name__ == "__main__":
    import json
    p = get_predictor()
    tests = [
        "URGENT: Your bank account is locked. Verify your password now at http://fake-bank.co",
        "Hi, are we still on for coffee tomorrow morning?",
        "Congratulations! You won a $1000 gift card, claim your prize here.",
    ]
    for t in tests:
        print(f"\nINPUT: {t}")
        print(json.dumps(p.predict(t), indent=2))
