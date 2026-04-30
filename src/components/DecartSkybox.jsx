import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function DecartSkybox({ videoElement }) {
  const meshRef = useRef()
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    if (!videoElement) return

    const videoTexture = new THREE.VideoTexture(videoElement)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.magFilter = THREE.LinearFilter
    videoTexture.colorSpace = THREE.SRGBColorSpace
    setTexture(videoTexture)

    return () => {
      videoTexture.dispose()
      setTexture(null)
    }
  }, [videoElement])

  // Keep texture updated every frame
  useFrame(() => {
    if (texture) texture.needsUpdate = true
  })

  if (!texture) return null

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[80, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}
