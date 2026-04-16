import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// ─── Design tokens ────────────────────────────────────────────────
const PRIMARY    = '#1A3C2B'
const PRIMARY_LT = '#EAF3DE'
const MUTED      = '#6B7280'
const BORDER     = '#E5E7EB'

const CATEGORY_COLORS = {
  'Clinical & Psychiatric':            '#1A3C2B',
  'Intervention & Neuromodulation':    '#085041',
  'Lifestyle, Systems & Optimization': '#3B6D11',
  'Psychedelics & Novel Therapeutics': '#0F6E56',
  'Emerging & Frontier':               '#27500A',
  'Neuroscience':                      '#639922',
}

const STATUS_COLORS = {
  'Idea':               '#1A3C2B',
  'Under Review':       '#2E5C42',
  'Selected for Batch': '#639922',
  'Researching':        '#3B6D11',
  'Drafting':           '#085041',
  'Editing':            '#0F6E56',
  'Published':          '#27500A',
}

function getWeekLabel() {
  const now   = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`
}

// ─── Sidebar ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Intelligence Feed', icon: '⚡', active: true },
  { label: 'Pipeline',          icon: '⬡',  active: false, soon: true },
  { label: 'Batch View',        icon: '▦',  active: false, soon: true },
  { label: 'Topic Detail',      icon: '◈',  active: false, soon: true },
]

function Sidebar() {
  return (
    <aside style={{
      width: '220px', minHeight: '100vh', flexShrink: 0,
      backgroundColor: PRIMARY, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '12px', fontWeight: '700', letterSpacing: '-0.5px',
          }}>ON</div>
          <div>
            <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>Ohm Neuro</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Intelligence V2
            </div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
            backgroundColor: item.active ? 'rgba(255,255,255,0.12)' : 'transparent',
            cursor: item.soon ? 'default' : 'pointer',
            opacity: item.soon ? 0.45 : 1,
          }}>
            <span style={{ fontSize: '14px' }}>{item.icon}</span>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: item.active ? '600' : '400', flex: 1 }}>
              {item.label}
            </span>
            {item.soon && (
              <span style={{
                fontSize: '9px', color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.04em',
              }}>SOON</span>
            )}
          </div>
        ))}
      </nav>

      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
          Prompt v1.1 · No API yet
        </div>
      </div>
    </aside>
  )
}

// ─── Stats strip ──────────────────────────────────────────────────
function StatsStrip({ topics, loading, reacted }) {
  const published  = topics.filter(t => t.status === 'Published').length
  const inProgress = topics.filter(t => ['Researching', 'Drafting', 'Editing'].includes(t.status)).length
  const ideas      = topics.filter(t => t.status === 'Idea').length

  const stats = [
    { label: 'Topics this week', value: loading ? '—' : topics.length },
    { label: 'In progress',      value: loading ? '—' : inProgress },
    { label: 'Ideas queued',     value: loading ? '—' : ideas },
    { label: 'Reviewed',         value: loading ? '—' : reacted },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1px', backgroundColor: BORDER,
      borderRadius: '10px', overflow: 'hidden',
      border: `1px solid ${BORDER}`, marginBottom: '32px',
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{ backgroundColor: '#fff', padding: '16px 20px' }}>
          <div style={{ fontSize: '22px', fontWeight: '700', color: PRIMARY, lineHeight: 1 }}>
            {s.value}
          </div>
          <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Topic card ───────────────────────────────────────────────────
function TopicCard({ topic, index, onReact, onUnreact }) {
  const [reaction, setReaction]     = useState(null) // 'full_piece' | 'supporting' | 'monitor'
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason]         = useState('')
  const [confirmed, setConfirmed]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)

  const catColor = CATEGORY_COLORS[topic.category] || PRIMARY
  const stsColor = STATUS_COLORS[topic.status]     || PRIMARY

  const tierStyle = topic.source_tier === 'Tier 2'
    ? { backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }
    : { backgroundColor: '#EAF3DE', color: '#1A3C2B', border: '1px solid #C6DFB0' }

  const isReacted = reaction !== null && (reaction === 'full_piece' || reaction === 'supporting' || confirmed)

  const reactionBadge = {
    full_piece:  { label: '✓ Full Piece',  bg: '#EAF3DE', color: '#1A3C2B', border: '1px solid #C6DFB0' },
    supporting:  { label: '✓ Supporting',  bg: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' },
    monitor:     { label: '✕ Monitor',     bg: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' },
  }

  async function saveReaction(type, reasonText = '') {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('reactions').insert({
      topic_id:       topic.id,
      reaction:       type,
      reason:         reasonText || null,
      prompt_version: 'v1.1',
    })
    if (error) {
      console.error('Reaction save error:', error)
      setSaveError('Failed to save — try again')
    } else {
      onReact()
    }
    setSaving(false)
  }

  async function handleFullPiece() {
    setReaction('full_piece')
    setShowReason(false)
    setConfirmed(true)
    await saveReaction('full_piece')
  }

  async function handleSupporting() {
    setReaction('supporting')
    setShowReason(false)
    setConfirmed(true)
    await saveReaction('supporting')
  }

  function handleMonitor() {
    setReaction('monitor')
    setShowReason(true)
    setConfirmed(false)
  }

  async function handleConfirmMonitor() {
    setConfirmed(true)
    setShowReason(false)
    await saveReaction('monitor', reason)
  }

  function handleUndo() {
    setReaction(null)
    setConfirmed(false)
    setReason('')
    setShowReason(false)
    setSaveError(null)
    onUnreact()
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      border: `1px solid ${BORDER}`,
      borderLeft: `3px solid ${isReacted ? '#C4C4C4' : catColor}`,
      borderRadius: '10px',
      padding: '20px 24px',
      opacity: isReacted ? 0.6 : 1,
      transition: 'opacity 0.2s ease',
    }}>

      {/* Row 1 — index · category · tier · reaction badge · batch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: '#C4C4C4', fontWeight: '600', minWidth: '22px' }}>
          {String(index + 1).padStart(2, '0')}
        </span>

        {topic.category && (
          <span style={{
            fontSize: '11px', fontWeight: '500',
            padding: '2px 8px', borderRadius: '4px',
            backgroundColor: PRIMARY_LT, color: catColor,
          }}>
            {topic.category}
          </span>
        )}

        {topic.source_tier && (
          <span style={{
            fontSize: '11px', fontWeight: '500',
            padding: '2px 8px', borderRadius: '4px',
            ...tierStyle,
          }}>
            {topic.source_tier}
          </span>
        )}

        {isReacted && reaction && reactionBadge[reaction] && (
          <span style={{
            fontSize: '11px', fontWeight: '500',
            padding: '2px 8px', borderRadius: '4px',
            backgroundColor: reactionBadge[reaction].bg,
            color: reactionBadge[reaction].color,
            border: reactionBadge[reaction].border,
          }}>
            {reactionBadge[reaction].label}
          </span>
        )}

        {saveError && (
          <span style={{ fontSize: '11px', color: '#991B1B', marginLeft: '4px' }}>
            {saveError}
          </span>
        )}

        {topic.batch_id && (
          <span style={{ fontSize: '11px', color: '#C4C4C4', marginLeft: 'auto' }}>
            {topic.batch_id}
          </span>
        )}
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: '16px', fontWeight: '600',
        color: '#111', margin: '0 0 8px 0', lineHeight: '1.4',
      }}>
        {topic.title}
      </h2>

      {/* Brief */}
      {topic.research_brief && (
        <p style={{
          fontSize: '13px', color: '#6B7280',
          margin: '0 0 16px 0', lineHeight: '1.65',
        }}>
          {topic.research_brief}
        </p>
      )}

      {/* Monitor reason box */}
      {showReason && !confirmed && (
        <div style={{
          marginBottom: '14px', padding: '12px 14px',
          backgroundColor: '#FFF7ED', border: '1px solid #FED7AA',
          borderRadius: '8px',
        }}>
          <p style={{ fontSize: '12px', color: '#92400E', margin: '0 0 8px 0', fontWeight: '500' }}>
            Why are you monitoring this topic?
          </p>
          <input
            type="text"
            placeholder="e.g. too early, needs more evidence, revisit next quarter…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px',
              border: '1px solid #FCD34D', borderRadius: '6px',
              fontSize: '12px', color: '#111', backgroundColor: '#fff',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={handleConfirmMonitor}
              disabled={saving}
              style={{
                padding: '5px 14px', borderRadius: '6px',
                backgroundColor: saving ? '#888' : PRIMARY, color: '#fff',
                border: 'none', fontSize: '12px', cursor: saving ? 'default' : 'pointer', fontWeight: '500',
              }}>
              {saving ? 'Saving…' : 'Confirm Monitor'}
            </button>
            <button
              onClick={() => { setReaction(null); setShowReason(false) }}
              style={{
                padding: '5px 14px', borderRadius: '6px',
                backgroundColor: '#fff', color: MUTED,
                border: `1px solid ${BORDER}`, fontSize: '12px', cursor: 'pointer',
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Row 2 — status + buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '11px', fontWeight: '500',
          padding: '3px 10px', borderRadius: '999px',
          backgroundColor: stsColor, color: '#fff',
        }}>
          {topic.status || 'Idea'}
        </span>

        {!isReacted ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleFullPiece}
              disabled={saving}
              style={{
                padding: '5px 14px', borderRadius: '6px',
                border: '1px solid #C6DFB0',
                backgroundColor: '#fff', color: PRIMARY,
                fontSize: '12px', cursor: saving ? 'default' : 'pointer', fontWeight: '500',
              }}>
              {saving ? 'Saving…' : '📄 Full Piece'}
            </button>
            <button
              onClick={handleSupporting}
              disabled={saving}
              style={{
                padding: '5px 14px', borderRadius: '6px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#fff', color: '#1E40AF',
                fontSize: '12px', cursor: saving ? 'default' : 'pointer', fontWeight: '500',
              }}>
              {saving ? 'Saving…' : '🔗 Supporting'}
            </button>
            <button
              onClick={handleMonitor}
              disabled={saving}
              style={{
                padding: '5px 14px', borderRadius: '6px',
                border: `1px solid ${BORDER}`,
                backgroundColor: '#fff', color: MUTED,
                fontSize: '12px', cursor: saving ? 'default' : 'pointer', fontWeight: '500',
              }}>
              👁 Monitor
            </button>
          </div>
        ) : (
          <button
            onClick={handleUndo}
            style={{
              padding: '5px 14px', borderRadius: '6px',
              border: `1px solid ${BORDER}`, backgroundColor: '#fff',
              color: MUTED, fontSize: '11px', cursor: 'pointer',
            }}>
            Undo
          </button>
        )}
      </div>

    </div>
  )
}

// ─── Main feed ────────────────────────────────────────────────────
function Feed() {
  const [topics, setTopics]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [reactedCount, setReactedCount] = useState(0)

  useEffect(() => {
    async function fetchTopics() {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) console.error('Supabase error:', error)
      else setTopics(data)
      setLoading(false)
    }
    fetchTopics()
  }, [])

  return (
    <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', backgroundColor: '#F9FAFB' }}>

      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: PRIMARY, margin: '0 0 4px 0' }}>
              Intelligence Feed
            </h1>
            <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>
              {getWeekLabel()} · High-signal neuroscience digest
            </p>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '999px',
            backgroundColor: PRIMARY_LT, border: '1px solid #C6DFB0',
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: PRIMARY }} />
            <span style={{ fontSize: '12px', fontWeight: '500', color: PRIMARY }}>
              {loading ? 'Loading…' : `${topics.length} of 10 topics`}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '20px', height: '1px', backgroundColor: BORDER }} />
      </div>

      <StatsStrip topics={topics} loading={loading} reacted={reactedCount} />

      {loading ? (
        <p style={{ color: MUTED, fontSize: '14px' }}>Loading this week's signal…</p>
      ) : topics.length === 0 ? (
        <div style={{
          padding: '32px', borderRadius: '10px',
          backgroundColor: PRIMARY_LT, border: '1px solid #C6DFB0',
          textAlign: 'center',
        }}>
          <p style={{ color: PRIMARY, fontSize: '14px', margin: 0 }}>
            No topics found. Add some rows to your Supabase <code>topics</code> table.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {topics.map((topic, i) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={i}
              onReact={() => setReactedCount(c => c + 1)}
              onUnreact={() => setReactedCount(c => Math.max(0, c - 1))}
            />
          ))}
        </div>
      )}

      {!loading && topics.length > 0 && (
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#C4C4C4' }}>
            Ohm Neuro · Intelligence V2 · Prompt v1.1
          </span>
        </div>
      )}

    </main>
  )
}

// ─── Root ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <Sidebar />
      <Feed />
    </div>
  )
}