import { useState, useRef, useCallback, useEffect } from 'react'

export default function useCameraStream() {
  const [available, setAvailable] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setAvailable(true)
      return stream
    } catch {
      setAvailable(false)
      return null
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setAvailable(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  return { available, videoRef, streamRef, start, stop }
}
