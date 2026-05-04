import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { OHM, CAT_STYLE } from '../tokens'

function thisWeekCount(cards) {
  const now = new Date()
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return cards.filter(c => c.created_at && new Date(c.created_at) >= monday).length
}

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PipelineView({ isMobile, onOpenSidebar }) {
  const [cards,   setCards]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('topic_cards')
        .select('*')
        .eq('feed_status', 'drafted')
        .order('created_at', { ascending: false })
      if (data) setCards(data)
      setLoading(false)
    }
    load()
  }, [])

  const weekCount = thisWeekCount(cards)
  const pad = isMobile ? '16px' : '32px'

  return (
    <main style={{ flex: 1, minWidth: 0, background: OHM.paper }}>

      {/* ── Header ── */}
      <div style={{
        borderBottom: `1px solid ${OHM.line}`,
        padding: isMobile ? '12px 16px 18px' : '28px 32px 24px',
        background: OHM.paper,
      }}>
        {/* Mobile nav row */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button
              onClick={onOpenSidebar}
              aria-label="Open navigation"
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
            <div style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 14, color: OHM.muted }}>
              OHM NEURO
            </div>
          </div>
        )}
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.primary, fontWeight: 700, marginBottom: 10 }}>
          Pipeline
        </div>
        <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: isMobile ? 26 : 34, fontWeight: 400, margin: '0 0 16px', letterSpacing: -0.5, lineHeight: 1.1, color: OHM.ink }}>
          Drafted topics.
        </h1>

        {/* ── Stat bar ── */}
        {!loading && cards.length > 0 && (
          <div style={{ display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap' }}>
            <StatPill label="Total drafted" value={cards.length} accent={OHM.primary} />
            <StatPill label="This week" value={weekCount} accent={OHM.primary2} />
          </div>
        )}

        {loading && (
          <div style={{ fontSize: 13, color: OHM.mutedLt }}>Loading…</div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: `28px ${pad} 80px`, maxWidth: 900 }}>

        {!loading && cards.length === 0 && (
          <div style={{ padding: '28px 24px', borderRadius: 10, background: OHM.sage, border: `1px solid ${OHM.sageDeep}` }}>
            <p style={{ color: OHM.primary, fontSize: 14, margin: 0 }}>
              No drafted topics yet. Go to <strong>Intelligence Feed</strong> and draft a card to see it here.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map(card => (
            <PipelineCard key={card.id} card={card} isMobile={isMobile} />
          ))}
        </div>
      </div>
    </main>
  )
}

function StatPill({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 7,
      padding: '8px 16px', borderRadius: 8,
      background: OHM.cream, border: `1px solid ${OHM.line}`,
    }}>
      <span style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 22, fontWeight: 400, color: accent, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: OHM.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
        {label}
      </span>
    </div>
  )
}

