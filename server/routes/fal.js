import { Router } from 'express'
import { env, isAllowedRealtimeApp } from '../config/env.js'

const router = Router()
const ALLOWED_IMAGE_HOSTS = new Set(['v3b.fal.media'])

function isAllowedImageUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

router.post('/realtime-token', async (req, res) => {
  const app = typeof req.body?.app === 'string' ? req.body.app.trim() : ''

  if (!app) {
    res.status(400).json({ error: 'Missing realtime app identifier.' })
    return
  }

  if (!isAllowedRealtimeApp(app)) {
    res.status(400).json({ error: 'Unsupported realtime app requested.' })
    return
  }

  try {
    const signal = AbortSignal.timeout(env.requestTimeoutMs)
    const response = await fetch('https://rest.fal.ai/tokens/realtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${env.falKey}`,
      },
      signal,
      body: JSON.stringify({
        app,
        duration: env.tokenDurationSeconds,
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
      res.status(response.status).json({
        error: payload?.detail || payload?.error || 'Failed to create the realtime token.',
      })
      return
    }

    const token = typeof payload === 'string' ? payload : payload?.token

    if (!token) {
      res.status(502).json({ error: 'fal.ai returned an empty realtime token.' })
      return
    }

    res.json({ token, expiresIn: env.tokenDurationSeconds })
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error
        ? `Unable to reach fal.ai realtime token endpoint: ${error.message}`
        : 'Unexpected error requesting fal.ai token.',
    })
  }
})

router.post('/image-base64', async (req, res) => {
  const imageUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : ''

  if (!imageUrl) {
    res.status(400).json({ error: 'Missing image URL.' })
    return
  }

  if (!isAllowedImageUrl(imageUrl)) {
    res.status(400).json({ error: 'Unsupported reference image URL.' })
    return
  }

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(env.requestTimeoutMs),
    })

    if (!response.ok) {
      res.status(response.status).json({ error: 'Failed to download reference image.' })
      return
    }

    const contentLength = Number.parseInt(response.headers.get('content-length') || '0', 10)
    if (contentLength > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'Reference image is larger than 10 MB.' })
      return
    }

    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'Reference image is larger than 10 MB.' })
      return
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64')
    res.json({ imageData: base64 })
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error
        ? `Unable to load reference image: ${error.message}`
        : 'Unexpected error loading reference image.',
    })
  }
})

export default router
