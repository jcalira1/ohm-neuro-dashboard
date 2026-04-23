import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { OHM } from './tokens'
import { getWeekLabel, groupTopics } from './utils/helpers'
import Sidebar      from './components/Sidebar'
import ProgressRing from './components/ProgressRing'
import TopicRow     from './components/TopicRow'

const WEEK_LABEL = getWeekLabel()

const STAT_CONFIG = topics => [
  ['Topics',     topics.length,                                                        OHM.primary],
  ['Researching',topics.filter(t => t.status === 'Researching').length,                OHM.blueInk],
  ['Drafting',   topics.filter(t => ['Drafting', 'Editing'].includes(t.status)).length, OHM.roseInk],
]

export default function App() {
  const [topics,       setTopics]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [reactedCount, setReactedCount] = useState(0)
  const [grouping,     setGrouping]     = useState('none')
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    async function fetchTopics() {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) console.error('Supabase error:', error)
      else setTopics(data || [])
      setLoading(false)
    }
    fetchTopics()
  }, [])

  const batchId = topics.find(t => t.batch_id)?.batch_id
  const groups  = groupTopics(topics, grouping)
  const stats   = [
    ...STAT_CONFIG(topics),
    ['Remaining', topics.length - reactedCount, OHM.muted],
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: OHM.paper, color: OHM.ink }}>

      <Sidebar
        batchId={batchId}
        promptVersion="v1.1"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />

      <main style={{ flex: 1, minWidth: 0, background: OHM.paper }}>

        <div style={{ borderBottom: `1px solid ${OHM.line}`, padding: '16px 20px', background: OHM.paper }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              style={{ background: 'none', border: `1px solid ${OHM.line}`, borderRadius: 6, cursor: 'pointer', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} style={{ display: 'block', width: 16, height: 1.5, background: OHM.primary }} />
              ))}
            </button>
            <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 14, color: OHM.muted }}>
              OHM NEURO
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.primary, fontWeight: 700, marginBottom: 8 }}>
                Intelligence Feed · Week of {WEEK_LABEL.split(',')[0]}
              </div>
              <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 36, fontWeight: 400, margin: 0, letterSpacing: -0.6, lineHeight: 1.05 }}>
                This week&apos;s signal.
              </h1>
              <div style={{ fontSize: 13, color: OHM.muted, marginTop: 8, maxWidth: 560, lineHeight: 1.55 }}>
                {loading
                  ? 'Loading topics...'
                  : `${topics.length} topics from Supabase. Decide what becomes a draft, supporting link, or monitor.`
                }
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
            </div>
          </div>

          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1, background: OHM.line, borderRadius: 6, overflow: 'hidden', border: `1px solid ${OHM.line}`, marginTop: 22 }}>
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
          )}
        </div>

        <div style={{ padding: '28px 44px 80px', maxWidth: 900 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em' }}>Group by</span>
            {['none', 'category', 'status'].map(g => (
              <button
                key={g}
                onClick={() => setGrouping(g)}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 11,
                  border:     `1px solid ${grouping === g ? OHM.primary : OHM.line}`,
                  background: grouping === g ? OHM.primary : OHM.paper,
                  color:      grouping === g ? '#fff' : OHM.muted,
                  cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                }}
              >
                {g === 'none' ? 'None' : g}
              </button>
            ))}
          </div>

          {loading && (
            <div style={{ padding: '40px 0', color: OHM.muted, fontSize: 14 }}>
              Loading this week&apos;s signal...
            </div>
          )}

          {!loading && topics.length === 0 && (
            <div style={{ padding: '32px', borderRadius: 8, background: OHM.sage, border: `1px solid ${OHM.sageDeep}` }}>
              <p style={{ color: OHM.primary, fontSize: 14, margin: 0 }}>
                No topics found. Add rows to your Supabase <code>topics</code> table.
              </p>
            </div>
          )}

          {!loading && groups.map(({ key, label, items }) => (
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
                  index={i}
                  onReact={() => setReactedCount(c => c + 1)}
                  onUndo={()  => setReactedCount(c => Math.max(0, c - 1))}
                />
              ))}
            </section>
          ))}

          {!loading && topics.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: OHM.mutedLt, letterSpacing: '0.08em' }}>
              End of week&apos;s signal · Ohm Neuro Intelligence V2 · Prompt v1.1
            </div>
          )}
        </div>

      </main>
    </div>
  )
}