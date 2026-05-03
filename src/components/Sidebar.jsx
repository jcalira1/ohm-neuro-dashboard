import Logo from './Logo'
import { OHM } from '../tokens'

const NAV_ITEMS = [
  {
    view:  'feed',
    label: 'Intelligence Feed',
    icon: c => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 3h12M1 7h12M1 11h8" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view:  'pipeline',
    label: 'Pipeline',
    icon: c => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="4" height="12" rx="1" stroke={c} strokeWidth="1.4" />
        <rect x="6" y="1" width="4" height="8"  rx="1" stroke={c} strokeWidth="1.4" />
        <rect x="11" y="1" width="2" height="5" rx="1" stroke={c} strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    view:  null,
    label: 'Batch View',
    soon:  true,
    icon: c => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4" />
        <rect x="8" y="1" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4" />
        <rect x="1" y="8" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4" />
        <rect x="8" y="8" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    view:  null,
    label: 'Topic Detail',
    soon:  true,
    icon: c => (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 1h6l3 3v9H3z" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M5 7h5M5 10h4" stroke={c} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function Sidebar({ batchId, promptVersion, activeView, onNavigate, open, onClose, isMobile }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 40,
          }}
        />
      )}

      <aside style={{
        width:        230,
        flexShrink:   0,
        background:   OHM.paper,
        borderRight:  `1px solid ${OHM.line}`,
        display:      'flex',
        flexDirection:'column',
        minHeight:    '100vh',
        position:     isMobile ? 'fixed' : 'relative',
        top: 0, left: 0,
        height:       isMobile ? '100vh' : 'auto',
        zIndex:       isMobile ? 50 : 'auto',
        transform:    isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition:   isMobile ? 'transform 0.25s ease' : 'none',
        overflowY:    'auto',
      }}>

        {/* Header */}
        <div style={{
          padding: '24px 22px 22px',
          borderBottom: `1px solid ${OHM.lineSoft}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Logo color={OHM.primary} size={24} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 16, letterSpacing: 0.5, fontWeight: 500 }}>
              OHM NEURO
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: OHM.muted, marginTop: 2 }}>
              Intelligence V2
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: OHM.muted, fontSize: 18, lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: '14px 12px', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.view && activeView === item.view
            const color    = isActive ? OHM.primary : OHM.muted
            return (
              <div
                key={item.label}
                onClick={() => {
                  if (item.view) { onNavigate(item.view); if (isMobile) onClose() }
                }}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         10,
                  padding:     '9px 12px',
                  borderRadius: 6,
                  marginBottom: 2,
                  background:  isActive ? OHM.sage : 'transparent',
                  opacity:     item.soon ? 0.55 : 1,
                  cursor:      item.soon ? 'default' : 'pointer',
                }}
              >
                <span style={{ color, display: 'flex' }}>{item.icon(color)}</span>
                <span style={{ color: isActive ? OHM.ink : OHM.muted, fontSize: 13, fontWeight: isActive ? 600 : 400, flex: 1 }}>
                  {item.label}
                </span>
                {item.soon && (
                  <span style={{ fontSize: 9, color: OHM.mutedLt, border: `1px solid ${OHM.line}`, borderRadius: 3, padding: '1px 5px', letterSpacing: 0.6 }}>
                    SOON
                  </span>
                )}
              </div>
            )
          })}

          {/* Meta section */}
          <div style={{ margin: '22px 12px 10px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: OHM.mutedLt, fontWeight: 600 }}>
            This week
          </div>
          <div style={{ padding: '0 12px', fontSize: 12, color: OHM.muted, lineHeight: 1.6 }}>
            {[
              ['Batch',  batchId || '—'],
              ['Prompt', promptVersion || 'v1.1'],
              ['Source', 'Supabase'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{label}</span>
                <span style={{ color: OHM.ink, fontFeatureSettings: '"tnum"' }}>{value}</span>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer status */}
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${OHM.lineSoft}`, fontSize: 11, color: OHM.mutedLt }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: OHM.primary }} />
            <span>Connected · Supabase</span>
          </div>
        </div>

      </aside>
    </>
  )
}
