import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { OHM } from '../tokens'

const PUBMED_QUERIES = [
  'depression anxiety treatment randomized controlled trial[pt] 2020:2025[dp]',
  'ADHD attention deficit hyperactivity disorder brain neuroscience 2020:2025[dp]',
  'transcranial magnetic stimulation depression clinical trial 2020:2025[dp]',
  'psilocybin psychedelic therapy randomized trial 2019:2025[dp]',
  'sleep memory consolidation cognitive function brain 2021:2025[dp]',
  'aerobic exercise hippocampus neurogenesis cognition 2020:2025[dp]',
  'dementia Alzheimer prevention intervention randomized 2020:2025[dp]',
  'gut microbiome brain axis cognition depression 2020:2025[dp]',
  'burnout stress cortisol brain neurological 2020:2025[dp]',
  'neurofeedback EEG cognitive performance brain 2020:2025[dp]',
  'cognitive training working memory neuroplasticity 2021:2025[dp]',
  'vagus nerve stimulation depression anxiety 2020:2025[dp]',
  'GLP-1 semaglutide brain neuroprotection 2022:2025[dp]',
  'machine learning deep learning neuroimaging psychiatric 2022:2025[dp]',
  'mindfulness meditation prefrontal cortex brain 2021:2025[dp]',
]

export default function PromptView({ isMobile }) {
  const [prompts,  setPrompts]  = useState([])
  const [selected, setSelected] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('claude') // 'claude' | 'pubmed'

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('prompt_versions')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(10)
      if (data) setPrompts(data)
      setLoading(false)
    }
    load()
  }, [])

  const current = prompts[selected]
  const pad = isMobile ? '16px' : '32px'

  return (
    <main style={{ flex: 1, minWidth: 0, background: OHM.paper, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${OHM.line}`, padding: isMobile ? '16px 16px 14px' : '24px 32px 20px', background: OHM.paper, flexShrink: 0 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.primary, fontWeight: 700, marginBottom: 8 }}>
          Prompt Inspector
        </div>
        <h1 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: isMobile ? 24 : 32, fontWeight: 400, margin: 0, letterSpacing: -0.4, lineHeight: 1.1 }}>
          How cards are made.
        </h1>
        <p style={{ fontSize: 13, color: OHM.muted, marginTop: 8, lineHeight: 1.55 }}>
          Audit trail of every generation run — PubMed queries used to source real papers, and the Claude prompt that wrote the editorial layer.
        </p>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          {[
            { id: 'pubmed', label: 'PubMed Queries' },
            { id: 'claude', label: 'Claude Prompt' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
                border: `1px solid ${tab === t.id ? OHM.primary : OHM.line}`,
                background: tab === t.id ? OHM.primary : OHM.paper,
                color: tab === t.id ? '#fff' : OHM.muted,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* PubMed tab — static, no prompt needed */}
      {tab === 'pubmed' && (
        <div style={{ padding: `24px ${pad}`, maxWidth: 720 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: OHM.primary, marginBottom: 6 }}>
              How paper sourcing works
            </div>
            <p style={{ fontSize: 13, color: OHM.muted, lineHeight: 1.65, margin: 0 }}>
              Before calling Claude, the system queries PubMed (NCBI) across {PUBMED_QUERIES.length} topic areas. For each query it fetches the top 5 results, scores them by recency, citation count, and publication type, then picks the best paper. Claude then writes the editorial card — title, brief, key claims, signal summary — based on the real abstract. The DOI link is taken directly from PubMed and is never touched by the model.
            </p>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: OHM.mutedLt, marginBottom: 12 }}>
            {PUBMED_QUERIES.length} active search queries
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {PUBMED_QUERIES.map((q, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 14px', borderRadius: 6,
                  background: i % 2 === 0 ? OHM.cream : OHM.paper,
                  border: `1px solid ${OHM.lineSoft}`,
                }}
              >
                <span style={{
                  flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                  background: OHM.sage, color: OHM.primary,
                  fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFeatureSettings: '"tnum"',
                }}>
                  {i + 1}
                </span>
                <code style={{ fontSize: isMobile ? 11 : 12, color: OHM.ink, fontFamily: '"SF Mono", "Fira Code", monospace', lineHeight: 1.5, wordBreak: 'break-all' }}>
                  {q}
                </code>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 6, background: OHM.sage, border: `1px solid ${OHM.sageDeep}` }}>
            <div style={{ fontSize: 12, color: OHM.primary, lineHeight: 1.6 }}>
              <strong>Scoring criteria:</strong> Year ≥ 2023 (+3), ≥ 2021 (+2), ≥ 2019 (+1) · Randomized trial (+3) · Meta-analysis (+2) · Journal article (+1) · Must have abstract + DOI to qualify.
            </div>
          </div>
        </div>
      )}

      {/* Claude Prompt tab */}
      {tab === 'claude' && (
        <>
          {loading && (
            <div style={{ padding: '40px 32px', color: OHM.muted, fontSize: 14 }}>Loading…</div>
          )}

          {!loading && prompts.length === 0 && (
            <div style={{ padding: `28px ${pad}` }}>
              <div style={{ padding: '24px', borderRadius: 8, background: OHM.sage, border: `1px solid ${OHM.sageDeep}` }}>
                <p style={{ color: OHM.primary, fontSize: 14, margin: 0 }}>
                  No prompts saved yet. Hit <strong>↻ Regenerate</strong> once — it will save the full assembled prompt here automatically.
                </p>
              </div>
            </div>
          )}

          {!loading && prompts.length > 0 && (
            <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: isMobile ? 'column' : 'row' }}>

              {/* Prompt list */}
              <div style={{
                width: isMobile ? '100%' : 220, flexShrink: 0,
                borderRight: isMobile ? 'none' : `1px solid ${OHM.line}`,
                borderBottom: isMobile ? `1px solid ${OHM.line}` : 'none',
                overflowY: 'auto',
                padding: '16px 0',
              }}>
                {prompts.map((p, i) => {
                  const date = new Date(p.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                  const time = new Date(p.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  const isActive = i === selected
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelected(i)}
                      style={{
                        width: '100%', textAlign: 'left', display: 'block',
                        padding: '10px 16px', border: 'none', cursor: 'pointer',
                        background: isActive ? OHM.sage : 'transparent',
                        borderLeft: `3px solid ${isActive ? OHM.primary : 'transparent'}`,
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? OHM.ink : OHM.muted }}>{date} · {time}</div>
                      <div style={{ fontSize: 11, color: OHM.mutedLt, marginTop: 2 }}>
                        {p.version_label} · {p.change_source}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Prompt text */}
              <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: `24px ${pad}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: OHM.primary }}>
                    {current.version_label}
                  </span>
                  <span style={{ fontSize: 11, color: OHM.mutedLt }}>
                    · {new Date(current.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: OHM.creamBg, color: OHM.creamInk, border: `1px solid ${OHM.creamLine}` }}>
                    {current.change_source}
                  </span>
                </div>

                <pre style={{
                  fontFamily: '"SF Mono", "Fira Code", "Fira Mono", monospace',
                  fontSize: isMobile ? 11 : 12,
                  lineHeight: 1.7,
                  color: OHM.ink,
                  background: OHM.cream,
                  border: `1px solid ${OHM.line}`,
                  borderRadius: 8,
                  padding: '20px 24px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}>
                  {current.prompt_text}
                </pre>

                <div style={{ marginTop: 12, fontSize: 11, color: OHM.mutedLt }}>
                  {current.prompt_text.length.toLocaleString()} characters · ~{Math.round(current.prompt_text.length / 4).toLocaleString()} tokens
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
