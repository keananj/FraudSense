import { useEffect, useState } from 'react'
import { api } from '../api'

/* Confusion matrix as a 2x2 visual grid. cm = [[TN, FP], [FN, TP]] */
function ConfusionMatrix({ cm }) {
  if (!cm || cm.length !== 2) return null
  const [[tn, fp], [fn, tp]] = cm
  const cells = [
    { label: 'True Negative', num: tn, cls: 'correct' },
    { label: 'False Positive', num: fp, cls: 'wrong' },
    { label: 'False Negative', num: fn, cls: 'wrong' },
    { label: 'True Positive', num: tp, cls: 'correct' },
  ]
  return (
    <div className="cm-grid">
      {cells.map((c) => (
        <div key={c.label} className={`cm-cell ${c.cls}`}>
          <div className="cm-label">{c.label}</div>
          <div className="cm-num">{c.num}</div>
        </div>
      ))}
    </div>
  )
}

const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)

function Skeleton() {
  return (
    <div>
      <h2 className="section-title">Performance</h2>
      <p className="section-subtitle">Memuat metrik dari server…</p>
      <div className="stat-row">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat-card" key={i}>
            <div className="skeleton-line skeleton-short" />
            <div className="skeleton-line skeleton-tall" />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="skeleton-line skeleton-short" />
        <div className="skeleton-line" style={{ height: 180, marginTop: 16 }} />
      </div>
    </div>
  )
}

export default function Metrics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .metrics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div>
        <h2 className="section-title">Performance</h2>
        <div className="banner-msg error">{error}</div>
        <p className="muted-note">
          Pastikan model sudah dilatih dengan menjalankan{' '}
          <code className="inline-code">python train.py</code> di folder backend.
        </p>
      </div>
    )
  }

  const best = data.results.find((r) => r.model === data.best_model)
  const ds = data.dataset || {}

  return (
    <div>
      <h2 className="section-title">Performance</h2>
      <p className="section-subtitle">
        Hasil evaluasi tiga model pada {ds.test_size || '—'} data uji. Model
        terbaik dipilih berdasarkan F1-Score.
      </p>

      {/* Headline stats */}
      <div className="stat-row">
        <div className="stat-card accent">
          <div className="stat-label">Model Terbaik</div>
          <div className="stat-num" style={{ fontSize: 18, marginTop: 10 }}>
            {data.best_model}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Akurasi</div>
          <div className="stat-num">{pct(best?.accuracy)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">F1-Score</div>
          <div className="stat-num">{pct(best?.f1)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Recall</div>
          <div className="stat-num">{pct(best?.recall)}</div>
        </div>
      </div>

      {/* Model comparison table */}
      <div className="card">
        <h3 className="section-heading" style={{ marginTop: 0 }}>
          Perbandingan Model
        </h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Akurasi</th>
                <th>Presisi</th>
                <th>Recall</th>
                <th>F1</th>
                <th>CV F1</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => (
                <tr
                  key={r.model}
                  className={r.model === data.best_model ? 'best' : ''}
                >
                  <td>{r.model}</td>
                  <td>{pct(r.accuracy)}</td>
                  <td>{pct(r.precision)}</td>
                  <td>{pct(r.recall)}</td>
                  <td>{pct(r.f1)}</td>
                  <td>
                    {r.cv_f1_mean != null
                      ? `${pct(r.cv_f1_mean)} ±${(r.cv_f1_std * 100).toFixed(1)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted-footnote">
          CV F1 = rata-rata F1 dari validasi silang 5-lipat pada data latih.
        </p>
      </div>

      {/* Confusion matrix */}
      <div className="card">
        <h3 className="section-heading" style={{ marginTop: 0 }}>
          Confusion Matrix — {data.best_model}
        </h3>
        <ConfusionMatrix cm={best?.confusion_matrix} />
      </div>

      {/* Per-channel performance */}
      {data.per_channel && (
        <div className="card">
          <h3 className="section-heading" style={{ marginTop: 0 }}>
            Performa per Saluran
          </h3>
          <p className="muted-note" style={{ marginBottom: 14 }}>
            Menguji kemampuan model untuk bekerja baik pada email maupun SMS.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Saluran</th>
                  <th>Jumlah Uji</th>
                  <th>Akurasi</th>
                  <th>Recall</th>
                  <th>F1</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.per_channel).map(([ch, s]) => (
                  <tr key={ch}>
                    <td>{ch === 'email' ? 'Email' : 'SMS'}</td>
                    <td>{s.samples}</td>
                    <td>{pct(s.accuracy)}</td>
                    <td>{pct(s.recall)}</td>
                    <td>{pct(s.f1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dataset summary */}
      <div className="card">
        <h3 className="section-heading" style={{ marginTop: 0 }}>
          Ringkasan Dataset
        </h3>
        <div className="stat-row" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-label">Total Data</div>
            <div className="stat-num" style={{ fontSize: 22 }}>
              {ds.total?.toLocaleString('id-ID') ?? '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Penipuan</div>
            <div className="stat-num" style={{ fontSize: 22 }}>
              {ds.fraud?.toLocaleString('id-ID') ?? '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sah / Aman</div>
            <div className="stat-num" style={{ fontSize: 22 }}>
              {ds.legit?.toLocaleString('id-ID') ?? '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Ukuran Kosakata</div>
            <div className="stat-num" style={{ fontSize: 22 }}>
              {ds.vocab_size?.toLocaleString('id-ID') ?? '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
