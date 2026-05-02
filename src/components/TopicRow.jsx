import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../supabase'
import { OHM, CAT_STYLE } from '../tokens'
import { EXCLUDE_QUALIFIERS, SHARED_FOLDER_URL } from '../constants'
import { fireAppsScript, pollForDocUrl } from '../utils/helpers'
import { undoReaction } from '../utils/undo'
import TriageBtn from './TriageBtn'
import ConfirmModal from './ConfirmModal'

// ─── Tier map ─────────────────────────────────────────────────────────────────

const TIER_FROM_TYPE = {
  draft_queued: 1,
  soft_yes:     2,
  exclude:      null,
}

// ─── Full-Screen Topic Reader ─────────────────────────────────────────────────

function TopicReader({
  topic, topics, currentIndex,
  reaction, docUrl,
  onReact, onUndo, onClose,
  onNavigate,
}) {
  const cat = CAT_STYLE[topic.category] || { bg: OHM.sageBg, ink: OHM.sageInk, line: OHM.sageLine }

  const [activePanel,     setActivePanel]     = useState(null)
  const [saving,          setSaving]          = useState(false)
  const [saveError,       setSaveError]       = useState(null)
  const [localRxn,        setLocalRxn]        = useState(reaction)
  const [localDocUrl,     setLocalDocUrl]     = useState(docUrl)
  const [confirmUndoOpen, setConfirmUndoOpen] = useState(false)
  const undoingRef = useRef(false)
  const scrollRef  = useRef(null)

  const done       = !!localRxn || !!localDocUrl
  const isDraftish = localRxn === 'full' || (!localRxn && !!localDocUrl)
  const isNegative = localRxn === 'excl'
  const reactionColor = isNegative ? OHM.roseInk : OHM.primary

  const REACTION_LABEL = {
    full: '✓ Draft queued',
    soft: '✓ Shortlist',
    excl: '✗ Excluded',
  }
  const statusPillText = localRxn
    ? REACTION_LABEL[localRxn]
    : isDraftish ? '✓ Draft queued' : null

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowRight' && currentIndex < topics.length - 1) onNavigate(currentIndex + 1)
      if (e.key === 'ArrowLeft'  && currentIndex > 0)                  onNavigate(currentIndex - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNavigate, currentIndex, topics.length])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [topic.id])

  async function persistReaction(type, bubbles, notes) {
    setSaving(true); setSaveError(null)
    const reasonText = bubbles.length > 0
      ? bubbles.join(', ') + (notes.trim() ? ' — ' + notes.trim() : '')
      : notes.trim()
    const { error } = await supabase.from('reactions').insert({
      topic_id:       topic.id,
      reaction:       type,
      tier:           TIER_FROM_TYPE[type] ?? null,
      reason:         reasonText || null,
      prompt_version: 'v2.0',
    })
    if (error) { setSaveError('Failed to save — try again'); setSaving(false); return }

    if (type === 'draft_queued') {
      await supabase.from('topic_cards').update({ feed_status: 'drafted' }).eq('id', topic.id)
    }
    if (type === 'exclude') {
      await supabase.from('topic_cards').update({ feed_status: 'excluded' }).eq('id', topic.id)
    }

    onReact(); setSaving(false)
  }

  async function handleSoftYes() {
    setLocalRxn('soft'); setActivePanel(null)
    await persistReaction('soft_yes', [], '')
  }

  async function handleExcludeConfirm(bubbles, notes) {
    setLocalRxn('excl'); setActivePanel(null)
    await persistReaction('exclude', bubbles, notes)
  }

  function handleDraftSent() {
    setActivePanel(null); setLocalRxn('full'); onReact()
    pollForDocUrl(topic.id).then(url => { if (url) setLocalDocUrl(url) })
  }

  function handleUndo() {
    if (undoingRef.current) return
    setSaveError(null); setConfirmUndoOpen(true)
  }

  async function performUndo({ extraChecked: keepNotes }) {
    if (undoingRef.current) return
    undoingRef.current = true
    const prev = localRxn || (isDraftish ? 'full' : null)
    setLocalRxn(null); setActivePanel(null); setSaveError(null); setLocalDocUrl(null)
    const r = await undoReaction({ topicId: topic.id, reaction: prev, keepNotes })
    undoingRef.current = false
    if (r.ok) { setConfirmUndoOpen(false); onUndo() }
    else { setLocalRxn(prev); setSaveError(r.error); throw new Error(r.error) }
  }

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < topics.length - 1

  return createPortal(
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: OHM.paper,
        display: 'flex', flexDirection: 'column',
        animation: 'rdrFadeIn 0.22s ease',
      }}>
        {/* Top chrome */}
        <div style={{
          flexShrink: 0, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 60,
          borderBottom: `1px solid ${OHM.lineSoft}`,
          background: OHM.paper,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => hasPrev && onNavigate(currentIndex - 1)} disabled={!hasPrev}
              aria-label="Previous topic" style={{ ...chromeBtnStyle, opacity: hasPrev ? 1 : 0.25 }}>←</button>
            <button onClick={() => hasNext && onNavigate(currentIndex + 1)} disabled={!hasNext}
              aria-label="Next topic" style={{ ...chromeBtnStyle, opacity: hasNext ? 1 : 0.25 }}>→</button>
            <span style={{ fontSize: 11, color: OHM.mutedLt, fontFeatureSettings: '"tnum"', marginLeft: 12, letterSpacing: '0.04em' }}>
              {String(currentIndex + 1).padStart(2, '0')} / {String(topics.length).padStart(2, '0')}
            </span>
          </div>
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontFamily: '"Source Serif 4", Georgia, serif',
            fontSize: 12, color: OHM.muted, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 500,
          }}>Ohm Neuro</div>
          <button onClick={onClose} aria-label="Close reader" style={{ ...chromeBtnStyle, fontSize: 15 }}>✕</button>
        </div>

        {/* Scrollable article */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <article style={{ maxWidth: 680, margin: '0 auto', padding: '72px 32px 80px' }}>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: OHM.muted,
            }}>
              {topic.category && (
                <span style={{ color: cat.ink, padding: '4px 10px', borderRadius: 3, background: cat.bg, border: `1px solid ${cat.line}`, letterSpacing: '0.08em' }}>
                  {topic.category}
                </span>
              )}
            </div>

            <h1 style={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 400, lineHeight: 1.08,
              letterSpacing: '-0.022em', color: OHM.ink, margin: 0,
            }}>{topic.title}</h1>

            <div style={{ height: 2, width: 44, background: OHM.primary, margin: '32px 0 36px' }} />

            <p style={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: 'clamp(17px, 1.6vw, 19px)', color: OHM.ink, lineHeight: 1.7, margin: 0, fontWeight: 400,
              }}>{topic.brief || '—'}</p>

            <aside style={{ marginTop: 56, padding: '24px 28px', borderRadius: 10, border: `1px solid ${OHM.line}`, background: OHM.cream }}>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.primary, fontWeight: 700, marginBottom: 18 }}>About this piece</div>
              <SpecsRow label="Source">
                {topic.source_url ? (
                  <a href={topic.source_url} target="_blank" rel="noopener noreferrer"
                    style={{ color: OHM.blueInk, fontSize: 13, fontWeight: 500, textDecoration: 'none', borderBottom: `1px solid ${OHM.blueLine}`, paddingBottom: 1 }}>
                    Open source ↗
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: OHM.mutedLt, fontStyle: 'italic' }}>No source URL saved yet</span>
                )}
              </SpecsRow>
              <SpecsRow label="Draft Document">
                {localDocUrl ? (
                  <a href={localDocUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: OHM.primary, fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '5px 12px', borderRadius: 5, background: OHM.sage, border: `1px solid ${OHM.sageDeep}`, display: 'inline-block' }}>
                    Open Draft ↗
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: OHM.mutedLt, fontStyle: 'italic' }}>Not yet drafted</span>
                )}
              </SpecsRow>
              <SpecsRow label="Linked Shortlist" last>
                <span style={{ fontSize: 13, color: OHM.mutedLt, fontStyle: 'italic' }}>Will appear here once Shortlist linking is live</span>
              </SpecsRow>
            </aside>
          </article>
        </div>

        {/* Sticky action bar */}
        <div style={{ flexShrink: 0, borderTop: `1px solid ${OHM.line}`, background: OHM.paper, boxShadow: '0 -4px 16px rgba(12,24,18,0.04)' }}>
          {activePanel === 'draft' && (
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 24px 4px', animation: 'rdrFadeIn 0.18s ease' }}>
              <DraftPanel topic={topic} onSent={handleDraftSent} onCancel={() => setActivePanel(null)} />
            </div>
          )}
          {activePanel === 'exclude' && (
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 24px 4px', animation: 'rdrFadeIn 0.18s ease' }}>
              <ExcludePanel onConfirm={handleExcludeConfirm} onCancel={() => setActivePanel(null)} />
            </div>
          )}

          {!activePanel && (
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 24px 20px' }}>
              {saveError && <div style={{ fontSize: 12, color: OHM.roseInk, marginBottom: 8 }}>{saveError}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {done ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 600, color: reactionColor, padding: '8px 16px', borderRadius: 6, background: isNegative ? OHM.roseBg : OHM.sage, border: `1px solid ${isNegative ? OHM.roseLine : OHM.sageDeep}` }}>
                      {statusPillText}
                    </span>
                    <button onClick={handleUndo} style={{ fontSize: 13, fontWeight: 500, color: OHM.muted, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '8px 4px', fontFamily: 'inherit' }}>
                      {isDraftish && localDocUrl ? 'Archive Draft' : 'Undo'}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: OHM.muted }}>Triage</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <TriageBtn kind="full" onClick={() => setActivePanel('draft')}   disabled={saving}>Draft</TriageBtn>
                      <TriageBtn kind="soft" onClick={handleSoftYes}                   disabled={saving}>Shortlist</TriageBtn>
                      <TriageBtn kind="excl" onClick={() => setActivePanel('exclude')} disabled={saving}>Exclude</TriageBtn>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmUndoOpen && (
        <ConfirmModal
          title={isDraftish ? 'Archive this draft?' : 'Undo this reaction?'}
          body={isDraftish
            ? 'This will remove the Draft and move its Google Doc to the Archived Drafts folder. The Doc is archived, not deleted — you can restore it from Drive if needed.'
            : 'This will clear the reaction. You can re-triage this topic immediately after.'}
          confirmLabel={isDraftish ? 'Archive Draft' : 'Undo'}
          extraOption={isDraftish ? { label: 'Keep my notes for next time', defaultChecked: true } : null}
          onConfirm={performUndo}
          onCancel={() => setConfirmUndoOpen(false)}
        />
      )}

      <style>{`@keyframes rdrFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </>,
    document.body
  )
}

function SpecsRow({ label, children, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, paddingBottom: last ? 0 : 14, marginBottom: last ? 0 : 14, borderBottom: last ? 'none' : `1px solid ${OHM.lineSoft}` }}>
      <div style={{ flex: '0 0 130px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: OHM.muted }}>{label}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

const chromeBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, background: 'none',
  border: `1px solid ${OHM.line}`, borderRadius: 6,
  cursor: 'pointer', fontSize: 13, color: OHM.muted,
  fontFamily: 'Inter, system-ui, sans-serif',
}

// ─── DraftPanel ───────────────────────────────────────────────────────────────

function DraftPanel({ topic, onSent, onCancel }) {
  const [draftNotes, setDraftNotes] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)

  async function handleSaveForLater() {
    setSaving(true); setSaveError(null)
    const { error } = await supabase.from('reactions').insert({
      topic_id: topic.id, reaction: 'draft_queued',
      tier: 1,
      reason: draftNotes.trim() || null,
      prompt_version: 'v2.0',
    })
    if (error) { setSaveError('Failed to save — try again'); setSaving(false); return }
    await supabase.from('topic_cards').update({ feed_status: 'drafted' }).eq('id', topic.id)
    onSent(); setSaving(false)
  }

  async function handleSendToDocs() {
    setSaving(true); setSaveError(null)
    try {
      const { error: reactionError } = await supabase.from('reactions').insert({
        topic_id: topic.id, reaction: 'draft_queued',
        tier: 1,
        reason: draftNotes.trim() || null,
        prompt_version: 'v2.0',
      })
      if (reactionError) { setSaveError('Failed to save reaction — try again'); setSaving(false); return }
      await supabase.from('topic_cards').update({ feed_status: 'drafted' }).eq('id', topic.id)
      fireAppsScript({
        title: topic.title, brief: topic.brief || '',
        notes: draftNotes.trim(), topic_id: topic.id,
        status: topic.status || '', category: topic.category || '',
        batch_id: topic.batch_id || '',
      })
      onSent()
    } catch {
      setSaveError('Failed to create doc — try again')
    }
    setSaving(false)
  }

  return (
    <div style={{ marginBottom: 20, padding: '20px 22px', borderRadius: 8, border: `1px solid ${OHM.line}`, background: OHM.cream }}>
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, color: OHM.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>Draft notes</div>
      <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 14, color: OHM.mutedLt, marginBottom: 12 }}>{topic.title}</div>
      <textarea
        value={draftNotes} onChange={e => setDraftNotes(e.target.value)}
        placeholder="Key arguments, angles, claims to cover..." rows={6} autoFocus
        style={{ width: '100%', padding: '10px 12px', border: `1px solid ${draftNotes.trim() ? OHM.primary : OHM.line}`, borderRadius: 5, fontSize: 14, fontFamily: '"Source Serif 4", Georgia, serif', background: OHM.paper, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 14, color: OHM.ink, lineHeight: 1.65 }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleSendToDocs} disabled={saving}
          style={{ padding: '8px 18px', borderRadius: 5, border: `1px solid ${OHM.primary}`, background: OHM.primary, color: '#fff', fontSize: 13, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Creating...' : 'Send to Docs →'}
        </button>
        <button onClick={handleSaveForLater} disabled={saving}
          style={{ padding: '8px 18px', borderRadius: 5, border: `1px solid ${OHM.line}`, background: OHM.paper, color: OHM.muted, fontSize: 13, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          Save for later
        </button>
        <button onClick={onCancel} style={{ fontSize: 12, color: OHM.mutedLt, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', marginLeft: 4 }}>Cancel</button>
        {saveError && <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: OHM.roseInk }}>{saveError}</span>}
      </div>
    </div>
  )
}

// ─── ExcludePanel ─────────────────────────────────────────────────────────────

function ExcludePanel({ onConfirm, onCancel }) {
  const [selected, setSelected] = useState([])
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const canConfirm = selected.length > 0 || notes.trim().length > 0

  const activeStyle = { border: OHM.roseInk, bg: OHM.roseBg, color: OHM.roseInk }
  const inactive    = { border: OHM.line,    bg: OHM.paper,   color: OHM.muted   }

  function toggleBubble(lbl) {
    setSelected(p => p.includes(lbl) ? [] : [lbl])
  }

  async function handleConfirm() {
    setSaving(true); await onConfirm(selected, notes); setSaving(false)
  }

  return (
    <div style={{ marginBottom: 20, padding: '20px 22px', borderRadius: 8, border: `1px solid ${OHM.line}`, background: OHM.cream }}>
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, color: OHM.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Why this is a No</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {EXCLUDE_QUALIFIERS.map(lbl => {
          const active = selected.includes(lbl)
          const s = active ? activeStyle : inactive
          return (
            <button key={lbl} onClick={() => toggleBubble(lbl)}
              style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif', cursor: 'pointer', fontWeight: active ? 500 : 400, border: `1px solid ${s.border}`, background: s.bg, color: s.color }}>
              {lbl}
            </button>
          )
        })}
      </div>
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: OHM.mutedLt, marginBottom: 6 }}>Additional notes (optional)</div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else worth capturing..." rows={3}
        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${notes.trim() ? OHM.primary : OHM.line}`, borderRadius: 5, fontSize: 13, fontFamily: '"Source Serif 4", Georgia, serif', background: OHM.paper, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 14, color: OHM.ink, lineHeight: 1.6 }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleConfirm} disabled={!canConfirm || saving}
          style={{ padding: '7px 18px', borderRadius: 5, border: `1px solid ${canConfirm ? OHM.primary : OHM.line}`, background: canConfirm ? OHM.primary : OHM.lineSoft, color: canConfirm ? '#fff' : OHM.mutedLt, fontSize: 13, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif', cursor: canConfirm ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving...' : 'Confirm'}
        </button>
        <button onClick={onCancel}
          style={{ padding: '7px 18px', borderRadius: 5, border: `1px solid ${OHM.line}`, background: OHM.paper, color: OHM.muted, fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', cursor: 'pointer' }}>
          Cancel
        </button>
        {!canConfirm && (
          <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, color: OHM.mutedLt, width: '100%', marginTop: 4 }}>Select a reason to confirm.</div>
        )}
      </div>
    </div>
  )
}

