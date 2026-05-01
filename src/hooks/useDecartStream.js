import { useState, useRef, useCallback, useEffect } from 'react'
import { fal } from '@fal-ai/client'

const FAL_KEY = import.meta.env.VITE_FAL_KEY || ''

fal.config({ credentials: FAL_KEY })

const FRAME_INTERVAL = 100 // ms between frames (~10 fps)

function captureFrameAsDataURI(video) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.7)
}

export default function useDecartStream() {
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [errorMsg, setErrorMsg] = useState('')
  const editedVideoRef = useRef(null) // will hold a canvas element instead of video
  const connectionRef = useRef(null)
  const intervalRef = useRef(null)
  const canvasRef = useRef(null)
  const promptRef = useRef('')
  const referenceImageRef = useRef('')

  // Create an offscreen canvas for rendering received frames
  useEffect(() => {
    canvasRef.current = document.createElement('canvas')
    canvasRef.current.width = 640
    canvasRef.current.height = 480
  }, [])

  const start = useCallback(async (sourceVideo, prompt, referenceImageUrl) => {
    if (!FAL_KEY) {
      setErrorMsg('Falta VITE_FAL_KEY')
      setStatus('error')
      return
    }
    if (!sourceVideo) {
      setErrorMsg('No hay fuente de vídeo disponible')
      setStatus('error')
      return
    }

    promptRef.current = prompt || 'Substitute the current top with the outfit from the reference image, matching its color, material, and fit'
    referenceImageRef.current = referenceImageUrl || ''

    try {
      setStatus('connecting')
      setErrorMsg('')

      const connection = fal.realtime.connect('decart/lucy2-vton/realtime', {
        onResult: (result) => {
          if (result?.images?.[0]?.url) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              const canvas = canvasRef.current
              if (canvas) {
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                // Update the video element with the canvas stream
                if (editedVideoRef.current && !editedVideoRef.current.srcObject) {
                  const stream = canvas.captureStream(30)
                  editedVideoRef.current.srcObject = stream
                  editedVideoRef.current.play().catch(() => {})
                }
              }
            }
            img.src = result.images[0].url
          } else if (result?.image?.url) {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
              const canvas = canvasRef.current
              if (canvas) {
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                if (editedVideoRef.current && !editedVideoRef.current.srcObject) {
                  const stream = canvas.captureStream(30)
                  editedVideoRef.current.srcObject = stream
                  editedVideoRef.current.play().catch(() => {})
                }
              }
            }
            img.src = result.image.url
          }

          if (status !== 'connected') {
            setActive(true)
            setStatus('connected')
          }
        },
        onError: (err) => {
          console.error('fal.ai error:', err)
          setErrorMsg('Error de conexión con fal.ai: ' + (err?.message || err))
          setStatus('error')
        },
      })

      connectionRef.current = connection

      // Start sending frames at regular intervals
      intervalRef.current = setInterval(() => {
        if (!sourceVideo || sourceVideo.readyState < 2) return
        const frameDataURI = captureFrameAsDataURI(sourceVideo)

        const payload = {
          prompt: promptRef.current,
          image_url: frameDataURI,
        }
        if (referenceImageRef.current) {
          payload.reference_image_url = referenceImageRef.current
        }

        connection.send(payload)
      }, FRAME_INTERVAL)

      setActive(true)
      setStatus('connected')
    } catch (err) {
      console.error('Error iniciando fal.ai:', err)
      setErrorMsg('Error: ' + (err?.message || String(err)))
      setStatus('error')
    }
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    connectionRef.current?.close()
    connectionRef.current = null
    if (editedVideoRef.current) editedVideoRef.current.srcObject = null
    setActive(false)
    setStatus('idle')
    setErrorMsg('')
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop])

  return { active, status, errorMsg, editedVideoRef, start, stop }
}
