import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const OHM = {
  ink:      '#12251A',
  primary:  '#1A3C2B',
  primary2: '#2B6248',
  sage:     '#D9E8D1',
  sageDeep: '#B8D3A8',
  cream:    '#FAF7F0',
  paper:    '#FDFCF8',
  line:     '#E6E2D6',
  lineSoft: '#EEEAE0',
  muted:    '#6B6F67',
  mutedLt:  '#9DA19A',
  blueBg:   '#E5ECF4', blueInk:  '#2F4A6B', blueLine: '#CCD7E5',
  roseBg:   '#F3DDDB', roseInk:  '#9A4A44', roseLine: '#E5C6C3',
  sageBg:   '#DBE6CE', sageInk:  '#3E5C22', sageLine: '#C6D7B3',
  creamBg:  '#F2EBD6', creamInk: '#6B5A1F', creamLine:'#DED1A8',
  lilacBg:  '#E5DEEC', lilacInk: '#4F3E6B', lilacLine:'#D0C5DC',
  peachBg:  '#F5E2D2', peachInk: '#8A4F22', peachLine:'#E5CAA8',
}

const CAT_STYLE = {
  'Clinical & Psychiatric':            { bg: OHM.blueBg,  ink: OHM.blueInk,  line: OHM.blueLine  },
  'Intervention & Neuromodulation':    { bg: OHM.roseBg,  ink: OHM.roseInk,  line: OHM.roseLine  },
  'Lifestyle, Systems & Optimization': { bg: OHM.sageBg,  ink: OHM.sageInk,  line: OHM.sageLine  },
  'Psychedelics & Novel Therapeutics': { bg: OHM.lilacBg, ink: OHM.lilacInk, line: OHM.lilacLine },
  'Emerging & Frontier':               { bg: OHM.creamBg, ink: OHM.creamInk, line: OHM.creamLine },
  'Neuroscience':                      { bg: OHM.peachBg, ink: OHM.peachInk, line: OHM.peachLine },
}

const STATUSES = ['Idea','Under Review','Selected for Batch','Researching','Drafting','Editing','Published']

// ── Reason bubbles per vote direction ──
const BUBBLES = {
  up: [
    'Strong evidence base',
    'Emerging trend',
    'High audience relevance',
    'Unique angle',
    'Timely topic',
  ],
  down: [
    'Already covered',
    'Too niche',
    'Weak evidence',
    'Not relevant to audience',
    'Too broad',
  ],
  exclude: [
    'Not relevant to our audience',
    'Already covered recently',
    'Too controversial',
    'Insufficient evidence',
    'Outside our scope',
  ],
}

