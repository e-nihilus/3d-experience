import { useCallback, useEffect, useRef, useState } from 'react'
import { fal } from '@fal-ai/client'
import {
  TRY_ON_COMPOSER_FPS,
  TRY_ON_ENHANCE_PROMPT,
  TRY_ON_MODEL_ID,
  TRY_ON_PROMPT,
  TRY_ON_TOKEN_TTL_SECONDS,
  TRY_ON_VIDEO_MAX_BITRATE,
} from '../config/tryOnConfig'

const DEFAULT_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]
const MAX_RECONNECT_ATTEMPTS = 5

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error) {
    return error
  }

  return fallbackMessage
}

function createTokenProvider() {
  return async (app) => {
    const response = await fetch('/api/fal/realtime-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ app }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload?.token) {
      throw new Error(payload?.error || 'No se pudo obtener el token realtime de fal.ai.')
    }

    return payload.token
  }
}

export default function useFalRealtimeTryOn() {
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [hasOutput, setHasOutput] = useState(false)

  const outputVideoRef = useRef(null)
  const connectionRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const inputStreamRef = useRef(null)
  const pendingIceCandidatesRef = useRef([])
  const reconnectTimerRef = useRef(null)
  const disconnectGraceTimerRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const outputStartedRef = useRef(false)
  const stoppingRef = useRef(false)
  const sessionConfigRef = useRef({
    modelId: TRY_ON_MODEL_ID,
    prompt: '',
    referenceImageUrl: '',
  })

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (disconnectGraceTimerRef.current) {
      clearTimeout(disconnectGraceTimerRef.current)
      disconnectGraceTimerRef.current = null
    }
  }, [])

  const detachOutput = useCallback(() => {
    const video = outputVideoRef.current
    if (!video) return

    const remoteStream = video.srcObject
    if (remoteStream instanceof MediaStream) {
      remoteStream.getTracks().forEach((track) => track.stop())
    }

    video.pause?.()
    video.srcObject = null
    video.onloadeddata = null
  }, [])

  const closeTransport = useCallback(() => {
    const peerConnection = peerConnectionRef.current
    if (peerConnection) {
      peerConnection.onconnectionstatechange = null
      peerConnection.onicecandidate = null
      peerConnection.ontrack = null
      peerConnection.close()
    }

    peerConnectionRef.current = null
    pendingIceCandidatesRef.current = []

    connectionRef.current?.close()
    connectionRef.current = null
  }, [])

  const cleanup = useCallback(({ nextStatus = 'idle', nextError = '', keepActive = false } = {}) => {
    clearTimers()
    closeTransport()
    reconnectAttemptsRef.current = 0
    outputStartedRef.current = false

    if (inputStreamRef.current) {
      inputStreamRef.current.getTracks().forEach((track) => track.stop())
      inputStreamRef.current = null
    }

    detachOutput()
    setHasOutput(false)
    setActive(keepActive)
    setStatus(nextStatus)
    setErrorMsg(nextError)
  }, [clearTimers, closeTransport, detachOutput])

  const sendInitialState = useCallback((connection) => {
    const prompt = sessionConfigRef.current.prompt?.trim() || TRY_ON_PROMPT

    connection.send({
      prompt,
      enhance_prompt: TRY_ON_ENHANCE_PROMPT,
      ...(sessionConfigRef.current.referenceImageUrl
        ? { reference_image_url: sessionConfigRef.current.referenceImageUrl }
        : {}),
    })
  }, [])

  const failSession = useCallback((message) => {
    if (stoppingRef.current) {
      return
    }

    stoppingRef.current = true
    cleanup({ nextStatus: 'error', nextError: message })
  }, [cleanup])

  const stop = useCallback(() => {
    stoppingRef.current = true
    cleanup()
  }, [cleanup])

  const update = useCallback(async ({ prompt, referenceImageUrl = '' }) => {
    try {
      sessionConfigRef.current = {
        ...sessionConfigRef.current,
        prompt,
        referenceImageUrl,
      }
      setErrorMsg('')

      if (connectionRef.current) {
        sendInitialState(connectionRef.current)
      }
    } catch (error) {
      setErrorMsg(getErrorMessage(error, 'No se pudo actualizar el prompt o la imagen de referencia.'))
      throw error
    }
  }, [sendInitialState])

  const start = useCallback(async ({ inputStream, modelId = TRY_ON_MODEL_ID, prompt, referenceImageUrl = '' }) => {
    if (!inputStream) {
      setActive(false)
      setHasOutput(false)
      setStatus('error')
      setErrorMsg('No se pudo componer la vista de entrada para el try-on.')
      return
    }

    if (typeof RTCPeerConnection === 'undefined') {
      setActive(false)
      setHasOutput(false)
      setStatus('error')
      setErrorMsg('WebRTC no esta disponible en este navegador.')
      inputStream.getTracks().forEach((track) => track.stop())
      return
    }

    stoppingRef.current = false
    cleanup()

    inputStream.getTracks().forEach((track) => {
      if ('contentHint' in track) {
        track.contentHint = 'motion'
      }
    })

    inputStreamRef.current = inputStream
    sessionConfigRef.current = {
      modelId,
      prompt,
      referenceImageUrl,
    }

    setActive(true)
    setHasOutput(false)
    setStatus('connecting')
    setErrorMsg('')

    const tokenProvider = createTokenProvider()

    const canReconnect = () => (
      !stoppingRef.current &&
      inputStreamRef.current &&
      inputStreamRef.current.getTracks().some((track) => track.readyState === 'live')
    )

    const scheduleReconnect = (reason, delay = 1000) => {
      if (!canReconnect()) {
        failSession(reason)
        return
      }

      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        failSession('Decart ha cerrado la conexion realtime varias veces seguidas.')
        return
      }

      reconnectAttemptsRef.current += 1
      clearTimers()
      closeTransport()
      setActive(true)
      setStatus(outputStartedRef.current ? 'connected' : 'connecting')
      setErrorMsg('')

      reconnectTimerRef.current = setTimeout(() => {
        if (canReconnect()) {
          connectRealtimeSession()
        }
      }, delay)
    }

    const scheduleGracefulReconnect = (peerConnection, reason) => {
      if (disconnectGraceTimerRef.current) {
        clearTimeout(disconnectGraceTimerRef.current)
      }

      disconnectGraceTimerRef.current = setTimeout(() => {
        if (
          !stoppingRef.current &&
          peerConnectionRef.current === peerConnection &&
          peerConnection.connectionState !== 'connected'
        ) {
          scheduleReconnect(reason, 750)
        }
      }, 3500)
    }

    const addRemoteIceCandidate = async (candidate) => {
      const peerConnection = peerConnectionRef.current
      if (!peerConnection) return

      if (!peerConnection.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate)
        return
      }

      await peerConnection.addIceCandidate(candidate ? new RTCIceCandidate(candidate) : null)
    }

    const flushRemoteIceCandidates = async () => {
      const queuedCandidates = pendingIceCandidatesRef.current
      pendingIceCandidatesRef.current = []

      for (const candidate of queuedCandidates) {
        await addRemoteIceCandidate(candidate)
      }
    }

    const createPeerConnection = async (connection, iceServers = DEFAULT_ICE_SERVERS) => {
      if (!inputStreamRef.current || peerConnectionRef.current) {
        return
      }

      const peerConnection = new RTCPeerConnection({ iceServers })
      peerConnectionRef.current = peerConnection

      inputStreamRef.current.getTracks().forEach((track) => {
        const sender = peerConnection.addTrack(track, inputStreamRef.current)
        const parameters = sender.getParameters()
        parameters.degradationPreference = 'maintain-framerate'
        parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}]
        parameters.encodings[0] = {
          ...parameters.encodings[0],
          maxBitrate: TRY_ON_VIDEO_MAX_BITRATE,
          maxFramerate: TRY_ON_COMPOSER_FPS,
        }
        sender.setParameters(parameters).catch(() => {})
      })

      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0] || new MediaStream([event.track])
        if (!remoteStream || !outputVideoRef.current) {
          return
        }

        outputVideoRef.current.srcObject = remoteStream
        outputVideoRef.current.onloadeddata = () => {
          setHasOutput(true)
        }
        outputVideoRef.current.play().catch(() => {})
        outputStartedRef.current = true
        reconnectAttemptsRef.current = 0
        setStatus('connected')
        setHasOutput(true)
      }

      peerConnection.onicecandidate = ({ candidate }) => {
        if (!connectionRef.current) return

        connectionRef.current.send({
          type: 'ice-candidate',
          candidate: candidate ? candidate.toJSON() : null,
        })
      }

      peerConnection.onconnectionstatechange = () => {
        if (stoppingRef.current) return

        const nextState = peerConnection.connectionState

        if (nextState === 'connected') {
          if (disconnectGraceTimerRef.current) {
            clearTimeout(disconnectGraceTimerRef.current)
            disconnectGraceTimerRef.current = null
          }
          setStatus('connected')
          return
        }

        if (nextState === 'connecting') {
          setStatus(outputStartedRef.current ? 'connected' : 'connecting')
          return
        }

        if (nextState === 'disconnected') {
          scheduleGracefulReconnect(peerConnection, 'La conexion realtime con Decart se ha interrumpido.')
          return
        }

        if (nextState === 'failed' || nextState === 'closed') {
          scheduleReconnect('La conexion realtime con Decart se ha cerrado.', 750)
        }
      }

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      connection.send({ type: 'offer', sdp: peerConnection.localDescription.sdp })
      sendInitialState(connection)
    }

    const handleIceRestart = async (result) => {
      const peerConnection = peerConnectionRef.current
      if (!peerConnection) return

      if (result.turn_config) {
        peerConnection.setConfiguration({
          iceServers: [
            ...DEFAULT_ICE_SERVERS,
            {
              urls: result.turn_config.server_url,
              username: result.turn_config.username,
              credential: result.turn_config.credential,
            },
          ],
        })
      }

      const offer = await peerConnection.createOffer({ iceRestart: true })
      await peerConnection.setLocalDescription(offer)
      connectionRef.current?.send({ type: 'offer', sdp: peerConnection.localDescription.sdp })
    }

    const connectRealtimeSession = () => {
      try {
        const connection = fal.realtime.connect(modelId, {
          connectionKey: `try-on-${Date.now()}`,
          maxBuffering: 1,
          throttleInterval: 0,
          tokenProvider,
          tokenExpirationSeconds: TRY_ON_TOKEN_TTL_SECONDS,
          onResult: async (result) => {
            if (stoppingRef.current) return

            const type = result.type

            if (type === 'iceservers') {
              await createPeerConnection(connection, result.iceservers || DEFAULT_ICE_SERVERS)
              return
            }

            if (type === 'answer') {
              const peerConnection = peerConnectionRef.current
              if (!peerConnection) return

              await peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: result.sdp })
              )
              await flushRemoteIceCandidates()
              sendInitialState(connection)
              return
            }

            if ((type === 'ice-candidate' || type === 'icecandidate') && peerConnectionRef.current) {
              await addRemoteIceCandidate(result.candidate ?? null)
              return
            }

            if (type === 'ice-restart') {
              await handleIceRestart(result)
              return
            }

            if (type === 'generation_started' || type === 'generation_tick') {
              setStatus('connected')
              return
            }

            if (type === 'generation_ended') {
              scheduleReconnect(`Decart ha finalizado la generacion (${result.reason || 'sin motivo'}).`, 750)
              return
            }

            if (type === 'prompt_ack' && result.success === false) {
              setErrorMsg(result.error || 'Decart ha rechazado el prompt.')
              return
            }

            if (type === 'set_image_ack' && result.success === false) {
              setErrorMsg(result.error || 'Decart ha rechazado la imagen de referencia.')
              return
            }

            if (type === 'error') {
              scheduleReconnect(result.error || 'Error del servidor realtime de Decart.', 1000)
            }
          },
          onError: (error) => {
            scheduleReconnect(`Error fal.ai: ${getErrorMessage(error, 'Error inesperado.')}`, 1000)
          },
        })

        connectionRef.current = connection
        connection.send({})
      } catch (error) {
        scheduleReconnect(`Error iniciando la sesion realtime: ${getErrorMessage(error, 'Error inesperado.')}`, 1000)
      }
    }

    connectRealtimeSession()
  }, [cleanup, clearTimers, closeTransport, failSession, sendInitialState])

  useEffect(() => () => stop(), [stop])

  return {
    active,
    errorMsg,
    hasOutput,
    outputVideoRef,
    start,
    status,
    stop,
    update,
  }
}
