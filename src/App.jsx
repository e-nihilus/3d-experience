import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import Scene from './Scene'
import useCameraStream from './hooks/useCameraStream'
import useDecartStream from './hooks/useDecartStream'

const store = createXRStore()

function createImageStream(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      // Repintar a 1fps para mantener el stream vivo
      setInterval(() => ctx.drawImage(img, 0, 0, canvas.width, canvas.height), 1000)
      resolve(canvas.captureStream(1))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

const GAUDI_PROMPT =
  'Apply colorful Gaudí trencadís mosaic textures to all surfaces, keep the same buildings, streets and layout exactly as they are, only change colors and surface patterns'

export default function App() {
  const camera = useCameraStream()
  const decart = useDecartStream()

  // Auto-start camera on mobile
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
    if (isMobile) camera.start()
  }, [])

  const handleSlabClick = async () => {
    if (decart.active) {
      decart.stop()
    } else {
      let stream = camera.streamRef.current
      if (!stream) {
        // Desktop sin cámara: crear stream desde la imagen de fondo
        stream = await createImageStream('/barcelona.jpg')
      }
      if (stream) decart.start(stream, GAUDI_PROMPT)
    }
  }

  return (
    <>
      {/* Capa 1: Vídeo de la cámara (fondo) */}
      <video
        ref={camera.videoRef}
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
          display: camera.available ? 'block' : 'none',
        }}
      />

      {/* Capa 2: Vídeo editado por Decart (reemplaza la cámara cuando activo) */}
      <video
        ref={decart.editedVideoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          display: decart.active ? 'block' : 'none',
        }}
      />

      {/* Indicadores de estado */}
      {decart.active && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, background: 'rgba(0,0,0,0.7)', color: '#fff',
          padding: '8px 20px', borderRadius: 8, fontSize: 14, fontFamily: 'sans-serif',
        }}>
          🎨 Estilo Gaudí activado — toca la losa para desactivar
        </div>
      )}

      {decart.status === 'connecting' && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 20, background: 'rgba(0,0,0,0.8)', color: '#fff',
          padding: '20px 40px', borderRadius: 12, fontSize: 18, fontFamily: 'sans-serif',
        }}>
          Conectando con Decart AI...
        </div>
      )}

      {decart.status === 'error' && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 20, background: '#e74c3c', color: '#fff',
          padding: '10px 24px', borderRadius: 8, fontSize: 14, fontFamily: 'sans-serif',
        }}>
          Error: Configura VITE_DECART_API_KEY en .env.local
        </div>
      )}

      {/* Botones XR */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 20, display: 'flex', gap: 10 }}>
        {!camera.available && (
          <button
            onClick={() => camera.start()}
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
        style={{ position: 'fixed', inset: 0, zIndex: 10 }}
        gl={{ alpha: true }}
      >
        <XR store={store}>
          <Scene
            onSlabClick={handleSlabClick}
            showBackground={!camera.available}
            decartActive={decart.active}
            decartVideoElement={decart.editedVideoRef.current}
          />
        </XR>
      </Canvas>
    </>
  )
}