function PipelineCard({ card, isMobile }) {
  const [open, setOpen] = useState(false)

  const cat  = CAT_STYLE[card.category] || { bg: OHM.sageBg, ink: OHM.sageInk, line: OHM.sageLine }
  const date = fmtDate(card.created_at)

  const claims  = Array.isArray(card.claims) ? card.claims : []
  const sources = Array.isArray(card.sources) ? card.sources : []

  const primarySource = card.source_url
    || sources.find(s => s?.type === 'paper' || s?.type === 'study')?.description
    || sources[0]?.description
    || null

  return (
    <article style={{
      borderRadius: 10,
      border: `1px solid ${open ? OHM.line : OHM.lineSoft}`,
      background: open ? OHM.paper : OHM.paper,
      boxShadow: open ? '0 2px 12px rgba(18,37,26,0.07)' : '0 1px 3px rgba(18,37,26,0.04)',
      transition: 'box-shadow 0.18s, border-color 0.18s',
      overflow: 'hidden',
    }}>

      {/* ── Clickable header ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(o => !o)}
        style={{
          padding: isMobile ? '16px 16px 14px' : '20px 24px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          outline: 'none',
        }}
      >
        {/* Category + date row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {card.category && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
              padding: '2px 9px', borderRadius: 4,
              background: cat.bg, color: cat.ink, border: `1px solid ${cat.line}`,
            }}>
              {card.category}
            </span>
          )}
          {date && (
            <span style={{ fontSize: 11, color: OHM.mutedLt }}>{date}</span>
          )}
          <div style={{ flex: 1 }} />
          <ChevronIcon open={open} color={OHM.mutedLt} />
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: '"Source Serif 4", Georgia, serif',
          fontSize: isMobile ? 17 : 20,
          fontWeight: 400, margin: '0 0 10px', letterSpacing: -0.3, lineHeight: 1.3,
          color: OHM.ink,
        }}>
          {card.title}
        </h2>

        {/* Brief — 2-line clamp when collapsed, full when open */}
        {card.brief && (
          <p style={{
            fontSize: 13.5, color: OHM.muted, margin: 0, lineHeight: 1.65,
            display: '-webkit-box',
            WebkitLineClamp: open ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
            overflow: open ? 'visible' : 'hidden',
          }}>
            {card.brief}
          </p>
        )}

        {/* Collapsed footer: Open Draft inline */}
        {!open && card.draft_doc_url && (
          <div style={{ marginTop: 12 }}>
            <DraftLink url={card.draft_doc_url} />
          </div>
        )}
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{ padding: isMobile ? '0 16px 20px' : '0 24px 24px' }}>

          <Divider />

          {/* Key claims */}
          {claims.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SectionLabel>Key claims</SectionLabel>
              <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {claims.map((claim, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: OHM.ink, lineHeight: 1.6 }}>
                    {typeof claim === 'string' ? claim : claim?.text || JSON.stringify(claim)}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Signal summary */}
          {card.signal_summary && (
            <section style={{ marginBottom: 20 }}>
              <SectionLabel>Signal summary</SectionLabel>
              <div style={{
                padding: '14px 18px',
                borderRadius: 8,
                background: OHM.cream,
                border: `1px solid ${OHM.line}`,
                borderLeft: `3px solid ${OHM.primary2}`,
              }}>
                <p style={{ fontSize: 13.5, color: OHM.ink, margin: 0, lineHeight: 1.7 }}>
                  {card.signal_summary}
                </p>
              </div>
            </section>
          )}

          {/* Sources list */}
          {sources.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SectionLabel>Sources</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {sources.map((s, i) => {
                  const label = typeof s === 'string' ? s : s?.description || JSON.stringify(s)
                  const type  = typeof s === 'object' ? s?.type : null
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {type && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
                          background: OHM.lineSoft, color: OHM.muted, flexShrink: 0, marginTop: 1,
                        }}>
                          {type}
                        </span>
                      )}
                      <span style={{ fontSize: 13, color: OHM.muted, lineHeight: 1.55 }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Footer: source link + Open Draft */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            {primarySource && isUrl(primarySource) && (
              <a
                href={primarySource}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  fontSize: 12, fontWeight: 600, color: OHM.primary2,
                  textDecoration: 'none', padding: '6px 13px',
                  border: `1px solid ${OHM.sageDeep}`,
                  borderRadius: 5, background: OHM.sage,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                Source ↗
              </a>
            )}
            {card.draft_doc_url && <DraftLink url={card.draft_doc_url} onClick={e => e.stopPropagation()} />}
          </div>
        </div>
      )}
    </article>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: OHM.mutedLt, marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: OHM.lineSoft, margin: '4px 0 20px' }} />
}

function DraftLink({ url, onClick }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      style={{
        fontSize: 12, fontWeight: 700, color: OHM.paper,
        background: OHM.primary, border: `1px solid ${OHM.primary}`,
        borderRadius: 5, padding: '6px 13px', textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        letterSpacing: '0.02em',
      }}
    >
      Open Draft ↗
    </a>
  )
}

function ChevronIcon({ open, color }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s', flexShrink: 0 }}
    >
      <path d="M2.5 5L7 9.5L11.5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function isUrl(str) {
  try { return Boolean(new URL(str)) } catch { return false }
}
