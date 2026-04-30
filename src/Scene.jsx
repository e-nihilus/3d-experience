import { Suspense } from 'react'
import { OrbitControls, Environment, useTexture } from '@react-three/drei'
import FloatingSlab from './components/FloatingSlab'
import DecartSkybox from './components/DecartSkybox'
import * as THREE from 'three'

export default function Scene({ onSlabClick, showBackground, decartActive, decartVideoElement }) {
  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} castShadow />

      {/* Entorno HDRI para reflejos */}
      <Environment preset="city" />

      {/* Fondo 360° solo en desktop (sin cámara) */}
      {showBackground && !decartActive && (
        <Suspense fallback={null}>
          <StreetBackground />
        </Suspense>
      )}

      {/* Skybox 3D con el stream de Decart (visible en VR/AR) */}
      {decartActive && decartVideoElement && (
        <DecartSkybox videoElement={decartVideoElement} />
      )}

      {/* Controles de cámara (desktop/mobile) */}
      <OrbitControls makeDefault />

      {/* Losa flotante */}
      <FloatingSlab position={[0, 2, -3]} onSlabClick={onSlabClick} />
    </>
  )
}

function StreetBackground() {
  const texture = useTexture('/barcelona.jpg')
  texture.mapping = THREE.EquirectangularReflectionMapping

  return (
    <mesh>
      <sphereGeometry args={[100, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}
