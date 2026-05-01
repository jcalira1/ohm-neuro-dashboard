import { supabase } from '../supabase'
import { APPS_SCRIPT_URL } from '../constants'

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function getWeekLabel() {
  const now   = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - now.getDay() + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}, ${now.getFullYear()}`
}

// ─── Topic grouping ───────────────────────────────────────────────────────────

export function groupTopics(topics, grouping) {
  if (grouping === 'category') {
    const map = {}
    topics.forEach(t => { (map[t.category] = map[t.category] || []).push(t) })
    return Object.entries(map).map(([k, items]) => ({ key: k, label: k, items }))
  }

  return [{ key: 'all', label: 'All topics', items: topics }]
}

// ─── Apps Script ─────────────────────────────────────────────────────────────

/**
 * Fire-and-forget POST to Make/Apps Script.
 * Uses no-cors so the response is opaque — this is intentional.
 */
export function fireAppsScript(payload) {
  return fetch(APPS_SCRIPT_URL, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(payload),
  }).catch(() => {
    // Silently ignore network errors — this is fire-and-forget
  })
}

// ─── Supabase polling ─────────────────────────────────────────────────────────

/**
 * Polls Supabase every `intervalMs` ms until `draft_doc_url` is written back
 * by Apps Script, or until `attempts` are exhausted.
 * Returns the URL string, or null on timeout.
 */
export async function pollForDocUrl(topicId, attempts = 10, intervalMs = 2000) {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    const { data } = await supabase
      .from('topic_cards')
      .select('draft_doc_url')
      .eq('id', topicId)
      .single()
    if (data?.draft_doc_url) return data.draft_doc_url
  }
  return null
}
