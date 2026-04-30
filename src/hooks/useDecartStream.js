import { useState, useRef, useCallback } from 'react'
import { createDecartClient, models } from '@decartai/sdk'

const DECART_API_KEY = import.meta.env.VITE_DECART_API_KEY || ''

export default function useDecartStream() {
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [errorMsg, setErrorMsg] = useState('')
  const realtimeRef = useRef(null)
  const editedVideoRef = useRef(null)

  const start = useCallback(async (cameraStream, prompt) => {
    if (!DECART_API_KEY) {
      setErrorMsg('Falta VITE_DECART_API_KEY')
      setStatus('error')
      return
    }
    if (!cameraStream) {
      setErrorMsg('No hay stream de cámara disponible')
      setStatus('error')
      return
    }

    try {
      setStatus('connecting')
      setErrorMsg('')
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
        setErrorMsg('Error de conexión con Decart: ' + (err?.message || err))
        setStatus('error')
      })

      await realtimeClient.setPrompt(prompt)
    } catch (err) {
      console.error('Error iniciando Decart:', err)
      setErrorMsg('Error: ' + (err?.message || String(err)))
      setStatus('error')
    }
  }, [])

  const stop = useCallback(() => {
    realtimeRef.current?.disconnect()
    realtimeRef.current = null
    if (editedVideoRef.current) editedVideoRef.current.srcObject = null
    setActive(false)
    setStatus('idle')
    setErrorMsg('')
  }, [])

  return { active, status, errorMsg, editedVideoRef, start, stop }
}
