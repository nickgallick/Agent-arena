'use client'

// CapabilityRadar — SVG radar chart for agent capability profiles
// Forge · Phase 3 · 2026-03-27

interface RadarDimension {
  label: string
  key: string
  value: number  // 0-100
}

interface CapabilityRadarProps {
  data: {
    reasoning_depth?: number
    tool_discipline?: number
    recovery_quality?: number
    strategic_planning?: number
    integrity_reliability?: number
    verification_discipline?: number
  }
  size?: number
  className?: string
  showLabels?: boolean
}

const DIMENSIONS = [
  { key: 'reasoning_depth',        label: 'Reasoning'   },
  { key: 'strategic_planning',     label: 'Strategy'    },
  { key: 'verification_discipline',label: 'Verification'},
  { key: 'recovery_quality',       label: 'Recovery'    },
  { key: 'integrity_reliability',  label: 'Integrity'   },
  { key: 'tool_discipline',        label: 'Tools'       },
]

function polarToCartesian(cx: number, cy: number, r: number, angleIndex: number, total: number) {
  const angle = (Math.PI * 2 * angleIndex) / total - Math.PI / 2
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

export function CapabilityRadar({ data, size = 120, className = '', showLabels = false }: CapabilityRadarProps) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - (showLabels ? 20 : 8)
  const n = DIMENSIONS.length

  const values: RadarDimension[] = DIMENSIONS.map(d => ({
    label: d.label,
    key: d.key,
    value: Math.max(0, Math.min(100, data[d.key as keyof typeof data] ?? 50)),
  }))

  // Grid rings at 25/50/75/100%
  const rings = [0.25, 0.5, 0.75, 1.0]

  // Polygon points for the data shape
  const dataPoints = values
    .map((v, i) => {
      const pt = polarToCartesian(cx, cy, (v.value / 100) * maxR, i, n)
      return `${pt.x},${pt.y}`
    })
    .join(' ')

  // Grid polygon points for each ring
  const ringPoints = rings.map(ring =>
    DIMENSIONS.map((_, i) => {
      const pt = polarToCartesian(cx, cy, ring * maxR, i, n)
      return `${pt.x},${pt.y}`
    }).join(' ')
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="Agent capability radar chart"
    >
      {/* Grid rings */}
      {ringPoints.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {DIMENSIONS.map((_, i) => {
        const outer = polarToCartesian(cx, cy, maxR, i, n)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(77,142,254,0.15)"
        stroke="#4d8efe"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {values.map((v, i) => {
        const pt = polarToCartesian(cx, cy, (v.value / 100) * maxR, i, n)
        return (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="2"
            fill="#4d8efe"
          />
        )
      })}

      {/* Labels (optional) */}
      {showLabels && values.map((v, i) => {
        const pt = polarToCartesian(cx, cy, maxR + 14, i, n)
        return (
          <text
            key={i}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.5)"
          >
            {v.label}
          </text>
        )
      })}
    </svg>
  )
}

// CapabilityBadge — compact sub-rating pills for leaderboard rows
interface CapabilityBadgeProps {
  process?: number
  strategy?: number
  integrity?: number
  efficiency?: number
}

export function CapabilityBadges({ process, strategy, integrity, efficiency }: CapabilityBadgeProps) {
  const badges = [
    { label: 'Process', value: process,   color: 'text-blue-400' },
    { label: 'Strategy', value: strategy,  color: 'text-purple-400' },
    { label: 'Integrity', value: integrity, color: 'text-green-400' },
    { label: 'Efficiency', value: efficiency, color: 'text-yellow-400' },
  ].filter(b => b.value != null)

  if (badges.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {badges.map(b => (
        <span
          key={b.label}
          className={`text-[10px] font-mono ${b.color} opacity-80`}
          title={`${b.label}: ${b.value?.toFixed(0)}/100`}
        >
          {b.label[0]}{b.value?.toFixed(0)}
        </span>
      ))}
    </div>
  )
}
