import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { OHM, CAT_STYLE } from '../tokens'

export default function PipelineView() {
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

  return (
    <main style={{ flex: 1, minWidth: 0, background: OHM.paper }}>

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${OHM.line}`, padding: '24px 32px 20px', background: OHM.paper }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.primary, fontWeight: 700, marginBottom: 8 }}>
          Pipeline
        </div>
        <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 32, fontWeight: 400, margin: 0, letterSpacing: -0.4, lineHeight: 1.1 }}>
          Drafted topics.
        </h1>
        <p style={{ fontSize: 13, color: OHM.muted, marginTop: 8, lineHeight: 1.55 }}>
          {loading ? 'Loading…' : cards.length === 0
            ? 'No drafted topics yet. Draft a card from the Intelligence Feed to see it here.'
            : `${cards.length} topic${cards.length !== 1 ? 's' : ''} in the pipeline.`
          }
        </p>
      </div>

      {/* Column */}
      <div style={{ padding: '28px 32px 80px', maxWidth: 860 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.muted }}>
            Drafted
          </span>
          {!loading && (
            <span style={{ fontSize: 11, color: OHM.mutedLt, fontFeatureSettings: '"tnum"' }}>
              · {cards.length}
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: OHM.lineSoft }} />
        </div>

        {loading && (
          <div style={{ padding: '40px 0', color: OHM.muted, fontSize: 14 }}>Loading…</div>
        )}

        {!loading && cards.length === 0 && (
          <div style={{ padding: '28px 24px', borderRadius: 8, background: OHM.sage, border: `1px solid ${OHM.sageDeep}` }}>
            <p style={{ color: OHM.primary, fontSize: 14, margin: 0 }}>
              No drafted topics yet. Go to <strong>Intelligence Feed</strong> and click <strong>Draft</strong> on a card to move it here.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {cards.map(card => (
            <PipelineCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </main>
  )
}

function PipelineCard({ card }) {
  const cat  = CAT_STYLE[card.category] || { bg: OHM.sageBg, ink: OHM.sageInk, line: OHM.sageLine }
  const date = card.created_at
    ? new Date(card.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const briefText = card.brief || ''
  const brief     = briefText.length > 140 ? briefText.slice(0, 140) + '…' : briefText

  return (
    <article style={{
      padding: '18px 20px', borderRadius: 8,
      borderTop: `1px solid ${OHM.lineSoft}`,
      background: OHM.paper,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {card.category && (
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 3, background: cat.bg, color: cat.ink, border: `1px solid ${cat.line}` }}>
                {card.category}
              </span>
            )}
            {date && (
              <span style={{ fontSize: 11, color: OHM.mutedLt }}>· {date}</span>
            )}
          </div>

          <h2 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 18, fontWeight: 400, margin: '0 0 6px', letterSpacing: -0.2, lineHeight: 1.3, color: OHM.ink }}>
            {card.title}
          </h2>

          {brief && (
            <p style={{ fontSize: 13, color: OHM.muted, margin: 0, lineHeight: 1.6 }}>{brief}</p>
          )}
        </div>

        {card.draft_doc_url && (
          <a
            href={card.draft_doc_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 600, color: OHM.primary,
              background: OHM.sage, border: `1px solid ${OHM.sageDeep}`,
              borderRadius: 5, padding: '6px 12px', textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Open Draft ↗
          </a>
        )}
      </div>
    </article>
  )
}
