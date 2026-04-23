import { OHM } from '../tokens'

export default function ProgressRing({ done, total }) {
  const r            = 14
  const circumference = 2 * Math.PI * r
  const pct          = total ? done / total : 0

  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle
        cx="18" cy="18" r={r}
        fill="none" stroke={OHM.line} strokeWidth="2.5"
      />
      <circle
        cx="18" cy="18" r={r}
        fill="none" stroke={OHM.primary} strokeWidth="2.5"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>
  )
}
