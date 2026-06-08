import { useEffect, useState } from 'react'
import { api } from '../api'

/*
 * Hero — sits above the analyzer. Provides the system's value
 * proposition, real performance numbers pulled from /api/metrics, and a
 * brief explanation of how the model works.
 */

const FEATURES = [
  {
    icon: '⚡',
    title: 'Analisis Instan',
    desc: 'Hasil klasifikasi dalam hitungan detik, lengkap dengan skor keyakinan dan tingkat risiko.',
  },
  {
    icon: '🔎',
    title: 'Penjelasan Transparan',
    desc: 'Sistem menampilkan kata kunci mencurigakan dan alasan di balik setiap prediksi.',
  },
  {
    icon: '📨',
    title: 'Email & SMS',
    desc: 'Satu model bekerja untuk berbagai saluran komunikasi — email panjang maupun pesan singkat.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Pembersihan Teks',
    desc: 'Lowercase, hapus karakter khusus, normalisasi URL dan angka.',
  },
  {
    num: '02',
    title: 'Ekstraksi Fitur',
    desc: 'TF-IDF mengubah teks menjadi representasi numerik yang dapat dipelajari.',
  },
  {
    num: '03',
    title: 'Klasifikasi',
    desc: 'SVM terpilih sebagai model terbaik dari tiga kandidat yang diuji.',
  },
  {
    num: '04',
    title: 'Hasil & Penjelasan',
    desc: 'Label, skor keyakinan, tingkat risiko, dan alasan ditampilkan ke pengguna.',
  },
]

export default function Hero({ onCta }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api
      .metrics()
      .then((data) => {
        const best = data.results.find((r) => r.model === data.best_model)
        setStats({
          accuracy: (best.accuracy * 100).toFixed(1),
          f1: (best.f1 * 100).toFixed(1),
          recall: (best.recall * 100).toFixed(1),
          dataset: data.dataset?.total ?? null,
        })
      })
      .catch(() => {
        // Live metrics unavailable; the hero still renders cleanly.
      })
  }, [])

  return (
    <section className="hero">
      <div className="hero-eyebrow">Machine Learning · Bahasa Indonesia</div>

      <h1 className="hero-title">
        Deteksi pesan penipuan
        <br />
        dalam <span className="accent">hitungan detik</span>.
      </h1>

      <p className="hero-lede">
        FraudSense menganalisis email dan SMS untuk mengidentifikasi pola
        penipuan, phishing, dan social engineering — lalu menjelaskan
        alasannya, bukan sekadar memberi label.
      </p>

      <div className="hero-actions">
        <button className="btn btn-primary btn-large" onClick={onCta}>
          Analisis Pesan Sekarang →
        </button>
        <a
          className="btn btn-ghost btn-large"
          href="#cara-kerja"
        >
          Lihat Cara Kerja
        </a>
      </div>

      {/* Live stats from the trained model */}
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-num">
            {stats ? stats.accuracy : '—'}
            <span className="unit">%</span>
          </div>
          <div className="hero-stat-label">Akurasi</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-num">
            {stats ? stats.f1 : '—'}
            <span className="unit">%</span>
          </div>
          <div className="hero-stat-label">F1-Score</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-num">
            {stats ? stats.recall : '—'}
            <span className="unit">%</span>
          </div>
          <div className="hero-stat-label">Recall</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-num">
            {stats?.dataset ? stats.dataset.toLocaleString('id-ID') : '—'}
          </div>
          <div className="hero-stat-label">Data Latih</div>
        </div>
      </div>

      {/* Features */}
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>
            <div className="feature-icon" aria-hidden>
              {f.icon}
            </div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="how-section" id="cara-kerja">
        <h2 className="how-heading">Cara Kerja</h2>
        <p className="how-sub">
          Empat tahap pipeline dari teks mentah hingga hasil klasifikasi.
        </p>
        <div className="how-grid">
          {STEPS.map((s) => (
            <div className="step" key={s.num}>
              <div className="step-num">TAHAP {s.num}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
