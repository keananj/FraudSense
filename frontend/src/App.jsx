import { useEffect, useState } from 'react'
import { api } from './api'
import Analyzer from './components/Analyzer'
import LogoMark from './components/LogoMark'
import Metrics from './components/Metrics'
import UserTesting from './components/UserTesting'

const TABS = [
  { id: 'analyzer', label: 'Home' },
  { id: 'metrics', label: 'Performance' },
  { id: 'testing', label: 'Feedback' },
]

export default function App() {
  const [tab, setTab] = useState('analyzer')
  const [online, setOnline] = useState(null)

  useEffect(() => {
    api
      .health()
      .then((h) => setOnline(h.model_ready))
      .catch(() => setOnline(false))
  }, [])

  // Scroll to top on tab change so users always land at the top of a section.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [tab])

  return (
    <div className="app">
      <header className="header">
        <div className="container header-inner">
          <div className="logo" onClick={() => setTab('analyzer')}>
            <LogoMark size={30} />
            Fraud<span>Sense</span>
          </div>
          <nav className="nav" aria-label="Navigasi utama">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">
        <div
          className={
            tab === 'analyzer' ? 'container' : 'container container-narrow'
          }
        >
          {online === false && (
            <div className="banner-msg error" style={{ marginBottom: 24 }}>
              Tidak dapat terhubung ke server, atau model belum dilatih.
              Jalankan backend dan{' '}
              <code className="inline-code">python train.py</code> terlebih
              dahulu.
            </div>
          )}
          {tab === 'analyzer' && <Analyzer />}
          {tab === 'metrics' && <Metrics />}
          {tab === 'testing' && <UserTesting />}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <LogoMark size={22} />
              <span>FraudSense</span>
            </div>
            <div className="footer-meta">
              Kelompok 1 · Universitas Bina Nusantara · 2026
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
