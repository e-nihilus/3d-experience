const MODEL_ID = 'decart/lucy2-vton/realtime'
const DEFAULT_TOKEN_DURATION_SECONDS = 60
const DEFAULT_FAL_REQUEST_TIMEOUT_MS = 15000

function isAllowedRealtimeApp(app) {
  return app === MODEL_ID || app === `${MODEL_ID}/realtime`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const falKey = process.env.VITE_FAL_KEY || process.env.FAL_KEY || ''
  if (!falKey) {
    return res.status(500).json({ error: 'Server misconfiguration: missing FAL API key.' })
  }

  const app = typeof req.body?.app === 'string' ? req.body.app.trim() : ''

  if (!app) {
    return res.status(400).json({ error: 'Missing realtime app identifier.' })
  }

  if (!isAllowedRealtimeApp(app)) {
    return res.status(400).json({ error: 'Unsupported realtime app requested.' })
  }

  const tokenDuration = (() => {
    const d = Number.parseInt(process.env.FAL_REALTIME_TOKEN_DURATION ?? `${DEFAULT_TOKEN_DURATION_SECONDS}`, 10)
    return Number.isFinite(d) && d > 0 ? d : DEFAULT_TOKEN_DURATION_SECONDS
  })()

  const requestTimeout = (() => {
    const t = Number.parseInt(process.env.FAL_REQUEST_TIMEOUT_MS ?? `${DEFAULT_FAL_REQUEST_TIMEOUT_MS}`, 10)
    return Number.isFinite(t) && t > 0 ? t : DEFAULT_FAL_REQUEST_TIMEOUT_MS
  })()

  try {
    const signal = AbortSignal.timeout(requestTimeout)
    const response = await fetch('https://rest.fal.ai/tokens/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${falKey}`,
      },
      signal,
      body: JSON.stringify({
        app,
        duration: tokenDuration,
      }),
    })

    const text = await response.text()
    const payload = (() => {
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    })()

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.detail || payload?.error || 'Failed to create the realtime token.',
      })
    }

    const token = typeof payload === 'string' ? payload : payload?.token

    if (!token) {
      return res.status(502).json({ error: 'fal.ai returned an empty realtime token.' })
    }

    return res.json({ token, expiresIn: tokenDuration })
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error
        ? `Unable to reach fal.ai realtime token endpoint: ${error.message}`
        : 'Unexpected error requesting fal.ai token.',
    })
  }
}
