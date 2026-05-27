import { Html } from '@react-three/drei'

/**
 * Cuenta atrás circular dorada que aparece durante la activación por mirada.
 * - `progress` 0..1 representa el avance de la mirada.
 * - `duration` segundos totales del gesto.
 */
export default function GazeCountdown({ progress = 0, duration = 2, position = [0, 0.9, 0] }) {
  if (progress <= 0.01) return null

  const remaining = Math.max(0, duration - progress * duration)
  const display = progress >= 1 ? '✦' : Math.max(1, Math.ceil(remaining))

  const radius = 30
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - Math.min(1, progress))

  return (
    <Html position={position} center transform={false}>
      <div
        style={{
          position: 'relative',
          width: 72,
          height: 72,
          pointerEvents: 'none',
          transform: `scale(${0.85 + progress * 0.25})`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <svg width={72} height={72} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <filter id="gazeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={36}
            cy={36}
            r={radius}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={3}
            fill="rgba(0,0,0,0.45)"
          />
          <circle
            cx={36}
            cy={36}
            r={radius}
            stroke="#ffd66b"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 36 36)"
            filter="url(#gazeGlow)"
            style={{ transition: 'stroke-dashoffset 0.08s linear' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: '"Inter", "Helvetica Neue", sans-serif',
            fontWeight: 300,
            fontSize: 26,
            letterSpacing: 0.5,
            textShadow: '0 0 14px rgba(255,204,51,0.85)',
          }}
        >
          {display}
        </div>
      </div>
    </Html>
  )
}
