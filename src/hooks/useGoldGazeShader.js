import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Shader dorado elegante para la activación por mirada.
 * Capas:
 *   - Fresnel suave con dos tonos (champán → oro claro)
 *   - Onda iridiscente lenta que ondula verticalmente
 *   - Pulso global muy suave al activarse
 *   - Destello extra durante la captura (uCapture)
 */
const vertexInjections = {
  '#include <common>': `#include <common>
    varying vec3 vGazeLocal;
    varying vec3 vGazeNormalW;
    varying vec3 vGazeViewDir;`,
  '#include <begin_vertex>': `#include <begin_vertex>
    vGazeLocal = position;
    vGazeNormalW = normalize(normalMatrix * normal);`,
  '#include <project_vertex>': `#include <project_vertex>
    vGazeViewDir = normalize(-mvPosition.xyz);`,
}

const fragmentInjections = {
  '#include <common>': `#include <common>
    uniform float uGazeTime;
    uniform float uGazeProgress;
    uniform float uGazeActivated;
    uniform float uGazeCapture;
    varying vec3 vGazeLocal;
    varying vec3 vGazeNormalW;
    varying vec3 vGazeViewDir;`,
  '#include <dithering_fragment>': `#include <dithering_fragment>
    {
      vec3 N = normalize(vGazeNormalW);
      vec3 V = normalize(vGazeViewDir);

      // Fresnel suave en dos capas (rim ancho + halo borde fino)
      float ndv = max(0.0, dot(N, V));
      float fresnelSoft = pow(1.0 - ndv, 1.6);
      float fresnelEdge = pow(1.0 - ndv, 5.0);

      // Onda iridiscente que recorre el objeto muy lentamente
      float wave = sin(vGazeLocal.y * 3.0 - uGazeTime * 1.0) * 0.5 + 0.5;
      wave = smoothstep(0.25, 0.95, wave);

      // Pulso global tranquilo cuando ya está activado
      float pulse = 0.5 + 0.5 * sin(uGazeTime * 2.2);

      // Easing del progreso (smoothstep ease)
      float p = smoothstep(0.0, 1.0, uGazeProgress);
      float baseIntensity = p * 0.7 + uGazeActivated * (0.65 + 0.35 * pulse);

      // Boost dorado durante la captura
      float captureBoost = uGazeCapture * (1.5 + 0.5 * sin(uGazeTime * 6.0));

      // Paleta dorada: champán cálido → oro claro brillante
      vec3 goldDeep = vec3(0.96, 0.66, 0.22);
      vec3 goldLight = vec3(1.0, 0.93, 0.66);
      vec3 goldMix = mix(goldDeep, goldLight, wave);

      vec3 add = vec3(0.0);
      add += goldMix * fresnelSoft * baseIntensity * 1.4;
      add += goldLight * fresnelEdge * (baseIntensity + captureBoost) * 2.2;
      add += goldDeep * captureBoost * 0.8;

      gl_FragColor.rgb += add;
    }`,
}

function patchShader(shader, uniforms) {
  shader.uniforms.uGazeTime = uniforms.uGazeTime
  shader.uniforms.uGazeProgress = uniforms.uGazeProgress
  shader.uniforms.uGazeActivated = uniforms.uGazeActivated
  shader.uniforms.uGazeCapture = uniforms.uGazeCapture

  let vs = shader.vertexShader
  for (const [token, replacement] of Object.entries(vertexInjections)) {
    if (vs.includes(token)) vs = vs.replace(token, replacement)
  }
  shader.vertexShader = vs

  let fs = shader.fragmentShader
  for (const [token, replacement] of Object.entries(fragmentInjections)) {
    if (fs.includes(token)) fs = fs.replace(token, replacement)
  }
  shader.fragmentShader = fs
}

export default function useGoldGazeShader({ scene, progress, activated, capture = 0 }) {
  const uniformsRef = useRef({
    uGazeTime: { value: 0 },
    uGazeProgress: { value: 0 },
    uGazeActivated: { value: 0 },
    uGazeCapture: { value: 0 },
  })

  useEffect(() => {
    if (!scene) return
    const uniforms = uniformsRef.current

    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return
      child.castShadow = true
      child.receiveShadow = true

      const cloned = child.material.clone()
      const origOnBeforeCompile = cloned.onBeforeCompile?.bind(cloned)

      cloned.onBeforeCompile = (shader) => {
        if (origOnBeforeCompile) origOnBeforeCompile(shader)
        patchShader(shader, uniforms)
      }
      cloned.needsUpdate = true
      child.material = cloned
    })
  }, [scene])

  useFrame((state) => {
    const u = uniformsRef.current
    u.uGazeTime.value = state.clock.elapsedTime
    u.uGazeProgress.value = progress
    u.uGazeActivated.value = activated ? 1.0 : 0.0
    u.uGazeCapture.value = capture
  })
}
