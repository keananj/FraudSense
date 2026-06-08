import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import Hero from './Hero'

/* Sample messages so reviewers can try the system quickly. */
const EXAMPLES = [
  {
    label: 'SMS undian',
    text: 'SELAMAT! No.Anda terpilih sbg pemenang undian berhadiah Rp.50.000.000. Klik www.undian-resmi.blogspot.com & verifikasi data Anda skrg juga.',
  },
  {
    label: 'Email phishing',
    text: 'Akun bank Anda telah ditangguhkan karena aktivitas mencurigakan. Segera konfirmasi nomor rekening dan kata sandi Anda melalui tautan berikut untuk menghindari pemblokiran permanen.',
  },
  {
    label: 'Pesan normal',
    text: 'Halo, besok jadi kumpul tugas kelompok jam 2 di perpustakaan ya. Jangan lupa bawa laptop.',
  },
]

const CATEGORY_LABELS = {
  urgency: 'Mendesak',
  credentials: 'Data Pribadi',
  reward: 'Iming-iming Hadiah',
  pressure: 'Tekanan/Ancaman',
  money: 'Uang/Biaya',
  action: 'Ajakan Klik',
}


function Meter({ value, fraud }) {
  return (
    <div className="meter">
      <div
        className="meter-fill"
        style={{
          width: `${Math.max(2, value)}%`,
          background: fraud
            ? 'linear-gradient(90deg, var(--red-deep), var(--red-bright))'
            : 'linear-gradient(90deg, #15803d, #22c55e)',
        }}
      />
    </div>
  )
}

export default function Analyzer() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const analyzerRef = useRef(null)
  const resultRef = useRef(null)

  /* Scroll the result into view after it arrives, so users see it without
     having to scroll manually past the hero. */
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  function scrollToAnalyzer() {
    analyzerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function analyze() {
    if (!text.trim()) {
      setError('Masukkan teks pesan terlebih dahulu.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await api.predict(text)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Gagal menganalisis pesan.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setText('')
    setResult(null)
    setError('')
  }

  const isFraud = result?.label === 1

  return (
    <div>
      {/* Hero stays above the analyzer per the project design. */}
      <Hero onCta={scrollToAnalyzer} />

      <div className="analyzer-header" ref={analyzerRef}>
        <div className="analyzer-eyebrow">Fitur Utama</div>
        <h2 className="analyzer-title">Analisis Pesan</h2>
        <p className="analyzer-sub">
          Tempelkan isi email atau SMS untuk memeriksa apakah pesan tersebut
          terindikasi penipuan.
        </p>
      </div>

      <div className="card">
        <label className="field-label" htmlFor="msg">
          Teks Pesan
        </label>
        <textarea
          id="msg"
          placeholder="Tempelkan isi pesan di sini…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={20000}
        />

        <div className="examples">
          <span className="examples-label">Coba contoh:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              className="example-chip"
              onClick={() => {
                setText(ex.text)
                setResult(null)
                setError('')
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <span className="char-count">
            {text.length.toLocaleString('id-ID')} / 20.000 karakter
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={reset} disabled={loading}>
              Bersihkan
            </button>
            <button
              className="btn btn-primary"
              onClick={analyze}
              disabled={loading || !text.trim()}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Menganalisis…' : 'Analisis Pesan'}
            </button>
          </div>
        </div>

        {error && <div className="banner-msg error">{error}</div>}
      </div>

      {/* Result */}
      {result && (
        <div className="card fade-in" ref={resultRef}>
          <div className={`result-banner ${isFraud ? 'fraud' : 'legit'}`}>
            <div className="result-icon">{isFraud ? '!' : '✓'}</div>
            <div>
              <div className="result-verdict">
                {isFraud ? 'Terindikasi Penipuan' : 'Pesan Aman'}
              </div>
              <div className="result-sub">
                {isFraud
                  ? 'Pesan ini menunjukkan pola yang umum pada penipuan digital.'
                  : 'Tidak ditemukan indikator penipuan yang signifikan.'}
              </div>
            </div>
          </div>

          <div className="score-grid">
            <div className="score-box">
              <div className="score-box-label">Skor Keyakinan (Penipuan)</div>
              <div
                className="score-value"
                style={{ color: isFraud ? 'var(--red-bright)' : '#4ade80' }}
              >
                {result.confidence_pct}%
              </div>
              <Meter value={result.confidence_pct} fraud={isFraud} />
            </div>
            <div className="score-box">
              <div className="score-box-label">Tingkat Risiko</div>
              <div style={{ marginTop: 6 }}>
                <span className={`risk-pill risk-${result.risk_level}`}>
                  {result.risk_level === 'high'
                    ? 'Tinggi'
                    : result.risk_level === 'medium'
                    ? 'Sedang'
                    : 'Rendah'}
                </span>
              </div>
              <Meter
                value={result.risk_level === 'high' ? 90 : result.risk_level === 'medium' ? 55 : 25}
                fraud={result.risk_level !== 'low'}
              />
              <div className="score-footnote">
                Berdasarkan probabilitas model klasifikasi.
              </div>
            </div>
          </div>

          {/* Explanation */}
          <h3 className="section-heading">Mengapa hasilnya demikian?</h3>
          <ul className="reason-list">
            {result.explanation.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {result.explanation.keywords.length > 0 && (
            <>
              <h3 className="section-heading">Kata Kunci Mencurigakan</h3>
              <div className="tag-cloud">
                {result.explanation.keywords.map((k, i) => (
                  <span key={i} className={`tag kw-${k.category}`}>
                    {k.keyword}
                    <span className="tag-meta">
                      {' · '}
                      {CATEGORY_LABELS[k.category] || k.category}
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}

          {result.explanation.model_signals.length > 0 && (
            <>
              <h3 className="section-heading">
                Kata Paling Berpengaruh (Model)
              </h3>
              <div className="tag-cloud">
                {result.explanation.model_signals.map((s, i) => (
                  <span key={i} className="tag signal">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {result.explanation.urls.length > 0 && (
            <>
              <h3 className="section-heading">Tautan Terdeteksi</h3>
              <div className="url-list">
                {result.explanation.urls.map((u, i) => (
                  <div key={i} className="url-item">
                    {u}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
