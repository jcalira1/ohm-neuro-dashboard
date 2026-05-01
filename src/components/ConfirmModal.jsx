import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { OHM } from '../tokens'

export default function ConfirmModal({
  title, body,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, extraOption = null,
  onConfirm, onCancel,
}) {
  const [extraChecked, setExtraChecked] = useState(extraOption?.defaultChecked || false)
  const [busy,   setBusy]   = useState(false)
  const [errMsg, setErrMsg] = useState(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, busy])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  async function handleConfirm() {
    if (busy) return
    setBusy(true); setErrMsg(null)
    try { await onConfirm({ extraChecked }) }
    catch (err) { setErrMsg(err?.message || 'Something went wrong.') }
    finally { setBusy(false) }
  }

  const accent     = destructive ? OHM.roseInk  : OHM.primary
  const accentBg   = destructive ? OHM.roseBg   : OHM.sage
  const accentLine = destructive ? OHM.roseLine : OHM.sageDeep

  return createPortal(
    <>
      <div onClick={busy ? undefined : onCancel} style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(12, 24, 18, 0.55)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
      }} />
      <div role="alertdialog" aria-modal="true" style={{
        position: 'fixed', zIndex: 301,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(440px, calc(100vw - 40px))',
        background: OHM.paper, borderRadius: 12,
        border: `1px solid ${OHM.line}`,
        boxShadow: '0 24px 64px rgba(12,24,18,0.18)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 24px 16px', borderLeft: `3px solid ${accent}`, background: accentBg }}>
          <h3 style={{ fontFamily: '"Source Serif 4", Georgia, serif', fontSize: 17, fontWeight: 500, margin: 0, color: OHM.ink, letterSpacing: -0.2 }}>{title}</h3>
        </div>
        <div style={{ padding: '18px 24px 22px' }}>
          <div style={{ fontSize: 13.5, color: OHM.ink, lineHeight: 1.6 }}>{body}</div>

          {extraOption && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 12px', borderRadius: 6, background: OHM.sage, border: `1px solid ${accentLine}`, cursor: busy ? 'wait' : 'pointer', fontSize: 12.5, color: OHM.primary, fontWeight: 500 }}>
              <input type="checkbox" checked={extraChecked} disabled={busy}
                onChange={e => setExtraChecked(e.target.checked)}
                style={{ accentColor: OHM.primary }} />
              <span>{extraOption.label}</span>
            </label>
          )}

          {errMsg && (
            <div style={{ marginTop: 14, padding: '8px 12px', fontSize: 12, color: OHM.roseInk, background: OHM.roseBg, border: `1px solid ${OHM.roseLine}`, borderRadius: 4 }}>{errMsg}</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
            <button onClick={onCancel} disabled={busy} style={{ padding: '7px 16px', borderRadius: 4, border: `1px solid ${OHM.line}`, background: OHM.paper, color: OHM.muted, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: busy ? 'wait' : 'pointer' }}>{cancelLabel}</button>
            <button onClick={handleConfirm} disabled={busy} style={{ padding: '7px 16px', borderRadius: 4, border: `1px solid ${accent}`, background: accent, color: '#fff', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.65 : 1 }}>{busy ? 'Working…' : confirmLabel}</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}