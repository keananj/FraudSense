"""
preprocess.py
-------------
Text preprocessing for FraudSense, implementing the steps from the proposal's
"Data Preprocessing" section, adapted for the Indonesian-language email and
SMS spam datasets:

  - Convert all text to lowercase
  - Remove unnecessary characters (punctuation, extra whitespace)
  - Handle URLs by replacing them with a special token ("url")
  - Normalize numbers and phone numbers
  - Standardize labels into binary format (fraud/spam = 1, not_fraud/ham = 0)

The same clean_text() function is used at BOTH train time and inference time
so the model always sees consistently processed input.
"""

import re

# Pre-compiled regex patterns (compiled once for speed).
_URL_RE = re.compile(
    r"(?:https?://|www\.)\S+|\b\S+\.(?:com|net|co|org|io|id)\b",
    re.IGNORECASE,
)
_EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
_PHONE_RE = re.compile(r"\b(?:\+?62|0)\d[\d\s\-]{6,}\d\b")
_NUM_RE = re.compile(r"\b\d[\d,\.]*\b")
_PUNCT_RE = re.compile(r"[^a-z0-9\s]")
_WS_RE = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """Return a normalized version of `text` ready for TF-IDF vectorization."""
    if text is None:
        return ""
    text = str(text).lower()

    # Replace URLs / emails / phone numbers with tokens BEFORE stripping
    # punctuation, otherwise the dots and digits get destroyed.
    text = _URL_RE.sub(" url ", text)
    text = _EMAIL_RE.sub(" emailaddr ", text)
    text = _PHONE_RE.sub(" phonenum ", text)

    # Replace remaining standalone numbers with a token.
    text = _NUM_RE.sub(" number ", text)

    # Remove remaining punctuation / special characters.
    text = _PUNCT_RE.sub(" ", text)

    # Collapse repeated whitespace.
    text = _WS_RE.sub(" ", text).strip()
    return text


def standardize_label(value) -> int:
    """Map a variety of label encodings to binary (fraud/spam=1, ham=0).

    Handles the Indonesian dataset's 'spam'/'ham' labels as well as common
    English encodings, so real Kaggle files in either language work.
    """
    if value is None:
        return 0
    s = str(value).strip().lower()
    fraud_tokens = {
        "1", "spam", "fraud", "scam", "phishing", "fraudulent",
        "true", "yes", "penipuan",
    }
    return 1 if s in fraud_tokens else 0


if __name__ == "__main__":
    samples = [
        "Plg Yth: Simcard anda mendptkan bonus poin 555 dr:PT.INDOSAT "
        "u/info klik di www.indosat-555.blogspot.com atau Hub:021-3338-0074.",
        "Iya ih ko sedih sih gtau kapan lg ke bandung :(",
    ]
    for s in samples:
        print(f"  IN : {s}")
        print(f"  OUT: {clean_text(s)}\n")
