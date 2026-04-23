import { OHM } from '../tokens'

export default function Logo({ color = OHM.primary, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke={color} strokeWidth="1.4" />
      <circle cx="11" cy="7.5" r="1.5" fill={color} />
    </svg>
  )
}
