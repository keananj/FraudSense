# FraudSense — Fraud Message Detection System

**Sistem Deteksi Pesan Penipuan Berbasis Machine Learning**

Kelompok 1 · Universitas Bina Nusantara · 2026

FraudSense is an NLP-based system that classifies digital text messages
(email and SMS) as **fraud** or **not fraud**. It is the implementation of the
project described in the Machine Learning proposal *"FraudSense: Fraud Message
Detection System Using Machine Learning."*

The system analyzes a message, returns a binary classification, a confidence
score, a risk level (low / medium / high), and a plain-language explanation of
why the message looks suspicious. The frontend is a polished dark-themed
single-page app with a hero section, live model performance dashboard, and a
built-in user-testing questionnaire.

---

## What the system does

| Capability | Description |
|---|---|
| **Classification** | Labels a message as Fraud or Not Fraud |
| **Confidence score** | Calibrated probability that the message is fraudulent |
| **Risk level** | Low / Medium / High, derived from the probability |
| **Explainability** | Highlights suspicious keywords, detected URLs, and the words the model relied on most |
| **Metrics dashboard** | Compares the three trained models on the evaluation metrics |
| **User testing** | Built-in questionnaire flow to collect usability feedback |

---

## Tech stack

**Backend** — Python, FastAPI, scikit-learn, pandas
**Frontend** — React (Vite), plain CSS
**ML** — TF-IDF features + Naive Bayes / Logistic Regression / SVM

> The proposal originally suggested Flask. This implementation uses **FastAPI**
> for faster routing and automatic interactive API docs (`/docs`). The
> architecture is otherwise unchanged.

---

## Project structure

```
fraudsense/
├── backend/
│   ├── app.py              FastAPI server (REST API)
│   ├── train.py            Trains & compares the 3 models
│   ├── predictor.py        Loads the model, runs inference
│   ├── preprocess.py       Text cleaning (shared train + inference)
│   ├── explain.py          Explainability (keywords, URLs, signals)
│   ├── requirements.txt
│   ├── data/               Datasets (email + SMS CSVs)
│   └── models/             Saved model, vectorizer, metrics.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js          API client
│   │   ├── styles.css      Dark theme + glass styling
│   │   └── components/
│   │       ├── Hero.jsx          Hero section with live stats
│   │       ├── LogoMark.jsx      Brand SVG mark
│   │       ├── Analyzer.jsx      Message analysis view
│   │       ├── Metrics.jsx       Model performance dashboard
│   │       └── UserTesting.jsx   User-testing questionnaire
│   ├── index.html
│   └── package.json
├── run_backend.sh
├── run_frontend.sh
└── README.md
```

---

## How to run

You need **Python 3.10+** and **Node.js 18+**.

### 1. Backend (terminal 1)

```bash
./run_backend.sh
```

This installs dependencies, trains the model on first run, and starts the API
at `http://localhost:5000`. Interactive API docs are at
`http://localhost:5000/docs`.

To do it manually:

```bash
cd backend
pip install -r requirements.txt
python train.py        # train the models (first time only)
python app.py          # start the API
```

### 2. Frontend (terminal 2)

```bash
./run_frontend.sh
```

Then open `http://localhost:5173` in your browser. The dev server proxies
`/api` calls to the backend automatically.

---

## Methodology

The pipeline follows the proposal's *Initial Plan for Model/Methodology*.

1. **Data preprocessing** (`preprocess.py`) — lowercasing, punctuation and
   whitespace removal, URLs / emails / phone numbers replaced with tokens,
   numbers normalized, labels standardized to binary (fraud = 1, ham = 0).
2. **Feature extraction** — TF-IDF with unigrams and bigrams.
3. **Model training** (`train.py`) — three models are trained and compared:
   Naive Bayes, Logistic Regression, and a probability-calibrated SVM. The
   data is split 80:20 (stratified), and 5-fold cross-validation is run for
   robustness.
4. **Model selection** — the model with the best F1-score is saved. Recall and
   F1 are prioritized because missing a fraud message is worse than a false
   alarm.
5. **Prediction & risk scoring** (`predictor.py`) — outputs the label, a
   calibrated confidence score, and a risk level.
6. **Explainability** (`explain.py`) — surfaces suspicious keywords (grouped
   by category), detected URLs, and the most influential words.

### Evaluation metrics

Accuracy, Precision, Recall, F1-Score, and a Confusion Matrix — all visible in
the in-app **Performa Model** dashboard. Per-channel scores (email vs SMS) are
also reported to confirm the model generalizes across both message types.

---

## Datasets

Two CSV datasets are used, placed in `backend/data/`:

- `email_spam_indo.csv` — Indonesian email messages
- `sms_spam_indo.csv` — Indonesian SMS messages

Both have two columns: `Kategori` (spam / ham) and `Pesan` (the message text).
Combined, they contain roughly 3,800 labeled messages.

**To use different datasets:** replace the CSV files in `backend/data/`. The
loader auto-detects common column names (`Kategori`/`Pesan`, `text`/`label`,
`Text`/`Class`, etc.) and the label standardizer handles `spam`/`ham`, `1`/`0`,
`fraud`/`not_fraud`, and similar encodings. Then re-run `python train.py`.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service status |
| GET | `/api/metrics` | Training metrics for all models |
| POST | `/api/predict` | Classify a message — body: `{"text": "..."}` |
| POST | `/api/feedback` | Store a user-testing questionnaire submission |
| GET | `/api/feedback` | Aggregated user-testing results |

Example:

```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "SELAMAT! Anda pemenang undian. Klik link ini."}'
```

---

## Notes & limitations

- The datasets are Indonesian-language, so the model performs best on
  Indonesian text. The keyword lexicon in `explain.py` is bilingual
  (Indonesian + English).
- User-testing feedback is stored in `backend/data/feedback.json`. This is a
  simple file store suitable for a course project, not a production database.
- This is an academic prototype intended for demonstration and user testing,
  not a deployed security product.
