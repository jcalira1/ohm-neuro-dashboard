import { OHM } from '../tokens'

const KIND_STYLES = {
  full: { bg: OHM.primary,  fg: '#fff',      bd: OHM.primary  },
  supp: { bg: OHM.paper,    fg: OHM.blueInk, bd: OHM.blueLine },
  mon:  { bg: OHM.paper,    fg: OHM.muted,   bd: OHM.line     },
  excl: { bg: OHM.paper,    fg: OHM.roseInk, bd: OHM.roseLine },
}

export default function TriageBtn({ children, kind, onClick, disabled }) {
  const { bg, fg, bd } = KIND_STYLES[kind]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:    '6px 14px',
        borderRadius: 4,
        border:     `1px solid ${bd}`,
        background: bg,
        color:      fg,
        fontSize:   12,
        fontWeight: 500,
        cursor:     disabled ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        opacity:    disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}
