import { Suspense, useEffect, useMemo, useRef } from 'react'
import { OrbitControls, Environment, useTexture } from '@react-three/drei'
import { useXR } from '@react-three/xr'
import { useFrame, useThree } from '@react-three/fiber'
import FloatingSlab from './components/FloatingSlab'
import FloatingFlower from './components/FloatingFlower'
import * as THREE from 'three'

// Los objetos siempre aparecen delante del usuario (eje -Z), a 3 m,
// para que estén visibles independientemente del jitter GPS.
// El geofencing solo decide *si* se renderizan.
const FRONT_DISTANCE = 2.2
const EYE_HEIGHT = 1.45
const SLAB_POSITION = [-0.45, EYE_HEIGHT, -FRONT_DISTANCE]
const FLOWER_POSITION = [0.55, EYE_HEIGHT - 0.1, -FRONT_DISTANCE + 0.2]

export default function Scene({
  onSlabClick,
  onCapture,
  collection,
  showBackground,
  slabActive,
  slabStatus,
  activeZone,
  userPosition,
  decartVideoElement,
  decartHasOutput,
}) {
  const xrSession = useXR((s) => s.session)
  // En XR (emulador o headset real) saltamos el filtro de geofencing
  // para que se vean siempre los objetos al entrar en la sesión.
  const visible = Boolean(xrSession || (activeZone && userPosition))

  const flowerCaptured = collection?.some((item) => item.id === 'flower') ?? false

  // En VR el DOM overlay del output no se ve, así que pintamos el feed
  // procesado por Decart como skybox cilíndrico anclado al headset.
  const showDecartBackdrop = Boolean(xrSession && slabActive && decartHasOutput && decartVideoElement)

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} castShadow />

      <Environment preset="city" />

      {showBackground && !showDecartBackdrop && (
        <Suspense fallback={null}>
          <StreetBackground />
        </Suspense>
      )}

      {showDecartBackdrop && <DecartXRBackdrop videoElement={decartVideoElement} />}

      <OrbitControls makeDefault />

      {visible && (
        <>
          <FloatingSlab
            position={SLAB_POSITION}
            onSlabClick={onSlabClick}
            active={slabActive}
            status={slabStatus}
          />
          <FloatingFlower
            position={FLOWER_POSITION}
            onCapture={onCapture}
            captured={flowerCaptured}
          />
        </>
      )}
    </>
  )
}

/**
 * Portal estilo "ventana mágica": un plano flotante 16:9 con el feed
 * realtime de Decart como textura. Va anclado al headset (cada frame se
 * recoloca delante del usuario y orientado hacia él), así que mires
 * donde mires siempre tienes el portal delante. El borde dorado lo hace
 * legible como portal y no como skybox.
 *
 * Tamaño 2.4 × 1.35 m a 1.8 m de distancia → ~67° horizontal de FOV
 * cubierto. Queda espacio alrededor para ver el resto de la escena
 * (passthrough en AR, fondo 3D en VR).
 */
const PORTAL_DISTANCE = 1.8
const PORTAL_WIDTH = 2.4
const PORTAL_HEIGHT = 1.35

function DecartXRBackdrop({ videoElement }) {
  const groupRef = useRef()
  const { gl, camera } = useThree()

  const texture = useMemo(() => {
    if (!videoElement) return null
    const tex = new THREE.VideoTexture(videoElement)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.generateMipmaps = false
    return tex
  }, [videoElement])

  useEffect(() => {
    return () => {
      texture?.dispose()
    }
  }, [texture])

  const tmpPos = useRef(new THREE.Vector3())
  const tmpQuat = useRef(new THREE.Quaternion())
  const forwardRef = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!groupRef.current) return
    const xrCam = gl.xr?.isPresenting ? gl.xr.getCamera() : camera

    xrCam.getWorldPosition(tmpPos.current)
    xrCam.getWorldQuaternion(tmpQuat.current)

    forwardRef.current.set(0, 0, -1).applyQuaternion(tmpQuat.current)
    groupRef.current.position
      .copy(tmpPos.current)
      .addScaledVector(forwardRef.current, PORTAL_DISTANCE)
    groupRef.current.quaternion.copy(tmpQuat.current)
  })

  if (!texture) return null

  return (
    <group ref={groupRef}>
      {/* Marco dorado (un poco más grande que el plano del vídeo) */}
      <mesh position={[0, 0, -0.005]} renderOrder={1}>
        <planeGeometry args={[PORTAL_WIDTH + 0.08, PORTAL_HEIGHT + 0.08]} />
        <meshBasicMaterial
          color="#d4a017"
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Pantalla del portal con el feed de Decart */}
      <mesh renderOrder={2}>
        <planeGeometry args={[PORTAL_WIDTH, PORTAL_HEIGHT]} />
        <meshBasicMaterial
          map={texture}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
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
