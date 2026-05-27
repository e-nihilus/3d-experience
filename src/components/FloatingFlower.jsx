import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Html, useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import useGazeActivation from '../hooks/useGazeActivation'
import useGoldGazeShader from '../hooks/useGoldGazeShader'
import GoldHalo from './GoldHalo'
import GazeCountdown from './GazeCountdown'

const GAZE_DURATION = 2
const CAPTURE_DURATION = 1.8

export default function FloatingFlower({ position = [1.5, 1.5, -6], captured = false, onCapture }) {
  const groupRef = useRef()
  const innerRef = useRef()
  const { scene, animations } = useGLTF('/blue_flower_animated.glb')
  const { actions, names } = useAnimations(animations, innerRef)

  const [capturing, setCapturing] = useState(false)
  const captureStartRef = useRef(null)
  const captureProgressRef = useRef(0)
  const [captureProgress, setCaptureProgress] = useState(0)

  const scaleInRef = useRef(0)

  const { progress, activated, reset } = useGazeActivation({
    targetRef: groupRef,
    durationSeconds: GAZE_DURATION,
    enabled: !captured && !capturing,
  })

  useGoldGazeShader({ scene, progress, activated, capture: captureProgress })

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.frustumCulled = false
      }
    })
  }, [scene])

  // Pose por defecto = primer frame de la animación
  useEffect(() => {
    if (names.length === 0) return
    const action = actions[names[0]]
    if (!action) return
    action.reset()
    action.play()
    action.time = 0
    action.paused = true
  }, [actions, names])

  // Disparar la animación cuando se captura
  useEffect(() => {
    if (!capturing || names.length === 0) return
    const action = actions[names[0]]
    if (!action) return
    action.reset()
    action.setLoop(THREE.LoopOnce, 1)
    action.clampWhenFinished = true
    action.paused = false
    action.play()
  }, [capturing, actions, names])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Entrada suave
    if (scaleInRef.current < 1) {
      scaleInRef.current = Math.min(scaleInRef.current + delta * 0.8, 1)
    }
    const baseScale = THREE.MathUtils.smoothstep(scaleInRef.current, 0, 1)

    // Animación de captura: bell scale + rise + spin + fade
    if (capturing) {
      if (captureStartRef.current === null) {
        captureStartRef.current = state.clock.elapsedTime
      }
      const elapsed = state.clock.elapsedTime - captureStartRef.current
      const t = Math.min(elapsed / CAPTURE_DURATION, 1)

      // Easings
      const easeOutCubic = 1 - Math.pow(1 - t, 3)
      const bell = Math.sin(t * Math.PI) // 0→1→0
      const shrink = THREE.MathUtils.smoothstep(t, 0.55, 1.0)

      const captureScale = baseScale * (1 + bell * 0.35 - shrink * 1.0)
      groupRef.current.scale.setScalar(Math.max(0.001, captureScale))
      groupRef.current.position.y = position[1] + easeOutCubic * 0.9
      groupRef.current.rotation.y = (1 - Math.pow(1 - t, 2)) * Math.PI * 1.6

      // Bell curve dorado para shader / halo
      const cap = bell
      captureProgressRef.current = cap
      if (Math.abs(cap - captureProgress) > 0.05 || t === 1) {
        setCaptureProgress(cap)
      }
      return
    }

    // Estado normal: pulsación sutil al estar activado o mirando
    const pulse = activated
      ? 1.15 + Math.sin(state.clock.elapsedTime * 3.5) * 0.04
      : 1 + progress * 0.05
    groupRef.current.scale.setScalar(baseScale * pulse)
    groupRef.current.position.y = position[1]
  })

  // Trigger onCapture al final del timeline
  useEffect(() => {
    if (!capturing) return
    const timeoutId = setTimeout(() => {
      onCapture?.({
        id: 'flower',
        label: 'Flor orgánica',
        icon: '🌸',
      })
      setCapturing(false)
      setCaptureProgress(0)
      captureStartRef.current = null
      captureProgressRef.current = 0
      reset()
    }, CAPTURE_DURATION * 1000)
    return () => clearTimeout(timeoutId)
  }, [capturing, onCapture, reset])

  const handleSelect = () => {
    if (captured || capturing || !activated) return
    setCapturing(true)
  }

  if (captured) return null

  const label = capturing
    ? 'Capturando...'
    : activated
      ? 'Toca / pellizca para capturar'
      : progress > 0
        ? 'Mantén la mirada...'
        : 'Mira la flor 2 s'

  return (
    <Float
      speed={capturing ? 0 : 1.5}
      rotationIntensity={capturing ? 0 : 0.1}
      floatIntensity={capturing ? 0 : 0.4}
    >
      <group
        ref={groupRef}
        position={position}
        onClick={handleSelect}
        onPointerDown={handleSelect}
        onPointerOver={() => {
          if (activated) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <primitive ref={innerRef} object={scene} scale={1} />
        <GoldHalo
          progress={progress}
          activated={activated}
          capture={captureProgress}
          radius={0.75}
        />

        {!capturing && (
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
              border: activated
                ? '1px solid rgba(255,204,51,0.7)'
                : '1px solid rgba(255,255,255,0.18)',
              boxShadow: activated ? '0 0 16px rgba(255,204,51,0.6)' : 'none',
            }}
          >
            {label}
          </div>
        </Html>
      </group>
    </Float>
  )
}

useGLTF.preload('/blue_flower_animated.glb')
