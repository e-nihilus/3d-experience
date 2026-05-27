import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vLocal;

  void main() {
    vLocal = position;
    vNormalView = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uActivated;
  uniform float uCapture;

  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vLocal;

  void main() {
    // Fresnel suave (BackSide invertido → brilla en el contorno)
    float ndv = max(0.0, dot(vNormalView, vViewDir));
    float rimSoft = pow(1.0 - ndv, 1.8);
    float rimEdge = pow(1.0 - ndv, 4.0);

    // Sutil ondulación lenta sobre el halo
    float undulation = 0.5 + 0.5 * sin(vLocal.y * 4.0 + uTime * 1.3);
    undulation = mix(0.85, 1.0, undulation);

    // Pulso suave
    float pulse = 0.5 + 0.5 * sin(uTime * 2.2);
    float p = smoothstep(0.0, 1.0, uProgress);
    float base = p * 0.55 + uActivated * (0.55 + 0.35 * pulse);

    // Captura: el halo se intensifica y luego se desvanece (controlado por uCapture)
    float captureFade = 1.0 - smoothstep(0.55, 1.0, uCapture);
    float captureGlow = uCapture * (1.5 - uCapture) * 4.0; // bell curve

    vec3 goldDeep = vec3(0.96, 0.66, 0.22);
    vec3 goldLight = vec3(1.0, 0.93, 0.66);

    vec3 color = goldDeep * rimSoft * 1.1 + goldLight * rimEdge * 1.6;
    color *= undulation;
    color *= (base + captureGlow);

    float alpha = (rimSoft * 0.55 + rimEdge * 0.45) * (base + captureGlow) * captureFade;
    alpha = clamp(alpha, 0.0, 1.0);

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

export default function GoldHalo({ progress = 0, activated = false, capture = 0, radius = 0.7 }) {
  const meshRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uActivated: { value: 0 },
    uCapture: { value: 0 },
  }), [])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uProgress.value = progress
    uniforms.uActivated.value = activated ? 1.0 : 0.0
    uniforms.uCapture.value = capture
    if (meshRef.current) {
      // El halo se expande suavemente durante la captura
      const target = activated ? 1.05 : 1.0
      const expand = target + capture * 1.6
      const s = THREE.MathUtils.lerp(meshRef.current.scale.x, expand, 0.12)
      meshRef.current.scale.setScalar(s)
    }
  })

  if (progress <= 0 && !activated && capture <= 0) return null

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 48, 32]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
