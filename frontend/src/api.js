/**
 * api.js — thin wrapper around the FraudSense backend API.
 * In development, Vite proxies /api to the FastAPI server on port 5000.
 */

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || data.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  health: () => request('/health'),

  predict: (text) =>
    request('/predict', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  metrics: () => request('/metrics'),

  submitFeedback: (payload) =>
    request('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getFeedback: () => request('/feedback'),
}
