import { useEffect, useState } from 'react'
import { OHM } from '../tokens'

// Approximate real timings based on the backend pipeline:
//  0–3s   buildPromptContext (DB query)
//  3–50s  PubMed: 15 queries × 2 API calls × 350ms delay + HTTP round-trips
//  50–80s Claude: writes 10 editorial cards (~20–30s)
//  80–90s Supabase insert
const STEPS = [
  { label: 'Checking your triage history',         end: 3  },
  { label: 'Querying PubMed for real papers',       end: 50 },
  { label: 'Claude writing editorial cards',        end: 80 },
  { label: 'Saving cards to database',              end: 90 },
]
const TOTAL = 90

export default function GeneratingProgress({ isMobile }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - start) / 1000))
    }, 500)
    return () => clearInterval(id)
  }, [])

  const activeStep = STEPS.findIndex(s => elapsed < s.end)
  const pct = Math.min(Math.round((elapsed / TOTAL) * 100), 97) // never reach 100 until done

  return (
    <div style={{
      margin: isMobile ? '32px 0' : '48px 0',
      maxWidth: 520,
    }}>
      <div style={{
        fontFamily: '"Source Serif 4", Georgia, serif',
        fontSize: isMobile ? 20 : 24,
        fontWeight: 400,
        color: OHM.ink,
        marginBottom: 6,
        letterSpacing: -0.3,
      }}>
        Generating this week&apos;s signal…
      </div>
      <div style={{ fontSize: 13, color: OHM.muted, marginBottom: 28, lineHeight: 1.5 }}>
        Fetching real papers from PubMed, then asking Claude to write the editorial layer. This takes 20–30 seconds.
      </div>

      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {STEPS.map((step, i) => {
          const done    = elapsed >= step.end
          const active  = i === activeStep
          const pending = !done && !active

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

              {/* Icon */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? OHM.primary : active ? OHM.sage : OHM.lineSoft,
                border: `1.5px solid ${done ? OHM.primary : active ? OHM.sageDeep : OHM.line}`,
                transition: 'background 0.3s, border-color 0.3s',
              }}>
                {done ? (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : active ? (
                  <Pulse />
                ) : null}
              </div>

              {/* Label + elapsed */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: done ? OHM.muted : active ? OHM.ink : OHM.mutedLt,
                  transition: 'color 0.3s',
                }}>
                  {step.label}
                </span>
                {active && (
                  <span style={{ fontSize: 11, color: OHM.mutedLt, fontFeatureSettings: '"tnum"' }}>
                    {elapsed}s
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 2,
        background: OHM.lineSoft,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${OHM.primary}, ${OHM.primary2})`,
          borderRadius: 2,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: OHM.mutedLt, fontFeatureSettings: '"tnum"' }}>
        {pct}% · {elapsed}s elapsed
      </div>
    </div>
  )
}

function Pulse() {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: OHM.primary,
      animation: 'ohm-pulse 1.1s ease-in-out infinite',
    }}>
      <style>{`
        @keyframes ohm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.65); }
        }
      `}</style>
    </div>
  )
}
