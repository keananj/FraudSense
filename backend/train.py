"""
train.py
--------
Trains and compares the three models specified in the proposal:

  - Naive Bayes (MultinomialNB)
  - Logistic Regression
  - Support Vector Machine (LinearSVC, probability-calibrated)

Pipeline (per the proposal's "Initial Plan for Model/Methodology"):
  1. Load + merge the email and SMS datasets (Indonesian-language spam data)
  2. Preprocess text with the shared clean_text() function
  3. TF-IDF feature extraction (uni- + bi-grams)
  4. 80:20 train/test split (stratified)
  5. Train each model; evaluate with Accuracy / Precision / Recall / F1 /
     Confusion Matrix, plus 5-fold cross-validated F1
  6. Per-channel evaluation (email vs SMS) to confirm generalization
  7. Select the best model by F1-score (recall & F1 are prioritized, since
     missing a fraud message is worse than a false alarm)
  8. Persist the winning model + vectorizer + metrics to ./models/

Datasets expected in ./data/:
  email_spam_indo.csv   columns: Kategori, Pesan
  sms_spam_indo.csv     columns: Kategori, Pesan

Run:  python train.py
"""

import json
import os

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, f1_score, precision_score,
                             recall_score)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC

from preprocess import clean_text, standardize_label

BASE = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE, "data")
MODEL_DIR = os.path.join(BASE, "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def load_dataset():
    """Load and merge the email + SMS datasets into one DataFrame.

    Handles the Indonesian datasets (columns 'Kategori' / 'Pesan') and is
    flexible about column naming so English Kaggle files also work.
    """
    frames = []
    for fname, channel in [("email_spam_indo.csv", "email"),
                           ("sms_spam_indo.csv", "sms")]:
        path = os.path.join(DATA_DIR, fname)
        if not os.path.exists(path):
            continue
        df = pd.read_csv(path)
        # Be flexible about column naming (Indonesian + English).
        text_col = next(
            (c for c in df.columns
             if c.lower() in ("pesan", "text", "message", "email", "body")),
            df.columns[-1])
        label_col = next(
            (c for c in df.columns
             if c.lower() in ("kategori", "label", "class", "category", "target")),
            df.columns[0])
        sub = pd.DataFrame({
            "text": df[text_col].astype(str),
            "label": df[label_col].apply(standardize_label),
            "channel": channel,
        })
        frames.append(sub)
        print(f"  loaded {len(sub):>5} rows from {fname}  ({channel})")

    if not frames:
        raise FileNotFoundError(
            "No datasets found in ./data/. Expected email_spam_indo.csv "
            "and sms_spam_indo.csv.")

    data = pd.concat(frames, ignore_index=True)
    data = data.dropna(subset=["text"])
    data = data[data["text"].str.strip() != ""]
    return data


def evaluate(name, model, X_test, y_test):
    """Compute and print the proposal's evaluation metrics."""
    preds = model.predict(X_test)
    metrics = {
        "model": name,
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "precision": round(precision_score(y_test, preds, zero_division=0), 4),
        "recall": round(recall_score(y_test, preds, zero_division=0), 4),
        "f1": round(f1_score(y_test, preds, zero_division=0), 4),
        "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
    }
    print(f"\n  [{name}]")
    print(f"    Accuracy : {metrics['accuracy']:.4f}")
    print(f"    Precision: {metrics['precision']:.4f}")
    print(f"    Recall   : {metrics['recall']:.4f}")
    print(f"    F1-Score : {metrics['f1']:.4f}")
    cm = metrics["confusion_matrix"]
    print(f"    Confusion Matrix [[TN FP],[FN TP]]: {cm}")
    return metrics


def per_channel_scores(model, vectorizer, data, test_idx):
    """Evaluate the model separately on email vs SMS test samples."""
    out = {}
    for channel in ("email", "sms"):
        mask = (data.loc[test_idx, "channel"] == channel)
        if mask.sum() == 0:
            continue
        Xc = vectorizer.transform(data.loc[test_idx, "clean"][mask])
        yc = data.loc[test_idx, "label"][mask]
        preds = model.predict(Xc)
        out[channel] = {
            "samples": int(mask.sum()),
            "accuracy": round(accuracy_score(yc, preds), 4),
            "f1": round(f1_score(yc, preds, zero_division=0), 4),
            "recall": round(recall_score(yc, preds, zero_division=0), 4),
        }
    return out


def main():
    print("=" * 60)
    print("  FraudSense - Model Training")
    print("=" * 60)

    print("\n[1/6] Loading datasets...")
    data = load_dataset()
    fraud_n = int(data["label"].sum())
    by_channel = data["channel"].value_counts().to_dict()
    print(f"  total: {len(data)} rows  |  fraud: {fraud_n}  |  legit: {len(data) - fraud_n}")
    print(f"  by channel: {by_channel}")

    print("\n[2/6] Preprocessing text...")
    data["clean"] = data["text"].apply(clean_text)

    print("\n[3/6] Train/test split (80:20, stratified)...")
    idx = data.index.to_numpy()
    train_idx, test_idx = train_test_split(
        idx, test_size=0.20, random_state=42, stratify=data["label"])
    X_train = data.loc[train_idx, "clean"]
    X_test = data.loc[test_idx, "clean"]
    y_train = data.loc[train_idx, "label"]
    y_test = data.loc[test_idx, "label"]
    print(f"  train: {len(X_train)}  |  test: {len(X_test)}")

    print("\n[4/6] TF-IDF feature extraction...")
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2), min_df=2, max_df=0.9, sublinear_tf=True)
    Xtr = vectorizer.fit_transform(X_train)
    Xte = vectorizer.transform(X_test)
    print(f"  vocabulary size: {len(vectorizer.get_feature_names_out())}")

    print("\n[5/6] Training & evaluating models...")
    candidates = {
        "Naive Bayes": MultinomialNB(),
        "Logistic Regression": LogisticRegression(max_iter=1000, C=4.0,
                                                  class_weight="balanced"),
        # LinearSVC has no predict_proba; CalibratedClassifierCV wraps it so
        # the system can report well-calibrated confidence scores.
        "SVM (LinearSVC)": CalibratedClassifierCV(
            LinearSVC(C=1.0, class_weight="balanced"), cv=5),
    }

    results = []
    trained = {}
    for name, model in candidates.items():
        model.fit(Xtr, y_train)
        trained[name] = model
        m = evaluate(name, model, Xte, y_test)
        # 5-fold cross-validated F1 on the training set for robustness.
        cv = cross_val_score(model, Xtr, y_train, cv=5, scoring="f1")
        m["cv_f1_mean"] = round(float(cv.mean()), 4)
        m["cv_f1_std"] = round(float(cv.std()), 4)
        print(f"    5-fold CV F1: {m['cv_f1_mean']:.4f} (+/- {m['cv_f1_std']:.4f})")
        results.append(m)

    # Select best by F1 (recall/F1 prioritized per proposal).
    best = max(results, key=lambda r: (r["f1"], r["recall"]))
    best_name = best["model"]
    best_model = trained[best_name]

    print("\n[6/6] Per-channel evaluation of the best model...")
    channel_scores = per_channel_scores(best_model, vectorizer, data, test_idx)
    for ch, s in channel_scores.items():
        print(f"  {ch:>5}: acc={s['accuracy']:.4f}  f1={s['f1']:.4f}  "
              f"recall={s['recall']:.4f}  (n={s['samples']})")

    print("\n" + "=" * 60)
    print(f"  BEST MODEL: {best_name}  (F1 = {best['f1']:.4f})")
    print("=" * 60)

    # Persist artifacts.
    joblib.dump(best_model, os.path.join(MODEL_DIR, "model.joblib"))
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "vectorizer.joblib"))
    with open(os.path.join(MODEL_DIR, "metrics.json"), "w") as f:
        json.dump({
            "best_model": best_name,
            "results": results,
            "per_channel": channel_scores,
            "dataset": {
                "total": len(data),
                "fraud": fraud_n,
                "legit": len(data) - fraud_n,
                "by_channel": by_channel,
                "train_size": len(X_train),
                "test_size": len(X_test),
                "vocab_size": len(vectorizer.get_feature_names_out()),
            },
        }, f, indent=2)

    print(f"\n  Saved -> {MODEL_DIR}/model.joblib")
    print(f"  Saved -> {MODEL_DIR}/vectorizer.joblib")
    print(f"  Saved -> {MODEL_DIR}/metrics.json")

    # Success-criteria check from the proposal.
    print("\n  Success criteria check:")
    ok_acc = best["accuracy"] > 0.85
    ok_f1 = best["f1"] > 0.80
    print(f"    Accuracy > 85% : {'PASS' if ok_acc else 'FAIL'} ({best['accuracy']*100:.1f}%)")
    print(f"    F1-Score > 80% : {'PASS' if ok_f1 else 'FAIL'} ({best['f1']*100:.1f}%)")


if __name__ == "__main__":
    main()
