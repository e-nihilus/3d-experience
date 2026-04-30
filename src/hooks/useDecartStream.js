import { useState, useRef, useCallback } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

const DECART_API_KEY = import.meta.env.VITE_DECART_API_KEY || ''

export default function useDecartStream() {
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const realtimeRef = useRef(null)
  const editedVideoRef = useRef(null)

  const start = useCallback(async (cameraStream, prompt) => {
    if (!DECART_API_KEY) {
      setStatus('error')
      console.error('Falta VITE_DECART_API_KEY en .env.local')
      return
    }
    if (!cameraStream) {
      setStatus('error')
      console.error('No hay stream de cámara disponible')
      return
    }

    try {
      setStatus('connecting')
      const model = models.realtime('lucy-2.1')

      const client = createDecartClient({ apiKey: DECART_API_KEY })

      const realtimeClient = await client.realtime.connect(cameraStream, {
        model,
        onRemoteStream: (editedStream) => {
          if (editedVideoRef.current) {
            editedVideoRef.current.srcObject = editedStream
            editedVideoRef.current.play().catch(() => {})
          }
          setActive(true)
          setStatus('connected')
        },
      })
      realtimeRef.current = realtimeClient

      realtimeClient.on('connectionChange', (state) => {
        if (state === 'disconnected') {
          setActive(false)
          setStatus('idle')
        }
      })

      realtimeClient.on('error', (err) => {
        console.error('Decart error:', err)
        setStatus('error')
      })

      await realtimeClient.setPrompt(prompt)
    } catch (err) {
      console.error('Error iniciando Decart:', err)
      setStatus('error')
    }
  }, [])

  const stop = useCallback(() => {
    realtimeRef.current?.disconnect()
    realtimeRef.current = null
    if (editedVideoRef.current) editedVideoRef.current.srcObject = null
    setActive(false)
    setStatus('idle')
  }, [])

  return { active, status, editedVideoRef, start, stop }
}
