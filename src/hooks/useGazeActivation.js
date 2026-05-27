import { useRef, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Umbral angular (radianes) entre el centro de la cámara y el objeto.
// ~0.45 rad ≈ 26°, más tolerante en VR (foveal soft gaze).
const GAZE_ANGLE_THRESHOLD = 0.45

/**
 * Detecta si el usuario está mirando fijamente un objeto 3D.
 * Acumula tiempo mientras el objeto esté dentro del cono central de la cámara.
 * Cuando supera `durationSeconds`, marca `activated = true`.
 */
export default function useGazeActivation({ targetRef, durationSeconds = 2, enabled = true }) {
  const { camera, gl } = useThree()

  const progressRef = useRef(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [activated, setActivated] = useState(false)

  const tmpObjectPos = useRef(new THREE.Vector3())
  const tmpCameraDir = useRef(new THREE.Vector3())
  const tmpCameraPos = useRef(new THREE.Vector3())
  const tmpToObject = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    if (!enabled || !targetRef.current || activated) return

    // En sesión WebXR la pose del headset vive en gl.xr.getCamera().
    // Fuera de XR usamos la cámara por defecto de R3F.
    const activeCamera = gl.xr?.isPresenting ? gl.xr.getCamera() : camera

    targetRef.current.getWorldPosition(tmpObjectPos.current)
    activeCamera.getWorldPosition(tmpCameraPos.current)
    activeCamera.getWorldDirection(tmpCameraDir.current)

    tmpToObject.current.subVectors(tmpObjectPos.current, tmpCameraPos.current).normalize()
    const dot = tmpToObject.current.dot(tmpCameraDir.current)
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)))

    const prev = progressRef.current
    let next
    if (angle < GAZE_ANGLE_THRESHOLD) {
      next = Math.min(prev + delta, durationSeconds)
    } else {
      next = Math.max(prev - delta * 2, 0)
    }
    progressRef.current = next

    // Throttle de re-render para la UI de progreso
    if (Math.abs(next - prev) > 0.05 || next === 0 || next >= durationSeconds) {
      setDisplayProgress(next / durationSeconds)
      if (next >= durationSeconds) setActivated(true)
    }
  })

  const reset = useCallback(() => {
    progressRef.current = 0
    setDisplayProgress(0)
    setActivated(false)
  }, [])

  return { progress: displayProgress, activated, reset }
}
