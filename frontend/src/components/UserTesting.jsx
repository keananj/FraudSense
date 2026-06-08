import { useEffect, useState } from 'react'
import { api } from '../api'

/*
 * UserTesting — implements the proposal's "User Testing Plan":
 *   - Questionnaire (agreement, change of mind, comments)
 *   - 1-10 overall rating
 *   - Detailed feedback review
 * Submissions are stored by the backend and aggregated below the form.
 */
export default function UserTesting() {
  const [agreed, setAgreed] = useState(null)
  const [changedMind, setChangedMind] = useState(null)
  const [rating, setRating] = useState(0)
  const [comments, setComments] = useState('')
  const [testedMessage, setTestedMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  function loadSummary() {
    api
      .getFeedback()
      .then(setSummary)
      .catch(() => {
        /* aggregated view is optional */
      })
  }

  useEffect(loadSummary, [])

  function valid() {
    return agreed !== null && changedMind !== null && rating > 0
  }

  async function submit() {
    if (!valid()) {
      setError('Mohon lengkapi pertanyaan dan beri rating sebelum mengirim.')
      return
    }
    setSubmitting(true)
    setError('')
    setStatus('')
    try {
      await api.submitFeedback({
        rating,
        agreed_with_classification: agreed,
        changed_mind: changedMind,
        comments,
        tested_message: testedMessage,
      })
      setStatus('Terima kasih! Tanggapan Anda telah tersimpan.')
      setAgreed(null)
      setChangedMind(null)
      setRating(0)
      setComments('')
      setTestedMessage('')
      loadSummary()
    } catch (e) {
      setError(e.message || 'Gagal mengirim tanggapan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="section-title">Feedback</h2>
      <p className="section-subtitle">
        Setelah mencoba fitur analisis, isi kuesioner singkat ini untuk menilai
        kegunaan dan tingkat kepercayaan terhadap sistem.
      </p>

      <div className="card">
        {/* Q0: which message tested */}
        <div className="q-block q-block-first">
          <div className="q-label">
            Pesan apa yang Anda uji? <span className="q-optional">(opsional)</span>
          </div>
          <textarea
            style={{ minHeight: 80 }}
            placeholder="Tempelkan pesan yang Anda uji di tab Analisis…"
            value={testedMessage}
            onChange={(e) => setTestedMessage(e.target.value)}
          />
        </div>

        {/* Q1 */}
        <div className="q-block">
          <div className="q-label">
            1. Apakah Anda awalnya setuju dengan klasifikasi pesan tersebut?
          </div>
          <div className="choice-row">
            <button
              className={`choice ${agreed === true ? 'selected' : ''}`}
              onClick={() => setAgreed(true)}
            >
              Ya, setuju
            </button>
            <button
              className={`choice ${agreed === false ? 'selected' : ''}`}
              onClick={() => setAgreed(false)}
            >
              Tidak setuju
            </button>
          </div>
        </div>

        {/* Q2 */}
        <div className="q-block">
          <div className="q-label">
            2. Apakah Anda berubah pikiran setelah melihat hasil aplikasi?
          </div>
          <div className="choice-row">
            <button
              className={`choice ${changedMind === true ? 'selected' : ''}`}
              onClick={() => setChangedMind(true)}
            >
              Ya, berubah
            </button>
            <button
              className={`choice ${changedMind === false ? 'selected' : ''}`}
              onClick={() => setChangedMind(false)}
            >
              Tidak berubah
            </button>
          </div>
        </div>

        {/* Q3: rating */}
        <div className="q-block">
          <div className="q-label">
            3. Beri nilai keseluruhan aplikasi (1–10)
          </div>
          <div className="rating-row">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`rating-dot ${rating === n ? 'selected' : ''}`}
                onClick={() => setRating(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Q4: comments */}
        <div className="q-block">
          <div className="q-label">
            4. Masukan rinci — apa yang Anda suka, tidak suka, atau perlu
            diperbaiki?
          </div>
          <textarea
            placeholder="Tuliskan tanggapan Anda…"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <div className="toolbar">
          <span />
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting && <span className="spinner" />}
            {submitting ? 'Mengirim…' : 'Kirim Tanggapan'}
          </button>
        </div>

        {error && <div className="banner-msg error">{error}</div>}
        {status && <div className="banner-msg success">{status}</div>}
      </div>

      {/* Aggregated results */}
      {summary && summary.count > 0 ? (
        <div className="card">
          <h3 className="section-heading" style={{ marginTop: 0 }}>
            Ringkasan Hasil Pengujian
          </h3>
          <div className="stat-row" style={{ marginBottom: 18 }}>
            <div className="stat-card">
              <div className="stat-label">Total Tanggapan</div>
              <div className="stat-num" style={{ fontSize: 24 }}>
                {summary.count}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rata-rata Nilai</div>
              <div className="stat-num" style={{ fontSize: 24 }}>
                {summary.average_rating ?? '—'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Berubah Pikiran</div>
              <div className="stat-num" style={{ fontSize: 24 }}>
                {summary.changed_mind_count ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tingkat Berubah</div>
              <div className="stat-num" style={{ fontSize: 24 }}>
                {summary.count
                  ? `${Math.round(
                      (summary.changed_mind_count / summary.count) * 100
                    )}%`
                  : '—'}
              </div>
            </div>
          </div>

          <div className="feedback-list">
            {summary.submissions
              .slice()
              .reverse()
              .slice(0, 5)
              .map((s, i) => (
                <div className="feedback-item" key={i}>
                  <div className="feedback-meta">
                    <span className="tag signal">Nilai {s.rating}/10</span>
                    <span className="feedback-summary">
                      {s.agreed_with_classification
                        ? 'Setuju dengan hasil'
                        : 'Tidak setuju'}
                      {' · '}
                      {s.changed_mind ? 'Berubah pikiran' : 'Tetap'}
                    </span>
                  </div>
                  {s.comments && (
                    <div className="feedback-comment">"{s.comments}"</div>
                  )}
                </div>
              ))}
          </div>
          <p className="muted-footnote">
            Menampilkan 5 tanggapan terbaru dari {summary.count} total.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            Belum ada tanggapan. Jadilah orang pertama yang mengisi kuesioner di
            atas.
          </div>
        </div>
      )}
    </div>
  )
}
