const ALLOWED_IMAGE_HOSTS = new Set(['v3b.fal.media'])
const DEFAULT_FAL_REQUEST_TIMEOUT_MS = 15000

function isAllowedImageUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const imageUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : ''

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing image URL.' })
  }

  if (!isAllowedImageUrl(imageUrl)) {
    return res.status(400).json({ error: 'Unsupported reference image URL.' })
  }

  const requestTimeout = (() => {
    const t = Number.parseInt(process.env.FAL_REQUEST_TIMEOUT_MS ?? `${DEFAULT_FAL_REQUEST_TIMEOUT_MS}`, 10)
    return Number.isFinite(t) && t > 0 ? t : DEFAULT_FAL_REQUEST_TIMEOUT_MS
  })()

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(requestTimeout),
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to download reference image.' })
    }

    const contentLength = Number.parseInt(response.headers.get('content-length') || '0', 10)
    if (contentLength > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Reference image is larger than 10 MB.' })
    }

    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'Reference image is larger than 10 MB.' })
    }

    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return res.json({ imageData: base64 })
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error
        ? `Unable to load reference image: ${error.message}`
        : 'Unexpected error loading reference image.',
    })
  }
}
