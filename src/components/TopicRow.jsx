import { useState } from 'react'
import { supabase } from '../supabase'
import { OHM, CAT_STYLE } from '../tokens'
import { BUBBLES, SHARED_FOLDER_URL } from '../constants'
import { fireAppsScript, pollForDocUrl } from '../utils/helpers'
import TriageBtn from './TriageBtn'

// ─── Internal sub-components ─────────────────────────────────────────────────

function DraftPanel({ topic, onSent, onCancel }) {
  const [draftNotes, setDraftNotes] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)

  async function handleSaveForLater() {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase.from('reactions').insert({
      topic_id:       topic.id,
      reaction:       'draft_queued',
      reason:         draftNotes.trim() || null,
      vote_direction: null,
      prompt_version: 'v1.1',
    })
    if (error) { setSaveError('Failed to save — try again'); setSaving(false); return }
    onSent('save')
    setSaving(false)
  }

  async function handleSendToDocs() {
    setSaving(true)
    setSaveError(null)
    try {
      const { error: reactionError } = await supabase.from('reactions').insert({
        topic_id:       topic.id,
        reaction:       'draft_queued',
        reason:         draftNotes.trim() || null,
        vote_direction: null,
        prompt_version: 'v1.1',
      })
      if (reactionError) {
        setSaveError('Failed to save reaction — try again')
        setSaving(false)
        return
      }

      fireAppsScript({
        title:    topic.title,
        brief:    topic.research_brief || '',
        notes:    draftNotes.trim(),
        topic_id: topic.id,
        status:   topic.status   || '',
        category: topic.category || '',
        batch_id: topic.batch_id || '',
      })

      onSent('docs')

      const url = await pollForDocUrl(topic.id)
      window.open(url || SHARED_FOLDER_URL, '_blank')
    } catch {
      setSaveError('Failed to create doc — try again')
    }
    setSaving(false)
  }

  return (
    <div style={{
      marginTop: 14, padding: '16px 18px',
      borderRadius: 8, border: `1px solid ${OHM.line}`,
      background: OHM.cream,
    }}>
      <div style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
        Draft brief
      </div>
      <div style={{ fontSize: 12, color: OHM.mutedLt, marginBottom: 10 }}>{topic.title}</div>
      <div style={{ fontSize: 11, color: OHM.muted, marginBottom: 6 }}>What points do you want to make?</div>

      <textarea
        value={draftNotes}
        onChange={e => setDraftNotes(e.target.value)}
        placeholder="Key arguments, angles, claims to cover..."
        rows={4}
        autoFocus
        style={{
          width: '100%', padding: '8px 10px',
          border: `1px solid ${draftNotes.trim() ? OHM.primary : OHM.line}`,
          borderRadius: 4, fontSize: 13,
          fontFamily: 'inherit', background: OHM.paper,
          outline: 'none', resize: 'vertical',
          boxSizing: 'border-box', marginBottom: 14,
          color: OHM.ink, lineHeight: 1.6,
        }}
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleSendToDocs}
          disabled={saving}
          style={{
            padding: '7px 16px', borderRadius: 4,
            border: `1px solid ${OHM.primary}`,
            background: OHM.primary, color: '#fff',
            fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Creating...' : 'Send to Docs →'}
        </button>

        <button
          onClick={handleSaveForLater}
          disabled={saving}
          style={{
            padding: '7px 16px', borderRadius: 4,
            border: `1px solid ${OHM.line}`,
            background: OHM.paper, color: OHM.muted,
            fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          Save for later
        </button>

        <button
          onClick={onCancel}
          style={{ fontSize: 12, color: OHM.mutedLt, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 4 }}
        >
          Cancel
        </button>

        {saveError && <span style={{ fontSize: 11, color: OHM.roseInk }}>{saveError}</span>}
      </div>
    </div>
  )
}

function TriagePanel({ kind, onConfirm, onCancel }) {
  const [voteDir,  setVoteDir]  = useState(null)
  const [selected, setSelected] = useState([])
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const isMonitor = kind === 'monitor'

  function toggleBubble(label) {
    setSelected(prev => prev.includes(label) ? prev.filter(b => b !== label) : [...prev, label])
  }

  const canConfirm = isMonitor
    ? voteDir !== null && (selected.length > 0 || notes.trim().length > 0)
    : selected.length > 0 || notes.trim().length > 0

  const activeStyle = (!isMonitor || voteDir === 'down')
    ? { border: OHM.roseInk, bg: OHM.roseBg, color: OHM.roseInk }
    : { border: OHM.primary,  bg: OHM.sage,   color: OHM.primary  }

  const inactive = { border: OHM.line, bg: OHM.paper, color: OHM.muted }

  const bubbleList = isMonitor
    ? (voteDir ? BUBBLES[voteDir] : [])
    : BUBBLES.exclude

  async function handleConfirm() {
    setSaving(true)
    await onConfirm(voteDir, selected, notes)
    setSaving(false)
  }

  return (
    <div style={{
      marginTop: 14, padding: '16px 18px',
      borderRadius: 8, border: `1px solid ${OHM.line}`,
      background: OHM.cream,
    }}>

      {/* Monitor: signal strength toggle */}
      {isMonitor && (
        <>
          <div style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
            Signal strength
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ dir: 'up', label: '+ Worth watching' }, { dir: 'down', label: '- Low priority' }].map(({ dir, label }) => {
              const s = voteDir === dir
                ? (dir === 'up' ? { border: OHM.primary, bg: OHM.sage, color: OHM.primary } : { border: OHM.roseInk, bg: OHM.roseBg, color: OHM.roseInk })
                : inactive
              return (
                <button
                  key={dir}
                  onClick={() => { setVoteDir(v => v === dir ? null : dir); setSelected([]) }}
                  style={{ padding: '6px 16px', borderRadius: 99, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500, border: `1px solid ${s.border}`, background: s.bg, color: s.color }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Reason bubbles */}
      {(!isMonitor || voteDir) && (
        <>
          <div style={{ fontSize: 11, color: OHM.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
            {!isMonitor ? 'Why this is a No' : voteDir === 'up' ? 'Why it is worth watching' : 'Why it is low priority'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {bubbleList.map(label => {
              const active = selected.includes(label)
              const s = active ? activeStyle : inactive
              return (
                <button
                  key={label}
                  onClick={() => toggleBubble(label)}
                  style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: active ? 500 : 400, border: `1px solid ${s.border}`, background: s.bg, color: s.color }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: OHM.mutedLt, marginBottom: 6 }}>Additional notes (optional)</div>
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

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm || saving}
          style={{
            padding: '6px 16px', borderRadius: 4,
            border:     `1px solid ${canConfirm ? OHM.primary : OHM.line}`,
            background: canConfirm ? OHM.primary : OHM.lineSoft,
            color:      canConfirm ? '#fff' : OHM.mutedLt,
            fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
            cursor: canConfirm ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Saving...' : 'Confirm'}
        </button>

        <button
          onClick={onCancel}
          style={{ padding: '6px 16px', borderRadius: 4, border: `1px solid ${OHM.line}`, background: OHM.paper, color: OHM.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>

        {!canConfirm && ((!isMonitor) || voteDir) && (
          <div style={{ fontSize: 11, color: OHM.mutedLt, width: '100%', marginTop: 4 }}>
            Select a reason to confirm.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Expanded detail panel ────────────────────────────────────────────────────

function ExpandedDetail({ topic, reaction }) {
  const REACTION_LABEL = {
    full: '✓ Draft queued',
    supp: '✓ Added as Support',
    excl: '✗ Excluded',
    mon:  '◦ Monitoring',
  }

  return (
    <div style={{
      marginTop: 16,
      padding: '20px 22px',
      borderRadius: 8,
      border: `1px solid ${OHM.sageDeep}`,
      background: OHM.cream,
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>

      {/* ── Full research brief ── */}
      <div>
        <div style={sectionLabel}>Research Brief</div>
        <p style={{
          fontSize: 14, color: OHM.ink, lineHeight: 1.75,
          margin: 0, maxWidth: 660,
        }}>
          {topic.research_brief || '—'}
        </p>
      </div>

      <div style={{ height: 1, background: OHM.lineSoft }} />

      {/* ── Source URL ── */}
      <div>
        <div style={sectionLabel}>Source</div>
        {topic.source_url ? (
          <a
            href={topic.source_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: OHM.blueInk,
              padding: '6px 14px', borderRadius: 4,
              border: `1px solid ${OHM.blueLine}`,
              background: OHM.blueBg,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Open source →
          </a>
        ) : (
          <span style={{ fontSize: 13, color: OHM.mutedLt }}>No source URL saved</span>
        )}
      </div>

      <div style={{ height: 1, background: OHM.lineSoft }} />

      {/* ── Reaction / Doc status ── */}
      <div>
        <div style={sectionLabel}>Status this session</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {reaction ? (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: (reaction === 'excl' || reaction === 'mon') ? OHM.roseInk : OHM.primary,
              padding: '4px 10px', borderRadius: 4,
              background: (reaction === 'excl' || reaction === 'mon') ? OHM.roseBg : OHM.sage,
              border: `1px solid ${(reaction === 'excl' || reaction === 'mon') ? OHM.roseLine : OHM.sageDeep}`,
            }}>
              {REACTION_LABEL[reaction]}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: OHM.mutedLt }}>Not yet triaged</span>
          )}

          {topic.draft_doc_url && (
            <a
              href={topic.draft_doc_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: OHM.primary,
                padding: '5px 12px', borderRadius: 4,
                border: `1px solid ${OHM.sageDeep}`,
                background: OHM.sage,
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Open Draft Doc →
            </a>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: OHM.lineSoft }} />

      {/* ── Linked Support articles placeholder ── */}
      <div>
        <div style={sectionLabel}>Linked Support Articles</div>
        <div style={{
          padding: '10px 14px',
          borderRadius: 6,
          background: OHM.sage,
          border: `1px solid ${OHM.sageDeep}`,
          fontSize: 12,
          color: OHM.primary,
          lineHeight: 1.55,
        }}>
          ↗ Linked support articles will appear here once Support Tagging is live.
        </div>
      </div>

    </div>
  )
}

// shared label style used inside ExpandedDetail
const sectionLabel = {
  fontSize: 10.5,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: OHM.primary,
  fontWeight: 700,
  marginBottom: 8,
}

// ─── TopicRow ─────────────────────────────────────────────────────────────────

const REACTION_LABEL = {
  full: '✓ Draft',
  supp: '✓ Support',
  excl: '✗ No',
  mon:  '◦ Monitoring',
}

export default function TopicRow({ topic, index, onReact, onUndo }) {
  const [reaction,       setReaction]       = useState(null)
  const [activePanel,    setActivePanel]    = useState(null)   // 'draft' | 'monitor' | 'exclude'
  const [expanded,       setExpanded]       = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [saveError,      setSaveError]      = useState(null)

  const cat  = CAT_STYLE[topic.category] || { bg: OHM.sageBg, ink: OHM.sageInk, line: OHM.sageLine }
  const done = !!reaction
  const reactionColor = (reaction === 'excl' || reaction === 'mon') ? OHM.roseInk : OHM.primary

  // Truncate brief when collapsed
  const BRIEF_LIMIT = 160
  const briefText = topic.research_brief || ''
  const briefCollapsed = briefText.length > BRIEF_LIMIT
    ? briefText.slice(0, BRIEF_LIMIT) + '…'
    : briefText

  // ── Persist helpers ──────────────────────────────────────────────────────────

  async function persistReaction(type, voteDir, bubbles, notes) {
    setSaving(true)
    setSaveError(null)
    const reasonText = bubbles.length > 0
      ? bubbles.join(', ') + (notes.trim() ? ' — ' + notes.trim() : '')
      : notes.trim()
    const { error } = await supabase.from('reactions').insert({
      topic_id:       topic.id,
      reaction:       type,
      reason:         reasonText || null,
      vote_direction: voteDir,
      prompt_version: 'v1.1',
    })
    if (error) setSaveError('Failed to save — try again')
    else onReact()
    setSaving(false)
  }

  // ── Action handlers ──────────────────────────────────────────────────────────

  async function handleSupport() {
    setReaction('supp')
    await persistReaction('supporting', null, [], '')
  }

  async function handleTriageConfirm(voteDir, bubbles, notes) {
    const type = activePanel === 'monitor' ? 'monitor' : 'exclude'
    setReaction(activePanel === 'monitor' ? 'mon' : 'excl')
    setActivePanel(null)
    await persistReaction(type, activePanel === 'monitor' ? voteDir : null, bubbles, notes)
  }

  function handleDraftSent() {
    setActivePanel(null)
    setReaction('full')
    onReact()
  }

  async function handleUndo() {
    setReaction(null)
    setActivePanel(null)
    setSaveError(null)

    const { data } = await supabase
      .from('topics')
      .select('draft_doc_url')
      .eq('id', topic.id)
      .single()

    const docUrl = data?.draft_doc_url

    await Promise.all([
      supabase.from('topics').update({ draft_doc_url: null }).eq('id', topic.id),
      supabase.from('reactions').delete().eq('topic_id', topic.id).eq('reaction', 'draft_queued'),
    ])

    if (docUrl) fireAppsScript({ action: 'delete', doc_url: docUrl })

    onUndo()
  }

  return (
    <article style={{
      padding: '22px 0',
      borderTop: `1px solid ${OHM.lineSoft}`,
      opacity: done ? 0.55 : 1,
      transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>

        {/* Index number */}
        <div style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontSize: 26, color: OHM.mutedLt, width: 36,
          fontWeight: 400, fontFeatureSettings: '"tnum"',
          lineHeight: 1, flexShrink: 0,
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── Meta row ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {topic.category && (
              <span style={{
                fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em',
                padding: '2px 8px', borderRadius: 3,
                background: cat.bg, color: cat.ink, border: `1px solid ${cat.line}`,
              }}>
                {topic.category}
              </span>
            )}
            <span style={{ fontSize: 11, color: OHM.mutedLt }}>·</span>
            <span style={{ fontSize: 11, color: OHM.muted }}>{topic.status}</span>
            {topic.batch_id && (
              <>
                <span style={{ fontSize: 11, color: OHM.mutedLt }}>·</span>
                <span style={{ fontSize: 11, color: OHM.muted, fontFeatureSettings: '"tnum"' }}>{topic.batch_id}</span>
              </>
            )}
            {done && (
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: reactionColor }}>
                {REACTION_LABEL[reaction]}
              </span>
            )}
          </div>

          {/* ── Title — click to expand ── */}
          <h2
            onClick={() => setExpanded(e => !e)}
            style={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 21, fontWeight: 400, margin: '0 0 8px 0',
              letterSpacing: -0.3, lineHeight: 1.25, color: OHM.ink,
              cursor: 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}
          >
            <span style={{ flex: 1 }}>{topic.title}</span>
            <span style={{
              fontSize: 12, color: OHM.mutedLt,
              marginTop: 4, flexShrink: 0,
              transition: 'transform 0.2s',
              display: 'inline-block',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>
              ▾
            </span>
          </h2>

          {/* ── Brief (collapsed — truncated) ── */}
          {!expanded && briefText && (
            <p style={{ fontSize: 13.5, color: OHM.muted, margin: 0, lineHeight: 1.6, maxWidth: 680 }}>
              {briefCollapsed}
            </p>
          )}

          {/* ── Signal tags ── */}
          {!expanded && topic.signals?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {topic.signals.map(s => (
                <span key={s} style={{
                  fontSize: 10.5, color: OHM.muted,
                  padding: '2px 8px', border: `1px solid ${OHM.line}`,
                  borderRadius: 99, background: OHM.paper, letterSpacing: 0.1,
                }}>
                  o {s}
                </span>
              ))}
            </div>
          )}

          {/* ── Expanded detail panel ── */}
          {expanded && (
            <ExpandedDetail topic={topic} reaction={reaction} />
          )}

          {/* ── Draft panel ── */}
          {activePanel === 'draft' && (
            <DraftPanel
              topic={topic}
              onSent={handleDraftSent}
              onCancel={() => setActivePanel(null)}
            />
          )}

          {/* ── Monitor / Exclude panel ── */}
          {(activePanel === 'monitor' || activePanel === 'exclude') && (
            <TriagePanel
              kind={activePanel}
              onConfirm={handleTriageConfirm}
              onCancel={() => setActivePanel(null)}
            />
          )}

          {/* ── Error message ── */}
          {saveError && (
            <div style={{ fontSize: 11, color: OHM.roseInk, marginTop: 6 }}>{saveError}</div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {done ? (
              <button
                onClick={handleUndo}
                style={{ fontSize: 12, color: OHM.muted, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
              >
                Undo
              </button>
            ) : (
              !activePanel && (
                <>
                  <TriageBtn kind="full" onClick={() => setActivePanel('draft')}   disabled={saving}>Draft</TriageBtn>
                  <TriageBtn kind="supp" onClick={handleSupport}                   disabled={saving}>Support</TriageBtn>
                  <TriageBtn kind="mon"  onClick={() => setActivePanel('monitor')} disabled={saving}>Monitor</TriageBtn>
                  <TriageBtn kind="excl" onClick={() => setActivePanel('exclude')} disabled={saving}>Exclude</TriageBtn>
                </>
              )
            )}
          </div>

        </div>
      </div>
    </article>
  )
}
