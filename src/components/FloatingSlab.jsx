import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import useGazeActivation from '../hooks/useGazeActivation'
import useGoldGazeShader from '../hooks/useGoldGazeShader'
import GoldHalo from './GoldHalo'
import GazeCountdown from './GazeCountdown'

const GAZE_DURATION = 2

export default function FloatingSlab({
  position = [0, 1.5, -6],
  onSlabClick,
  active = false,
  status = 'idle',
}) {
  const groupRef = useRef()
  const { scene } = useGLTF('/baldosa.glb')

  const scaleInRef = useRef(0)
  const rotY = useRef(0)

  // El gaze sigue habilitado siempre (también cuando está activo, para poder
  // mirar la baldosa y desactivar el try-on con un toque).
  const { progress, activated, reset } = useGazeActivation({
    targetRef: groupRef,
    durationSeconds: GAZE_DURATION,
    enabled: true,
  })

  useGoldGazeShader({ scene, progress, activated, capture: 0 })

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Entrada suave
    if (scaleInRef.current < 1) {
      scaleInRef.current = Math.min(scaleInRef.current + delta * 0.8, 1)
    }
    const baseScale = THREE.MathUtils.smoothstep(scaleInRef.current, 0, 1)

    // Pulso: más fuerte cuando el try-on está activo
    const pulse = active
      ? 1.12 + Math.sin(state.clock.elapsedTime * 3.0) * 0.05
      : activated
        ? 1.15 + Math.sin(state.clock.elapsedTime * 3.5) * 0.04
        : 1 + progress * 0.05
    groupRef.current.scale.setScalar(baseScale * pulse)
    groupRef.current.position.y = position[1]

    rotY.current += delta * 0.4
    groupRef.current.rotation.y = rotY.current
  })

  const handleSelect = () => {
    // Si ya está activo, cualquier click/select desactiva el try-on.
    if (active) {
      onSlabClick?.()
      reset()
      return
    }
    // Si todavía no está activo, requerimos que el usuario haya completado
    // el gaze para evitar activaciones accidentales.
    if (!activated) return
    onSlabClick?.()
    reset()
  }

  const helperLabel = active
    ? 'Pulsa para desactivar'
    : status === 'connecting'
      ? 'Conectando...'
      : activated
        ? 'Toca / pellizca para activar'
        : progress > 0
          ? 'Mantén la mirada...'
          : 'Mira la tesela 2 s'

  return (
    <Float speed={2} rotationIntensity={0.15} floatIntensity={0.6}>
      <group
        ref={groupRef}
        position={position}
        onClick={handleSelect}
        onPointerDown={handleSelect}
        onPointerOver={() => {
          if (activated || active) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <primitive object={scene} scale={1} />
        <GoldHalo
          progress={progress}
          activated={activated || active}
          capture={0}
          radius={0.85}
        />

        {!active && (
          <GazeCountdown progress={progress} duration={GAZE_DURATION} position={[0, 0.9, 0]} />
        )}

        <Html position={[0, -0.7, 0]} center>
          <div
            style={{
              background: 'rgba(0,0,0,0.65)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: 999,
              fontSize: 12,
              fontFamily: 'sans-serif',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              border: activated || active
                ? '1px solid rgba(255,204,51,0.7)'
                : '1px solid rgba(255,255,255,0.18)',
              boxShadow: activated || active ? '0 0 16px rgba(255,204,51,0.6)' : 'none',
            }}
          >
            {helperLabel}
          </div>
        </Html>
      </group>
    </Float>
  )
}

useGLTF.preload('/baldosa.glb')
