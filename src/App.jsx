import { useEffect, useState } from 'react'
import { OHM } from './tokens'
import { getWeekLabel, groupTopics } from './utils/helpers'
import { useTopicCards }   from './hooks/useTopicCards'
import Sidebar             from './components/Sidebar'
import ProgressRing        from './components/ProgressRing'
import TopicRow            from './components/TopicRow'
import RegenerateButton    from './components/RegenerateButton'
import GeneratingProgress  from './components/GeneratingProgress'
import PipelineView        from './views/PipelineView'
import PromptView          from './views/PromptView'

const WEEK_LABEL = getWeekLabel()

const STAT_CONFIG = topics => [
  ['Cards',    topics.length,                       OHM.primary],
  ['Reviewed', 0,                                   OHM.blueInk],
]

export default function App() {

  const {
    cards:      topics,
    loading,
    generating,
    error:      genError,
    lastToast,
    loadLatest,
    regenerate,
  } = useTopicCards()

  const [activeView,        setActiveView]        = useState('feed')
  const [reactedCount,      setReactedCount]      = useState(0)
  const [grouping,          setGrouping]          = useState('none')
  const [sidebarOpen,       setSidebarOpen]       = useState(false)
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false)
  const [isMobile,          setIsMobile]          = useState(() => window.innerWidth < 768)
  const [readerIndex,       setReaderIndex]       = useState(null)

  useEffect(() => { loadLatest() }, [loadLatest])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const batchId = topics[0]?.prompt_version || '—'
  const groups  = groupTopics(topics, grouping)
  const stats   = [
    ...STAT_CONFIG(topics),
    ['Remaining', topics.length - reactedCount, OHM.muted],
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: OHM.paper, color: OHM.ink }}>

      <Sidebar
        batchId={batchId}
        promptVersion="v2.0"
        activeView={activeView}
        onNavigate={setActiveView}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={!isMobile && sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        isMobile={isMobile}
      />

      {/* Desktop re-expand tab when sidebar is collapsed */}
      {!isMobile && sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          title="Expand sidebar"
          style={{
            position: 'fixed', top: 20, left: 8, zIndex: 30,
            background: OHM.paper, border: `1px solid ${OHM.line}`,
            borderRadius: 6, padding: '7px 8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l5 5-5 5" stroke={OHM.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {activeView === 'pipeline' && <PipelineView isMobile={isMobile} />}
      {activeView === 'prompt'   && <PromptView   isMobile={isMobile} />}

      <main style={{ flex: 1, minWidth: 0, background: OHM.paper, display: activeView === 'feed' ? 'block' : 'none' }}>

        {/* ── Top bar ── */}
        <div style={{ borderBottom: `1px solid ${OHM.line}`, padding: isMobile ? '12px 16px 14px' : '16px 24px 16px', background: OHM.paper }}>

          {/* Top row: hamburger/expand + wordmark + regenerate on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isMobile ? 14 : 12 }}>
            <button
              onClick={() => isMobile ? setSidebarOpen(true) : setSidebarCollapsed(c => !c)}
              aria-label="Toggle navigation"
              style={{
                background: 'none', border: `1px solid ${OHM.line}`, borderRadius: 6,
                cursor: 'pointer', padding: '7px 9px',
                display: 'flex', flexDirection: 'column', gap: 4,
                minHeight: 36, minWidth: 36, alignItems: 'center', justifyContent: 'center',
              }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} style={{ display: 'block', width: 16, height: 1.5, background: OHM.primary }} />
              ))}
            </button>
            <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 14, color: OHM.muted, flex: 1 }}>
              OHM NEURO
            </div>
            {/* Regenerate on mobile sits in top bar */}
            {isMobile && (
              <RegenerateButton
                loading={loading}
                error={genError}
                lastToast={lastToast}
                onRegenerate={regenerate}
                compact
              />
            )}
          </div>

          {/* Hero row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 10 : 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.primary, fontWeight: 700, marginBottom: 6 }}>
                Intelligence Feed · Week of {WEEK_LABEL.split(',')[0]}
              </div>
              <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: isMobile ? 24 : 36, fontWeight: 400, margin: 0, letterSpacing: -0.4, lineHeight: 1.05 }}>
                This week&apos;s signal.
              </h1>
              <div style={{ fontSize: 13, color: OHM.muted, marginTop: 6, maxWidth: 560, lineHeight: 1.55 }}>
                {generating
                  ? 'Fetching real papers from PubMed and generating cards…'
                  : loading
                  ? 'Loading topics…'
                  : `${topics.length} cards loaded. Decide what becomes a draft, supporting link, or monitor.`
                }
              </div>
            </div>

            {/* Progress ring + count + regenerate — desktop only */}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', flexShrink: 0 }}>
                <ProgressRing done={reactedCount} total={topics.length} />
                <div>
                  <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 22, color: OHM.ink, lineHeight: 1 }}>
                    {reactedCount}
                    <span style={{ color: OHM.mutedLt, fontSize: 16 }}> / {topics.length}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: OHM.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                    Reviewed
                  </div>
                </div>
                <RegenerateButton
                  loading={loading}
                  error={genError}
                  lastToast={lastToast}
                  onRegenerate={regenerate}
                />
              </div>
            )}
          </div>

          {/* Stat grid — 3 cols desktop, row of pills on mobile */}
          {!loading && (
            isMobile ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {stats.map(([label, value, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: OHM.cream, border: `1px solid ${OHM.line}`, borderRadius: 20, padding: '5px 12px' }}>
                    <span style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 15, fontWeight: 400, color, fontFeatureSettings: '"tnum"' }}>{value}</span>
                    <span style={{ fontSize: 10, color: OHM.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: OHM.line, borderRadius: 6, overflow: 'hidden', border: `1px solid ${OHM.line}`, marginTop: 22 }}>
                {stats.map(([label, value, color]) => (
                  <div key={label} style={{ background: OHM.paper, padding: '12px 16px' }}>
                    <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 26, fontWeight: 400, color, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
                      {value}
                    </div>
                    <div style={{ fontSize: 10.5, color: OHM.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 5 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* ── Feed ── */}
        <div style={{ padding: `${isMobile ? '20px' : '28px'} ${isMobile ? '12px' : '44px'} 80px`, maxWidth: 900 }}>

          {/* Grouping controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isMobile ? 16 : 20 }}>
            <span style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em' }}>Group by</span>
            {['none', 'category'].map(g => (
              <button
                key={g}
                onClick={() => setGrouping(g)}
                style={{
                  padding: isMobile ? '5px 12px' : '4px 10px', borderRadius: 4, fontSize: 11,
                  border:     `1px solid ${grouping === g ? OHM.primary : OHM.line}`,
                  background: grouping === g ? OHM.primary : OHM.paper,
                  color:      grouping === g ? '#fff' : OHM.muted,
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                  minHeight: 32,
                }}
              >
                {g === 'none' ? 'None' : g}
              </button>
            ))}
          </div>

          {generating && (
            <GeneratingProgress isMobile={isMobile} />
          )}

          {!generating && loading && (
            <div style={{ padding: '40px 0', color: OHM.muted, fontSize: 14 }}>
              Loading this week&apos;s signal…
            </div>
          )}

          {!generating && !loading && topics.length === 0 && (
            <div style={{ padding: isMobile ? '24px 20px' : '32px', borderRadius: 8, background: OHM.sage, border: `1px solid ${OHM.sageDeep}` }}>
              <p style={{ color: OHM.primary, fontSize: 14, margin: 0 }}>
                No cards yet — click <strong>↻ Regenerate</strong> to generate this week&apos;s signal.
              </p>
            </div>
          )}

          {!generating && !loading && groups.map(({ key, label, items }) => (
            <section key={key} style={{ marginBottom: 28 }}>
              {grouping !== 'none' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, marginTop: 16 }}>
                  <span style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: OHM.muted, fontWeight: 700 }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: OHM.mutedLt, fontFeatureSettings: '"tnum"' }}>
                    · {items.length}
                  </span>
                  <div style={{ flex: 1, height: 1, background: OHM.lineSoft }} />
                </div>
              )}
              {items.map((topic, i) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  topics={topics}
                  index={i}
                  isMobile={isMobile}
                  readerIndex={readerIndex}
                  setReaderIndex={setReaderIndex}
                  onReact={() => setReactedCount(c => c + 1)}
                  onUndo={()  => setReactedCount(c => Math.max(0, c - 1))}
                />
              ))}
            </section>
          ))}

          {!generating && !loading && topics.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: OHM.mutedLt, letterSpacing: '0.08em' }}>
              End of week&apos;s signal · Ohm Neuro Intelligence V2 · PubMed + Claude
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
