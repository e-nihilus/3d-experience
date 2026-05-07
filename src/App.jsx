import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import Scene from './Scene'
import useCameraStream from './hooks/useCameraStream'
import useExperienceComposer from './hooks/useExperienceComposer'
import useFalRealtimeTryOn from './hooks/useFalRealtimeTryOn'
import useGeofencing from './hooks/useGeofencing'
import {
  TRY_ON_COMPOSER_FPS,
  TRY_ON_COMPOSER_MAX_WIDTH,
  TRY_ON_MODEL_ID,
  TRY_ON_PROMPT,
} from './config/tryOnConfig'

const store = createXRStore()

export default function App() {
  const camera = useCameraStream()
  const composer = useExperienceComposer()
  const tryOn = useFalRealtimeTryOn()
  const { activeZone } = useGeofencing()
  const sceneCanvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [tryOnPrompt, setTryOnPrompt] = useState(TRY_ON_PROMPT)
  const [referenceImageDataUri, setReferenceImageDataUri] = useState('https://www.santjordihostels.com/wp-content/uploads/must-see-gaudi-houses-in-barcelona-004-400x400.png')
  const [referenceImageName, setReferenceImageName] = useState('Gaudí House (Default)')

  const { available, videoRef, start: startCamera } = camera
  const { start: startComposer, stop: stopComposer } = composer
  const {
    active: tryOnActive,
    errorMsg,
    hasOutput,
    outputVideoRef,
    start: startTryOn,
    status,
    stop: stopTryOn,
    update: updateTryOn,
  } = tryOn

  // Auto-start camera on mobile
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    if (isMobile) startCamera()
  }, [])

  useEffect(() => {
    if (!tryOnActive) {
      stopComposer()
    }
  }, [stopComposer, tryOnActive])

  const handleSlabClick = async () => {
    if (tryOnActive) {
      stopTryOn()
      stopComposer()
      return
    }

    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    if (isMobile && !available) {
      await startCamera()
    }

    const inputStream = startComposer({
      baseVideoElement: videoRef.current,
      webglCanvasElement: sceneCanvasRef.current,
      fps: TRY_ON_COMPOSER_FPS,
      maxWidth: TRY_ON_COMPOSER_MAX_WIDTH,
    })

    await startTryOn({
      inputStream,
      modelId: TRY_ON_MODEL_ID,
      prompt: tryOnPrompt.trim() || TRY_ON_PROMPT,
      referenceImageUrl: referenceImageDataUri,
    })
  }

  const handleReferenceFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      alert('Sube una imagen JPEG, PNG o WebP.')
      event.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen debe pesar menos de 10 MB.')
      event.target.value = ''
      return
    }

    const dataUri = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
      reader.readAsDataURL(file)
    })

    setReferenceImageDataUri(dataUri)
    setReferenceImageName(file.name)

    if (tryOnActive) {
      await updateTryOn({
        prompt: tryOnPrompt.trim() || TRY_ON_PROMPT,
        referenceImageUrl: dataUri,
      })
    }
  }

  const handleApplyTryOnState = async () => {
    if (!tryOnActive) return

    await updateTryOn({
      prompt: tryOnPrompt.trim() || TRY_ON_PROMPT,
      referenceImageUrl: referenceImageDataUri,
    })
  }

  const clearReferenceImage = async () => {
    setReferenceImageDataUri('')
    setReferenceImageName('Sin imagen')
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (tryOnActive) {
      await updateTryOn({
        prompt: tryOnPrompt.trim() || TRY_ON_PROMPT,
        referenceImageUrl: '',
      })
    }
  }

  return (
    <>
      {/* Capa 1: Vídeo de la cámara (fondo) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
          display: available ? 'block' : 'none',
        }}
      />

      {/* Capa 2: Overlay del resultado realtime */}
      <video
        ref={outputVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 15,
          display: hasOutput ? 'block' : 'none',
          pointerEvents: 'none',
        }}
      />

      {/* Indicadores de estado */}
      {status === 'connected' && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, background: 'rgba(0,0,0,0.7)', color: '#fff',
          padding: '8px 20px', borderRadius: 8, fontSize: 14, fontFamily: 'sans-serif',
        }}>
          Try-on activo. Pulsa el cubo para desactivarlo.
        </div>
      )}

      {status === 'connecting' && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 30, background: 'rgba(0,0,0,0.8)', color: '#fff',
          padding: '20px 40px', borderRadius: 12, fontSize: 18, fontFamily: 'sans-serif',
        }}>
          Conectando con Decart Try-On...
        </div>
      )}

      {status === 'error' && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, background: '#e74c3c', color: '#fff',
          padding: '10px 24px', borderRadius: 8, fontSize: 14, fontFamily: 'sans-serif',
          maxWidth: '90vw', textAlign: 'center',
        }}>
          {errorMsg || 'Error desconocido'}
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          left: 20,
          bottom: 20,
          width: 360,
          maxWidth: 'calc(100vw - 40px)',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 14,
          borderRadius: 14,
          background: 'rgba(0,0,0,0.72)',
          color: '#fff',
          fontFamily: 'sans-serif',
          border: '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <label style={{ fontSize: 13, opacity: 0.9 }}>
          Prompt para Decart
        </label>
        <textarea
          value={tryOnPrompt}
          onChange={(event) => setTryOnPrompt(event.target.value)}
          rows={4}
          placeholder="Ej: Change the person's sweater to a red knit sweater..."
          style={{
            width: '100%',
            resize: 'vertical',
            minHeight: 92,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.22)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            padding: 10,
            fontSize: 13,
            outline: 'none',
            fontFamily: 'sans-serif',
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleReferenceFile}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '10px 12px',
              background: '#4a90d9',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Subir imagen
          </button>
          <button
            onClick={clearReferenceImage}
            disabled={!referenceImageDataUri}
            style={{
              padding: '10px 12px',
              background: referenceImageDataUri ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 10,
              cursor: referenceImageDataUri ? 'pointer' : 'default',
              fontSize: 13,
              opacity: referenceImageDataUri ? 1 : 0.5,
            }}
          >
            Quitar imagen
          </button>
          <button
            onClick={handleApplyTryOnState}
            disabled={!tryOnActive}
            style={{
              padding: '10px 12px',
              background: tryOnActive ? '#2e6b1a' : 'rgba(255,255,255,0.06)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: tryOnActive ? 'pointer' : 'default',
              fontSize: 13,
              opacity: tryOnActive ? 1 : 0.5,
            }}
          >
            Aplicar
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 42 }}>
          {referenceImageDataUri && (
            <img
              src={referenceImageDataUri}
              alt="Referencia"
              style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8 }}
            />
          )}
          <span style={{ fontSize: 12, opacity: 0.82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Referencia: {referenceImageName}
          </span>
        </div>
      </div>

      {/* Botones XR */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 30, display: 'flex', gap: 10 }}>
        {!available && (
          <button
            onClick={() => startCamera()}
            style={{
              padding: '12px 24px', fontSize: '16px', background: '#d4a017',
              color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            📷 Cámara
          </button>
        )}
        <button
          onClick={() => store.enterAR().catch(() => alert('WebXR AR no soportado. Asegúrate de usar HTTPS.'))}
          style={{
            padding: '12px 24px', fontSize: '16px', background: '#2e6b1a',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          Enter AR
        </button>
        <button
          onClick={() => store.enterVR().catch(() => alert('WebXR VR no soportado. Asegúrate de usar HTTPS.'))}
          style={{
            padding: '12px 24px', fontSize: '16px', background: '#1a1a2e',
            color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
          }}
        >
          Enter VR
        </button>
      </div>

      {/* Capa 3: Canvas 3D transparente encima */}
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 60 }}
        style={{ position: 'fixed', inset: 0, zIndex: 10, touchAction: 'none' }}
        gl={{ alpha: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          sceneCanvasRef.current = gl.domElement
        }}
      >
        <XR store={store}>
          <Scene
            onSlabClick={handleSlabClick}
            showBackground={!available}
            slabActive={tryOnActive}
            slabStatus={status}
            activeZone={activeZone}
          />
        </XR>
      </Canvas>
    </>
  )
}
