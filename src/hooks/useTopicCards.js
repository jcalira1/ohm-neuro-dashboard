import { useState, useCallback } from 'react'
import { supabase } from '../supabase'

export function useTopicCards() {
  const [cards,     setCards]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [lastToast, setLastToast] = useState(null)

const loadLatest = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchErr } = await supabase
      .from('topic_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (!fetchErr && data) setCards(data)
    setLoading(false)
  }, [])

  const regenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastToast(null)
    try {
      const res  = await fetch('/api/generate-topic-cards', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })
      let json = {}
      try { json = await res.json() } catch { /* non-JSON body — API not running or crashed */ }
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status} — run via vercel dev locally`)
      await loadLatest()
      setLastToast('success')
    } catch (err) {
      setError(err.message || 'Generation failed. Try again.')
      setLastToast('error')
    } finally {
      setLoading(false)
    }
  }, [loadLatest])

  return { cards, loading, error, lastToast, loadLatest, regenerate }
}