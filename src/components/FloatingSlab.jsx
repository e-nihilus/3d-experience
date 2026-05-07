import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import * as THREE from 'three'

export default function FloatingSlab({ position = [0, 2, -3], onSlabClick, active = false, status = 'idle' }) {
  const [touched, setTouched] = useState(false)
  const meshRef = useRef()
  const materialRef = useRef()

  // Animación suave de entrada (escala de 0 a 1)
  const scaleRef = useRef(0)
  useFrame((_, delta) => {
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(scaleRef.current + delta * 0.8, 1)
      const s = THREE.MathUtils.smoothstep(scaleRef.current, 0, 1)
      meshRef.current?.scale.setScalar(s)
    }
  })

  const handleClick = () => {
    setTouched(true)
    onSlabClick?.()
    setTimeout(() => setTouched(false), 1800)
  }

  const cubeColor = active ? '#2e6b1a' : '#4a90d9'
  const touchLabel = active ? 'Desactivando try-on...' : 'Activando try-on...'
  const helperLabel = status === 'connecting'
    ? 'Conectando'
    : active
      ? 'Pulsa para desactivar'
      : 'Pulsa para activar'

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh
        ref={meshRef}
        position={position}
        onClick={handleClick}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
          if (materialRef.current) materialRef.current.emissiveIntensity = 0.3
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
          if (materialRef.current) materialRef.current.emissiveIntensity = 0
        }}
        castShadow
      >
        <boxGeometry args={[1.35, 1.35, 1.35]} />
        <meshStandardMaterial
          ref={materialRef}
          color={cubeColor}
          roughness={0.3}
          metalness={0.6}
          emissive={cubeColor}
          emissiveIntensity={0}
        />
      </mesh>

      <Html position={[position[0], position[1] - 1.35, position[2]]} center>
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
        <Html position={[position[0], position[1] + 0.8, position[2]]} center>
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
    </Float>
  )
}
