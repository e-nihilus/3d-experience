import { Suspense, useMemo } from 'react'
import { OrbitControls, Environment, useTexture } from '@react-three/drei'
import FloatingSlab from './components/FloatingSlab'
import * as THREE from 'three'

const SLAB_HEIGHT = 2
const DEG_TO_RAD = Math.PI / 180
const METERS_PER_DEG_LAT = 111320

function gpsOffsetToScene(userPos, zonePos) {
  const cosLat = Math.cos(userPos.lat * DEG_TO_RAD)
  const dx = (zonePos.lon - userPos.lon) * METERS_PER_DEG_LAT * cosLat
  const dz = (zonePos.lat - userPos.lat) * METERS_PER_DEG_LAT
  return [dx, SLAB_HEIGHT, -dz]
}

export default function Scene({ onSlabClick, showBackground, slabActive, slabStatus, activeZone, userPosition }) {
  const slabPosition = useMemo(() => {
    if (!activeZone || !userPosition) return null
    return gpsOffsetToScene(userPosition, activeZone)
  }, [activeZone, userPosition])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} castShadow />

      <Environment preset="city" />

      {showBackground && (
        <Suspense fallback={null}>
          <StreetBackground />
        </Suspense>
      )}

      <OrbitControls makeDefault />

      {slabPosition && (
        <FloatingSlab
          position={slabPosition}
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
