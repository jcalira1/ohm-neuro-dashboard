import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { OHM } from '../tokens'

export default function PromptView({ isMobile }) {
  const [prompts,  setPrompts]  = useState([])
  const [selected, setSelected] = useState(0)
  const [loading,  setLoading]  = useState(true)

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
          Assembled prompts.
        </h1>
        <p style={{ fontSize: 13, color: OHM.muted, marginTop: 8, lineHeight: 1.55 }}>
          Read-only audit trail of every prompt sent to the model. Saved on each Regenerate.
        </p>
      </div>

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

          {/* Sidebar: prompt list */}
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

          {/* Main: prompt text */}
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
    </main>
  )
}
