"""
explain.py
----------
Lightweight explainability component, as described in the proposal's
"Explainability Mechanism" section. Identifies *why* a message looks
suspicious by surfacing:

  - Suspicious keywords (Indonesian + English) grouped by category
  - Presence of URLs
  - Use of urgent / persuasive language

It also exposes the model's most influential words (via TF-IDF weights x
model coefficients) so the explanation reflects what the classifier actually
relied on.

The keyword lexicon is bilingual because the datasets are Indonesian; English
terms are kept so the system still works on English input.
"""

import re

# Categorized suspicious keyword lexicon (Indonesian + English).
SUSPICIOUS_KEYWORDS = {
    "urgency": [
        # Indonesian
        "segera", "sekarang", "buruan", "jangan lewatkan", "terbatas",
        "kesempatan terakhir", "cepat", "berakhir", "hari ini juga",
        # English
        "urgent", "immediately", "act fast", "expires", "last chance",
        "limited time", "hurry",
    ],
    "credentials": [
        # Indonesian
        "kata sandi", "password", "pin", "kode otp", "otp", "verifikasi",
        "konfirmasi", "nomor rekening", "data pribadi", "nik", "ktp",
        "login", "masuk akun",
        # English
        "verify", "confirm your identity", "account number", "cvv",
        "credentials", "bank account",
    ],
    "reward": [
        # Indonesian
        "selamat", "anda menang", "pemenang", "hadiah", "gratis", "bonus",
        "undian", "berhadiah", "klaim", "terpilih", "voucher", "saldo",
        # English
        "winner", "congratulations", "prize", "free", "gift card", "claim",
        "selected", "lottery",
    ],
    "pressure": [
        # Indonesian
        "diblokir", "diblokir permanen", "ditangguhkan", "akun anda",
        "dihapus", "kehilangan akses", "gagal", "terancam",
        # English
        "suspended", "locked", "blocked", "compromised", "terminated",
        "deleted",
    ],
    "money": [
        # Indonesian
        "uang", "transfer", "biaya", "biaya admin", "biaya transfer",
        "pinjaman", "kredit", "investasi", "rupiah", "pembayaran",
        # English
        "transfer", "processing fee", "payment", "wire", "fee", "loan",
    ],
    "action": [
        # Indonesian
        "klik", "klik di sini", "klik link", "kunjungi", "buka tautan",
        "daftar sekarang", "hubungi", "balas pesan",
        # English
        "click", "click here", "visit", "register now",
    ],
}

_URL_RE = re.compile(
    r"(?:https?://|www\.)\S+|\b\S+\.(?:com|net|co|org|io|id)\b",
    re.IGNORECASE,
)

# Human-readable reason text per category (Indonesian, since the UI/data
# is Indonesian-focused; concise and user-friendly).
_CATEGORY_REASONS = {
    "urgency": "menciptakan rasa mendesak yang berlebihan",
    "credentials": "meminta data pribadi atau kredensial sensitif",
    "reward": "menawarkan hadiah atau imbalan yang tidak terduga",
    "pressure": "menggunakan bahasa yang mengancam atau menekan",
    "money": "melibatkan uang, biaya, atau transfer dana",
    "action": "mendorong Anda mengklik tautan atau merespons cepat",
}


def find_keywords(raw_text: str):
    """Return list of {keyword, category} for suspicious phrases found.

    Uses word-boundary matching so short keywords do not match inside
    unrelated longer words.
    """
    lower = raw_text.lower()
    hits = []
    seen = set()
    for category, words in SUSPICIOUS_KEYWORDS.items():
        for kw in words:
            if kw in seen:
                continue
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, lower):
                seen.add(kw)
                hits.append({"keyword": kw, "category": category})
    return hits


def find_urls(raw_text: str):
    """Return list of raw URL strings found in the message."""
    return _URL_RE.findall(raw_text)


def _extract_linear_coef(model):
    """Return a 1-D coefficient array for linear models, including a
    CalibratedClassifierCV wrapping a LinearSVC (averaged across folds)."""
    coef = getattr(model, "coef_", None)
    if coef is not None:
        return coef[0]
    # CalibratedClassifierCV: average the base estimators' coefficients.
    calibrated = getattr(model, "calibrated_classifiers_", None)
    if calibrated:
        import numpy as np
        coefs = []
        for cc in calibrated:
            base = getattr(cc, "estimator", None)
            base_coef = getattr(base, "coef_", None)
            if base_coef is not None:
                coefs.append(base_coef[0])
        if coefs:
            return np.mean(coefs, axis=0)
    return None


def top_model_signals(raw_text: str, vectorizer, model, top_n: int = 6):
    """
    Return the words in this message that most pushed the model toward a
    'fraud' prediction, using TF-IDF weights x model coefficients where
    available (Logistic Regression / SVM). Falls back gracefully.
    """
    try:
        from preprocess import clean_text
        cleaned = clean_text(raw_text)
        X = vectorizer.transform([cleaned])
        feature_names = vectorizer.get_feature_names_out()

        weights = _extract_linear_coef(model)
        if weights is not None:
            contributions = X.multiply(weights).toarray()[0]
            idx = contributions.argsort()[::-1]
            signals = []
            for i in idx[:top_n]:
                if contributions[i] > 0:
                    signals.append(feature_names[i])
            return signals

        # Naive Bayes: approximate with log-prob difference per feature.
        log_prob = getattr(model, "feature_log_prob_", None)
        if log_prob is not None:
            diff = log_prob[1] - log_prob[0]
            present = X.nonzero()[1]
            ranked = sorted(present, key=lambda i: diff[i], reverse=True)
            return [feature_names[i] for i in ranked[:top_n] if diff[i] > 0]
    except Exception:
        pass
    return []


def build_explanation(raw_text: str, prediction: int, vectorizer=None, model=None):
    """Assemble a human-readable explanation dict for the UI."""
    keywords = find_keywords(raw_text)
    urls = find_urls(raw_text)
    signals = []
    if vectorizer is not None and model is not None:
        signals = top_model_signals(raw_text, vectorizer, model)

    reasons = []
    if keywords:
        cats = []
        for k in keywords:
            if k["category"] not in cats:
                cats.append(k["category"])
        for c in cats:
            reasons.append(_CATEGORY_REASONS.get(c, c))
    if urls:
        reasons.append(
            f"mengandung {len(urls)} tautan, sering dipakai untuk mengarahkan korban")

    if prediction == 1 and not reasons:
        reasons.append("memiliki pola bahasa yang umum ditemukan pada pesan penipuan")
    if prediction == 0 and not reasons:
        reasons.append("tidak ditemukan indikator penipuan yang kuat")

    return {
        "keywords": keywords,
        "urls": urls,
        "model_signals": signals,
        "reasons": reasons,
    }


if __name__ == "__main__":
    import json
    txt = ("SELAMAT! Anda pemenang undian berhadiah. Klik di sini dan verifikasi "
           "data pribadi Anda di http://hadiah-palsu.com untuk klaim sekarang.")
    print(json.dumps(build_explanation(txt, 1), indent=2, ensure_ascii=False))
