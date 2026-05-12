import { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function FloatingSlab({ position = [0, 1.5, -6], onSlabClick, active = false, status = 'idle' }) {
  const [touched, setTouched] = useState(false)
  const groupRef = useRef()
  const { scene } = useGLTF('/baldosa.glb')

  const scaleRef = useRef(0)
  const rotY = useRef(0)

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Entrada suave
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(scaleRef.current + delta * 0.8, 1)
      const s = THREE.MathUtils.smoothstep(scaleRef.current, 0, 1)
      groupRef.current.scale.setScalar(s)
    }

    // Rotación continua suave
    rotY.current += delta * 0.4
    groupRef.current.rotation.y = rotY.current
  })

  const handleClick = () => {
    setTouched(true)
    onSlabClick?.()
    setTimeout(() => setTouched(false), 1800)
  }

  const touchLabel = active ? 'Desactivando try-on...' : 'Activando try-on...'
  const helperLabel = status === 'connecting'
    ? 'Conectando'
    : active
      ? 'Pulsa para desactivar'
      : 'Pulsa para activar'

  return (
    <Float speed={2} rotationIntensity={0.15} floatIntensity={0.6}>
      <group
        ref={groupRef}
        position={position}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'auto' }}
      >
        <primitive object={scene} scale={1} />

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
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            {helperLabel}
          </div>
        </Html>

        {/* Mensaje al tocar */}
        {touched && (
          <Html position={[0, 0.5, 0]} center>
            <div
              style={{
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 18,
                fontFamily: 'sans-serif',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              {touchLabel}
            </div>
          </Html>
        )}
      </group>
    </Float>
  )
}

useGLTF.preload('/baldosa.glb')
