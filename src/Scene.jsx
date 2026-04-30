import { OrbitControls, Environment } from '@react-three/drei'
import FloatingSlab from './components/FloatingSlab'

export default function Scene() {
  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} castShadow />

      {/* Entorno HDRI */}
      <Environment preset="city" />

      {/* Controles de cámara (desktop/mobile) */}
      <OrbitControls makeDefault />

      {/* Suelo de referencia */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>

      {/* Losa flotante */}
      <FloatingSlab position={[0, 2, -3]} />
    </>
  )
}
