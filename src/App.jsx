import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'
import Scene from './Scene'

const store = createXRStore()

export default function App() {
  return (
    <>
      <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 10, display: 'flex', gap: 10 }}>
        <button
          onClick={() => store.enterAR().catch(() => alert('WebXR AR no soportado. Asegúrate de usar HTTPS.'))}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#2e6b1a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Enter AR
        </button>
        <button
          onClick={() => store.enterVR().catch(() => alert('WebXR VR no soportado. Asegúrate de usar HTTPS.'))}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#1a1a2e',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Enter VR
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 60 }}
        style={{ width: '100vw', height: '100vh' }}
      >
        <XR store={store}>
          <Scene />
        </XR>
      </Canvas>
    </>
  )
}
