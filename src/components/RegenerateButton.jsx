import { useEffect, useState } from 'react'
import { OHM } from '../tokens'

export default function RegenerateButton({ loading, error, lastToast, onRegenerate }) {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (lastToast === 'success') {
      setToast({ type: 'success', msg: '10 new topic cards generated.' })
    } else if (lastToast === 'error' && error) {
      setToast({ type: 'error', msg: error })
    }
    if (lastToast) {
      const t = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(t)
    }
  }, [lastToast, error])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button
        onClick={onRegenerate}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 18px', borderRadius: 6,
          border: `1px solid ${OHM.primary}`,
          background: loading ? OHM.sage : OHM.primary,
          color: loading ? OHM.primary : '#fff',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.8 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {loading ? 'Generating…' : '↻ Regenerate'}
      </button>

      {toast && (
        <div style={{
          fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 5,
          border: `1px solid ${toast.type === 'success' ? OHM.sageDeep : OHM.roseLine}`,
          background: toast.type === 'success' ? OHM.sage : OHM.roseBg,
          color: toast.type === 'success' ? OHM.primary : OHM.roseInk,
        }}>
          {toast.type === 'success' ? '✓ ' : '⚠ '}
          {toast.msg}
        </div>
      )}
    </div>
  )
}