function weekLabel() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`
}

function groupTopics(topics, grouping) {
  if (grouping === 'category') {
    const m = {}
    topics.forEach(t => { (m[t.category] = m[t.category] || []).push(t) })
    return Object.entries(m).map(([k, items]) => ({ key: k, label: k, items }))
  }
  if (grouping === 'status') {
    const m = {}
    topics.forEach(t => { (m[t.status] = m[t.status] || []).push(t) })
    return STATUSES.filter(s => m[s]).map(s => ({ key: s, label: s, items: m[s] }))
  }
  return [{ key: 'all', label: 'All topics', items: topics }]
}

function Logo({ color = OHM.primary, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke={color} strokeWidth="1.4"/>
      <circle cx="11" cy="7.5" r="1.5" fill={color}/>
    </svg>
  )
}

function Sidebar({ batchId, promptVersion }) {
  const brand = OHM.primary
  const items = [
    { label: 'Intelligence Feed', active: true,  icon: c => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 3h12M1 7h12M1 11h8" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></svg> },
    { label: 'Pipeline',          soon:   true,  icon: c => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="4" height="12" rx="1" stroke={c} strokeWidth="1.4"/><rect x="6" y="1" width="4" height="8" rx="1" stroke={c} strokeWidth="1.4"/><rect x="11" y="1" width="2" height="5" rx="1" stroke={c} strokeWidth="1.4"/></svg> },
    { label: 'Batch View',        soon:   true,  icon: c => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4"/><rect x="8" y="1" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4"/><rect x="1" y="8" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4"/><rect x="8" y="8" width="5" height="5" rx="1" stroke={c} strokeWidth="1.4"/></svg> },
    { label: 'Topic Detail',      soon:   true,  icon: c => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9H3z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 7h5M5 10h4" stroke={c} strokeWidth="1.2" strokeLinecap="round"/></svg> },
  ]

  return (
    <aside style={{ width: 230, flexShrink: 0, background: OHM.paper, borderRight: `1px solid ${OHM.line}`, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ padding: '24px 22px 22px', borderBottom: `1px solid ${OHM.lineSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo color={brand} size={24}/>
        <div>
          <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 16, letterSpacing: 0.5, fontWeight: 500 }}>OHM NEURO</div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: OHM.muted, marginTop: 2 }}>Intelligence V2</div>
        </div>
      </div>

      <nav style={{ padding: '14px 12px', flex: 1 }}>
        {items.map(it => {
          const c = it.active ? brand : OHM.muted
          return (
            <div key={it.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 6, marginBottom: 2,
              background: it.active ? OHM.sage : 'transparent',
              opacity: it.soon ? 0.55 : 1,
              cursor: it.soon ? 'default' : 'pointer',
            }}>
              <span style={{ color: c, display: 'flex' }}>{it.icon(c)}</span>
              <span style={{ color: it.active ? OHM.ink : OHM.muted, fontSize: 13, fontWeight: it.active ? 600 : 400, flex: 1 }}>{it.label}</span>
              {it.soon && <span style={{ fontSize: 9, color: OHM.mutedLt, border: `1px solid ${OHM.line}`, borderRadius: 3, padding: '1px 5px', letterSpacing: 0.6 }}>SOON</span>}
            </div>
          )
        })}

        <div style={{ margin: '22px 12px 10px', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: OHM.mutedLt, fontWeight: 600 }}>This week</div>
        <div style={{ padding: '0 12px', fontSize: 12, color: OHM.muted, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Batch</span><span style={{ color: OHM.ink, fontFeatureSettings: '"tnum"' }}>{batchId || '—'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Prompt</span><span style={{ color: OHM.ink }}>{promptVersion || 'v1.1'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Source</span><span style={{ color: OHM.ink }}>Supabase</span></div>
        </div>
      </nav>

      <div style={{ padding: '14px 22px', borderTop: `1px solid ${OHM.lineSoft}`, fontSize: 11, color: OHM.mutedLt }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: OHM.primary }}/>
          <span>Connected · Supabase</span>
        </div>
      </div>
    </aside>
  )
}

function ProgressRing({ done, total }) {
  const r = 14, c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} fill="none" stroke={OHM.line} strokeWidth="2.5"/>
      <circle cx="18" cy="18" r={r} fill="none" stroke={OHM.primary} strokeWidth="2.5"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
        transform="rotate(-90 18 18)"/>
    </svg>
  )
}

function TriageBtn({ children, kind, onClick, disabled }) {
  const styles = {
    full: { bg: OHM.primary,  fg: '#fff',       bd: OHM.primary  },
    supp: { bg: OHM.paper,    fg: OHM.blueInk,  bd: OHM.blueLine },
    mon:  { bg: OHM.paper,    fg: OHM.muted,    bd: OHM.line     },
    excl: { bg: OHM.paper,    fg: OHM.roseInk,  bd: OHM.roseLine },
  }[kind]
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 14px', borderRadius: 4,
      border: `1px solid ${styles.bd}`,
      background: styles.bg, color: styles.fg,
      fontSize: 12, fontWeight: 500, cursor: disabled ? 'wait' : 'pointer',
      fontFamily: 'inherit', opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  )
}