// ─── TopicRow ─────────────────────────────────────────────────────────────────

const REACTION_LABEL = {
  full: '✓ Draft',
  soft: '✓ Shortlist',
  excl: '✗ No',
}

export default function TopicRow({ topic, topics, index, readerIndex, setReaderIndex, onReact, onUndo }) {
  const [reaction,    setReaction]    = useState(null)
  const [docUrl,      setDocUrl]      = useState(topic.draft_doc_url || null)
  const [activePanel, setActivePanel] = useState(null)
  const readerOpen = readerIndex === index
  const [cardHover,   setCardHover]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState(null)
  const pollingRef = useRef(false)

  useEffect(() => {
    if (topic.draft_doc_url) setDocUrl(topic.draft_doc_url)
  }, [topic.draft_doc_url])

  async function startDocUrlPoll() {
    if (pollingRef.current) return
    pollingRef.current = true
    const url = await pollForDocUrl(topic.id)
    pollingRef.current = false
    if (url) setDocUrl(url)
  }

  function openReader() {
    window._ohmScrollY = window.scrollY
    setReaderIndex(index)
  }

  function closeReader() {
    setReaderIndex(null)
    requestAnimationFrame(() => window.scrollTo(0, window._ohmScrollY || 0))
  }

  const handleNavigate = useCallback((newIndex) => {
    setReaderIndex(newIndex)
  }, [setReaderIndex])

  const cat  = CAT_STYLE[topic.category] || { bg: OHM.sageBg, ink: OHM.sageInk, line: OHM.sageLine }
  const done = !!reaction
  const reactionColor = reaction === 'excl' ? OHM.roseInk : OHM.primary

  const BRIEF_LIMIT  = 160
  const briefText    = topic.brief || ''
  const briefPreview = briefText.length > BRIEF_LIMIT ? briefText.slice(0, BRIEF_LIMIT) + '…' : briefText

  async function persistReaction(type, bubbles, notes) {
    setSaving(true); setSaveError(null)
    const reasonText = bubbles.length > 0
      ? bubbles.join(', ') + (notes.trim() ? ' — ' + notes.trim() : '')
      : notes.trim()
    const { error } = await supabase.from('reactions').insert({
      topic_id:       topic.id,
      reaction:       type,
      tier:           TIER_FROM_TYPE[type] ?? null,
      reason:         reasonText || null,
      prompt_version: 'v2.0',
    })
    if (error) { setSaveError('Failed to save — try again'); setSaving(false); return }

    if (type === 'draft_queued') {
      await supabase.from('topic_cards').update({ feed_status: 'drafted' }).eq('id', topic.id)
    }
    if (type === 'exclude') {
      await supabase.from('topic_cards').update({ feed_status: 'excluded' }).eq('id', topic.id)
    }

    onReact(); setSaving(false)
  }

  async function handleSoftYes() {
    setReaction('soft'); await persistReaction('soft_yes', [], '')
  }

  async function handleExcludeConfirm(bubbles, notes) {
    setReaction('excl'); setActivePanel(null)
    await persistReaction('exclude', bubbles, notes)
  }

  function handleDraftSent() {
    setActivePanel(null); setReaction('full'); onReact(); startDocUrlPoll()
  }

  const [confirmUndoOpen, setConfirmUndoOpen] = useState(false)
  const undoingRef = useRef(false)

  function handleUndo() {
    if (undoingRef.current) return
    setSaveError(null); setConfirmUndoOpen(true)
  }

  async function performUndo({ extraChecked: keepNotes }) {
    if (undoingRef.current) return
    undoingRef.current = true
    const prev = reaction
    setReaction(null); setActivePanel(null); setSaveError(null); setDocUrl(null)
    const r = await undoReaction({ topicId: topic.id, reaction: prev, keepNotes })
    undoingRef.current = false
    if (r.ok) { setConfirmUndoOpen(false); onUndo() }
    else { setReaction(prev); setSaveError(r.error); throw new Error(r.error) }
  }

  return (
    <>
      <style>{`.ohm-draft-link:hover { background: #c8dbbf !important; }`}</style>

      <article style={{
        padding: '22px 20px', borderRadius: 8, marginBottom: 4,
        borderTop: `1px solid ${OHM.lineSoft}`,
        opacity: done ? 0.55 : 1,
        transform: cardHover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: cardHover ? '0 8px 24px rgba(12,24,18,0.10), 0 2px 8px rgba(12,24,18,0.06)' : '0 0 0 transparent',
        background: cardHover ? '#FEFEFE' : OHM.paper,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, opacity 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 26, color: OHM.mutedLt, width: 36, fontWeight: 400, fontFeatureSettings: '"tnum"', lineHeight: 1, flexShrink: 0 }}>
            {String(index + 1).padStart(2, '0')}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {topic.category && (
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 3, background: cat.bg, color: cat.ink, border: `1px solid ${cat.line}` }}>
                  {topic.category}
                </span>
              )}
              <span style={{ fontSize: 11, color: OHM.mutedLt }}>·</span>
              {done && <span style={{ fontSize: 11, fontWeight: 600, color: reactionColor }}>{REACTION_LABEL[reaction]}</span>}
              {docUrl && (
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="ohm-draft-link" onClick={e => e.stopPropagation()}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: OHM.primary, background: OHM.sage, border: `1px solid ${OHM.sageDeep}`, borderRadius: 4, padding: '4px 10px', textDecoration: 'none', minHeight: 28, whiteSpace: 'nowrap', transition: 'background 0.15s ease' }}>
                  Open Draft ↗
                </a>
              )}
            </div>

            <h2 onClick={openReader} onMouseEnter={() => setCardHover(true)} onMouseLeave={() => setCardHover(false)}
              style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 21, fontWeight: 400, margin: '0 0 8px 0', letterSpacing: -0.3, lineHeight: 1.25, color: cardHover ? OHM.primary : OHM.ink, cursor: 'pointer', transition: 'color 0.18s ease' }}>
              {topic.title}
            </h2>

            {briefText && (
              <p style={{ fontSize: 13.5, color: OHM.muted, margin: 0, lineHeight: 1.6, maxWidth: 680 }}>{briefPreview}</p>
            )}

            {activePanel === 'draft' && <DraftPanel topic={topic} onSent={handleDraftSent} onCancel={() => setActivePanel(null)} />}
            {activePanel === 'exclude' && <ExcludePanel onConfirm={handleExcludeConfirm} onCancel={() => setActivePanel(null)} />}

            {saveError && <div style={{ fontSize: 11, color: OHM.roseInk, marginTop: 6 }}>{saveError}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {done ? (
                <button onClick={handleUndo} style={{ fontSize: 12, color: OHM.muted, background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}>
                  {reaction === 'full' && docUrl ? 'Archive Draft' : 'Undo'}
                </button>
              ) : (
                !activePanel && (
                  <>
                    <TriageBtn kind="full" onClick={() => setActivePanel('draft')}   disabled={saving}>Draft</TriageBtn>
                    <TriageBtn kind="soft" onClick={handleSoftYes}                   disabled={saving}>Shortlist</TriageBtn>
                    <TriageBtn kind="excl" onClick={() => setActivePanel('exclude')} disabled={saving}>Exclude</TriageBtn>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </article>

      {readerOpen && (
        <TopicReader
          topic={topic} topics={topics || [topic]} currentIndex={index}
          reaction={reaction} docUrl={docUrl}
          onReact={onReact}
          onUndo={() => { setReaction(null); setDocUrl(null); onUndo() }}
          onClose={closeReader} onNavigate={handleNavigate}
        />
      )}

      {confirmUndoOpen && (
        <ConfirmModal
          title={reaction === 'full' ? 'Archive this draft?' : 'Undo this reaction?'}
          body={reaction === 'full'
            ? 'This will remove the Draft and move its Google Doc to the Archived Drafts folder. The Doc is archived, not deleted — you can restore it from Drive if needed.'
            : 'This will clear the reaction. You can re-triage this topic immediately after.'}
          confirmLabel={reaction === 'full' ? 'Archive Draft' : 'Undo'}
          extraOption={reaction === 'full' ? { label: 'Keep my notes for next time', defaultChecked: true } : null}
          onConfirm={performUndo}
          onCancel={() => setConfirmUndoOpen(false)}
        />
      )}
    </>
  )
}
