import { useCallback, useEffect, useRef } from 'react'

function getSourceSize(source) {
  if (!source) return null

  if ('videoWidth' in source && 'videoHeight' in source) {
    if (!source.videoWidth || !source.videoHeight) return null
    return { width: source.videoWidth, height: source.videoHeight }
  }

  const width = source.width || source.clientWidth
  const height = source.height || source.clientHeight
  if (!width || !height) return null

  return { width, height }
}

function drawCover(ctx, source, outputWidth, outputHeight) {
  const size = getSourceSize(source)
  if (!size) return

  const sourceAspect = size.width / size.height
  const outputAspect = outputWidth / outputHeight

  let sx = 0
  let sy = 0
  let sWidth = size.width
  let sHeight = size.height

  if (sourceAspect > outputAspect) {
    sWidth = size.height * outputAspect
    sx = (size.width - sWidth) / 2
  } else {
    sHeight = size.width / outputAspect
    sy = (size.height - sHeight) / 2
  }

  ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight)
}

function ensureCanvas(canvasRef, ctxRef) {
  if (!canvasRef.current) {
    const canvas = document.createElement('canvas')
    canvasRef.current = canvas
    ctxRef.current = canvas.getContext('2d', { alpha: true, desynchronized: true })
  }

  return canvasRef.current
}

export default function useExperienceComposer() {
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const frameRef = useRef(null)
  const lastDrawAtRef = useRef(0)
  const runningRef = useRef(false)
  const streamRef = useRef(null)
  const sourcesRef = useRef({ baseVideoElement: null, webglCanvasElement: null })
  const settingsRef = useRef({ fps: 8, maxWidth: 768 })

  const stop = useCallback(() => {
    runningRef.current = false
    lastDrawAtRef.current = 0

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    sourcesRef.current = { baseVideoElement: null, webglCanvasElement: null }
  }, [])

  const drawFrame = useCallback(() => {
    const canvas = ensureCanvas(canvasRef, ctxRef)
    const ctx = ctxRef.current
    const { baseVideoElement, webglCanvasElement } = sourcesRef.current
    const { maxWidth } = settingsRef.current

    if (!ctx || (!baseVideoElement && !webglCanvasElement)) {
      return
    }

    const viewportWidth = webglCanvasElement?.clientWidth || window.innerWidth || 1
    const viewportHeight = webglCanvasElement?.clientHeight || window.innerHeight || 1
    const aspectRatio = viewportWidth / Math.max(viewportHeight, 1)
    const outputWidth = Math.max(1, Math.round(Math.min(maxWidth, viewportWidth)))
    const outputHeight = Math.max(1, Math.round(outputWidth / Math.max(aspectRatio, 0.001)))

    if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
      canvas.width = outputWidth
      canvas.height = outputHeight
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (baseVideoElement && baseVideoElement.readyState >= 2) {
      drawCover(ctx, baseVideoElement, canvas.width, canvas.height)
    }

    if (webglCanvasElement) {
      ctx.drawImage(webglCanvasElement, 0, 0, canvas.width, canvas.height)
    }
  }, [])

  const start = useCallback(({ baseVideoElement, webglCanvasElement, fps = 8, maxWidth = 768 }) => {
    stop()

    if (!baseVideoElement && !webglCanvasElement) {
      return null
    }

    settingsRef.current = { fps, maxWidth }
    sourcesRef.current = { baseVideoElement, webglCanvasElement }
    runningRef.current = true
    drawFrame()

    const frameDuration = 1000 / fps
    const tick = (timestamp) => {
      if (!runningRef.current) {
        return
      }

      if (!lastDrawAtRef.current || timestamp - lastDrawAtRef.current >= frameDuration) {
        lastDrawAtRef.current = timestamp
        drawFrame()
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)

    const canvas = ensureCanvas(canvasRef, ctxRef)
    const captureStream = canvas.captureStream(fps)
    streamRef.current = captureStream
    return captureStream
  }, [drawFrame, stop])

  useEffect(() => () => stop(), [stop])

  return { start, stop }
}
