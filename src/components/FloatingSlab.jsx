import { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import * as THREE from 'three'

export default function FloatingSlab({ position = [0, 2, -3], onSlabClick }) {
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
    setTimeout(() => setTouched(false), 3000)
  }

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
        <boxGeometry args={[2, 0.3, 1.5]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#4a90d9"
          roughness={0.3}
          metalness={0.6}
          emissive="#4a90d9"
          emissiveIntensity={0}
        />
      </mesh>

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
            🎨 Activando estilo Gaudí...
          </div>
        </Html>
      )}
    </Float>
  )
}