function TopicRow({ topic, allTopics, onReact, onUndo }) {
  const [reaction, setReaction]         = useState(null)
  const [showPanel, setShowPanel]       = useState(false)  // 'monitor' | 'exclude' | null
  const [voteDir, setVoteDir]           = useState(null)
  const [selectedBubbles, setSelected]  = useState([])
  const [notes, setNotes]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState(null)

  const cat  = CAT_STYLE[topic.category] || { bg: OHM.sageBg, ink: OHM.sageInk, line: OHM.sageLine }
  const done = !!reaction

  // Confirm enabled if a vote direction is picked AND at least one bubble is selected (or notes written)
  const canConfirmMon  = voteDir !== null && (selectedBubbles.length > 0 || notes.trim().length > 0)
  const canConfirmExcl = selectedBubbles.length > 0 || notes.trim().length > 0
  const canConfirm     = showPanel === 'monitor' ? canConfirmMon : canConfirmExcl

  function toggleBubble(label) {
    setSelected(prev =>
      prev.includes(label) ? prev.filter(b => b !== label) : [...prev, label]
    )
  }

  async function persist(type, vote, bubbles, notesText) {
    setSaving(true)
    setSaveError(null)
    const reasonText = bubbles.length > 0
      ? bubbles.join(', ') + (notesText.trim() ? ' — ' + notesText.trim() : '')
      : notesText.trim()
    const { error } = await supabase.from('reactions').insert({
      topic_id: topic.id,
      reaction: type,
      reason: reasonText || null,
      vote_direction: vote,
      prompt_version: 'v1.1',
    })
    if (error) setSaveError('Failed to save — try again')
    else onReact()
    setSaving(false)
  }

  async function handleFull() { setReaction('full'); await persist('full_piece', null, [], '') }
  async function handleSupp() { setReaction('supp'); await persist('supporting', null, [], '') }
  function handleMon()        { setShowPanel('monitor'); setSelected([]); setVoteDir(null); setNotes('') }
  function handleExcl()       { setShowPanel('exclude'); setSelected([]); setVoteDir(null); setNotes('') }

  async function handleConfirm() {
    if (showPanel === 'monitor') {
      setReaction('mon')
      setShowPanel(false)
      await persist('monitor', voteDir, selectedBubbles, notes)
    } else {
      setReaction('excl')
      setShowPanel(false)
      await persist('exclude', null, selectedBubbles, notes)
    }
  }

  function handleCancel() {
    setShowPanel(false)
    setVoteDir(null)
    setSelected([])
    setNotes('')
  }

  function handleUndo() {
    setReaction(null)
    setShowPanel(false)
    setVoteDir(null)
    setSelected([])
    setNotes('')
    setSaveError(null)
    onUndo()
  }

  const reactionLabel = reaction === 'full' ? '✓ Draft' : reaction === 'supp' ? '✓ Support' : reaction === 'excl' ? '✗ Excluded' : '◦ Monitoring'
  const reactionColor = reaction === 'mon' ? OHM.roseInk : OHM.primary

  // Colors for vote direction buttons
  const upActive   = { border: OHM.primary,  bg: OHM.sage,   color: OHM.primary  }
  const downActive = { border: OHM.roseInk,  bg: OHM.roseBg, color: OHM.roseInk  }
  const inactive   = { border: OHM.line,      bg: OHM.paper,  color: OHM.muted    }

  return (
    <article style={{
      padding: '22px 0',
      borderTop: `1px solid ${OHM.lineSoft}`,
      opacity: done ? 0.55 : 1,
      transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>

        <div style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontSize: 26, color: OHM.mutedLt, width: 36, fontWeight: 400,
          fontFeatureSettings: '"tnum"', lineHeight: 1, flexShrink: 0,
        }}>
          {String((allTopics.indexOf(topic) + 1)).padStart(2, '0')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {topic.category && (
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 3, background: cat.bg, color: cat.ink, border: `1px solid ${cat.line}` }}>
                {topic.category}
              </span>
            )}
            <span style={{ fontSize: 11, color: OHM.mutedLt }}>·</span>
            <span style={{ fontSize: 11, color: OHM.muted }}>{topic.status}</span>
            {topic.batch_id && <>
              <span style={{ fontSize: 11, color: OHM.mutedLt }}>·</span>
              <span style={{ fontSize: 11, color: OHM.muted, fontFeatureSettings: '"tnum"' }}>{topic.batch_id}</span>
            </>}
            {done && (
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: reactionColor }}>
                {reactionLabel}
              </span>
            )}
            {saveError && <span style={{ fontSize: 11, color: OHM.roseInk, marginLeft: 'auto' }}>{saveError}</span>}
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontSize: 21, fontWeight: 400, margin: '0 0 8px 0',
            letterSpacing: -0.3, lineHeight: 1.25, color: OHM.ink,
          }}>
            {topic.title}
          </h2>

          {/* Research brief */}
          {topic.research_brief && (
            <p style={{ fontSize: 13.5, color: OHM.muted, margin: 0, lineHeight: 1.6, maxWidth: 680 }}>
              {topic.research_brief}
            </p>
          )}

          {/* Signals */}
          {topic.signals && Array.isArray(topic.signals) && topic.signals.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {topic.signals.map(s => (
                <span key={s} style={{ fontSize: 10.5, color: OHM.muted, padding: '2px 8px', border: `1px solid ${OHM.line}`, borderRadius: 99, background: OHM.paper, letterSpacing: 0.1 }}>
                  o {s}
                </span>
              ))}
            </div>
          )}

          {/* ── Monitor panel ── */}
          {showPanel && (
            <div style={{ marginTop: 14, padding: '16px 18px', borderRadius: 8, border: `1px solid ${OHM.line}`, background: OHM.cream }}>

              {/* Step 1 — vote direction */}
              <div style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                Signal strength
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { dir: 'up',   label: '+ Worth watching' },
                  { dir: 'down', label: '- Low priority'   },
                ].map(({ dir, label }) => {
                  const s = voteDir === dir ? (dir === 'up' ? upActive : downActive) : inactive
                  return (
                    <button
                      key={dir}
                      onClick={() => { setVoteDir(v => v === dir ? null : dir); setSelected([]) }}
                      style={{
                        padding: '6px 16px', borderRadius: 99, fontSize: 12,
                        fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
                        border: `1px solid ${s.border}`,
                        background: s.bg, color: s.color,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Step 2 — reason bubbles (appear after vote direction selected) */}
              {voteDir && (
                <>
                  <div style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                    {showPanel === 'exclude' ? 'Why exclude this topic' : voteDir === 'up' ? 'Why it is worth watching' : 'Why it is low priority'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {(showPanel === 'exclude' ? BUBBLES.exclude : BUBBLES[voteDir]).map(label => {
                      const active = selectedBubbles.includes(label)
                      const activeStyle = showPanel === 'exclude' || voteDir === 'down'
                        ? { border: OHM.roseInk, bg: OHM.roseBg, color: OHM.roseInk }
                        : { border: OHM.primary,  bg: OHM.sage,   color: OHM.primary }
                      const s = active ? activeStyle : { border: OHM.line, bg: OHM.paper, color: OHM.muted }
                      return (
                        <button
                          key={label}
                          onClick={() => toggleBubble(label)}
                          style={{
                            padding: '5px 12px', borderRadius: 99, fontSize: 12,
                            fontFamily: 'inherit', cursor: 'pointer', fontWeight: active ? 500 : 400,
                            border: `1px solid ${s.border}`,
                            background: s.bg, color: s.color,
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Optional notes */}
                  <div style={{ fontSize: 11, color: OHM.mutedLt, marginBottom: 6 }}>
                    Additional notes (optional)
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Anything else worth capturing..."
                    rows={2}
                    style={{
                      width: '100%', padding: '7px 10px',
                      border: `1px solid ${notes.trim() ? OHM.primary : OHM.line}`,
                      borderRadius: 4, fontSize: 12, fontFamily: 'inherit',
                      background: OHM.paper, outline: 'none', resize: 'vertical',
                      boxSizing: 'border-box', marginBottom: 14, color: OHM.ink,
                    }}
                  />
                </>
              )}

              {/* Confirm / Cancel */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || saving}
                  style={{
                    padding: '6px 16px', borderRadius: 4,
                    border: `1px solid ${canConfirm ? OHM.primary : OHM.line}`,
                    background: canConfirm ? OHM.primary : OHM.lineSoft,
                    color: canConfirm ? '#fff' : OHM.mutedLt,
                    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                    cursor: canConfirm ? 'pointer' : 'not-allowed',
                  }}
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '6px 16px', borderRadius: 4,
                    border: `1px solid ${OHM.line}`, background: OHM.paper,
                    color: OHM.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                {!canConfirm && voteDir && (
                  <span style={{ fontSize: 11, color: OHM.mutedLt }}>
                    Select at least one reason to confirm
                  </span>
                )}
              </div>

            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            {!done ? (
              !showPanel && <>
                <TriageBtn kind="full" onClick={handleFull} disabled={saving}>Draft</TriageBtn>
                <TriageBtn kind="supp" onClick={handleSupp} disabled={saving}>Support</TriageBtn>
                <TriageBtn kind="mon"  onClick={handleMon}  disabled={saving}>Monitor</TriageBtn>
                <TriageBtn kind="excl" onClick={handleExcl} disabled={saving}>Exclude</TriageBtn>
              </>
            ) : (
              <button onClick={handleUndo} style={{ fontSize: 12, color: OHM.muted, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                Undo
              </button>
            )}
          </div>

        </div>
      </div>
    </article>
  )
}

export default function App() {
  const [topics,       setTopics]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [reactedCount, setReactedCount] = useState(0)
  const [grouping,     setGrouping]     = useState('none')

  useEffect(() => {
    async function fetchTopics() {
      const { data, error } = await supabase
        .from('topics').select('*')
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', background: OHM.paper, color: OHM.ink }}>

      <Sidebar batchId={batchId} promptVersion="v1.1"/>

      <main style={{ flex: 1, minWidth: 0, background: OHM.paper }}>

        <div style={{ borderBottom: `1px solid ${OHM.line}`, padding: '24px 44px 20px', position: 'sticky', top: 0, background: OHM.paper, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.primary, fontWeight: 700, marginBottom: 8 }}>
                Intelligence Feed · Week of {weekLabel().split(',')[0]}
              </div>
              <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 36, fontWeight: 400, margin: 0, letterSpacing: -0.6, lineHeight: 1.05 }}>
                This week's signal.
              </h1>
              <div style={{ fontSize: 13, color: OHM.muted, marginTop: 8, maxWidth: 560, lineHeight: 1.55 }}>
                {loading ? 'Loading topics...' : `${topics.length} topics from Supabase. Decide what becomes a draft, supporting link, or monitor.`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ProgressRing done={reactedCount} total={topics.length}/>
              <div>
                <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 22, color: OHM.ink, lineHeight: 1 }}>
                  {reactedCount}<span style={{ color: OHM.mutedLt, fontSize: 16 }}> / {topics.length}</span>
                </div>
                <div style={{ fontSize: 10.5, color: OHM.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Reviewed</div>
              </div>
            </div>
          </div>

          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: OHM.line, borderRadius: 6, overflow: 'hidden', border: `1px solid ${OHM.line}`, marginTop: 22 }}>
              {[
                ['Topics',     topics.length,                                                        OHM.primary],
                ['Researching',topics.filter(t => t.status === 'Researching').length,                OHM.blueInk],
                ['Drafting',   topics.filter(t => ['Drafting','Editing'].includes(t.status)).length, OHM.roseInk],
                ['Remaining',  topics.length - reactedCount,                                         OHM.muted],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: OHM.paper, padding: '12px 16px' }}>
                  <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 26, fontWeight: 400, color: c, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: OHM.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 5 }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '28px 44px 80px', maxWidth: 900 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em' }}>Group by</span>
            {['none','category','status'].map(g => (
              <button key={g} onClick={() => setGrouping(g)} style={{
                padding: '4px 10px', borderRadius: 4, fontSize: 11,
                border: `1px solid ${grouping === g ? OHM.primary : OHM.line}`,
                background: grouping === g ? OHM.primary : OHM.paper,
                color: grouping === g ? '#fff' : OHM.muted,
                cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
              }}>{g === 'none' ? 'None' : g}</button>
            ))}
          </div>

          {loading && (
            <div style={{ padding: '40px 0', color: OHM.muted, fontSize: 14 }}>Loading this week's signal...</div>
          )}
          {!loading && topics.length === 0 && (
            <div style={{ padding: '32px', borderRadius: 8, background: OHM.sage, border: `1px solid ${OHM.sageDeep}` }}>
              <p style={{ color: OHM.primary, fontSize: 14, margin: 0 }}>No topics found. Add rows to your Supabase <code>topics</code> table.</p>
            </div>
          )}

          {!loading && groups.map(({ key, label, items }) => (
            <section key={key} style={{ marginBottom: 28 }}>
              {grouping !== 'none' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, marginTop: 16 }}>
                  <span style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: OHM.muted, fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 11, color: OHM.mutedLt, fontFeatureSettings: '"tnum"' }}>· {items.length}</span>
                  <div style={{ flex: 1, height: 1, background: OHM.lineSoft }}/>
                </div>
              )}
              {items.map(topic => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  allTopics={topics}
                  onReact={()  => setReactedCount(c => c + 1)}
                  onUndo={()   => setReactedCount(c => Math.max(0, c - 1))}
                />
              ))}
            </section>
          ))}

          {!loading && topics.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: OHM.mutedLt, letterSpacing: '0.08em' }}>
              End of week's signal · Ohm Neuro Intelligence V2 · Prompt v1.1
            </div>
          )}
        </div>
      </main>
    </div>
  )
}