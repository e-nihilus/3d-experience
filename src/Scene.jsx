import { Suspense } from 'react'
import { OrbitControls, Environment, useTexture } from '@react-three/drei'
import FloatingSlab from './components/FloatingSlab'
import * as THREE from 'three'

export default function Scene({ onSlabClick, showBackground, slabActive, slabStatus }) {
  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} castShadow />

      {/* Entorno HDRI para reflejos */}
      <Environment preset="city" />

      {/* Fondo 360 solo en desktop (sin camara) */}
      {showBackground && (
        <Suspense fallback={null}>
          <StreetBackground />
        </Suspense>
      )}

      {/* Controles de cámara (desktop/mobile) */}
      <OrbitControls makeDefault />

      {/* Cubo flotante */}
      <FloatingSlab
        position={[0, 2, -3]}
        onSlabClick={onSlabClick}
        active={slabActive}
        status={slabStatus}
      />
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
