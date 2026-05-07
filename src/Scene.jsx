import { Suspense, useRef } from 'react'
import { OrbitControls, Environment, useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import FloatingSlab from './components/FloatingSlab'
import * as THREE from 'three'

const SLAB_DISTANCE = 3 // metros delante del usuario

export default function Scene({ onSlabClick, showBackground, slabActive, slabStatus, activeZone }) {
  const slabPositionRef = useRef([0, 2, -3])
  const { camera } = useThree()
  const direction = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!activeZone) return

    camera.getWorldDirection(direction.current)

    // Colocar la baldosa a SLAB_DISTANCE metros delante de la cámara, a la misma altura
    slabPositionRef.current = [
      camera.position.x + direction.current.x * SLAB_DISTANCE,
      camera.position.y,
      camera.position.z + direction.current.z * SLAB_DISTANCE,
    ]
  })

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

      {/* Cubo flotante — solo visible dentro de una zona de geofencing */}
      {activeZone && (
        <FloatingSlab
          positionRef={slabPositionRef}
          onSlabClick={onSlabClick}
          active={slabActive}
          status={slabStatus}
        />
      )}
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
