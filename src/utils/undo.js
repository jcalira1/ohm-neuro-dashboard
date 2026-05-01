import { supabase } from '../supabase'
import { fireAppsScript } from './helpers'

const REACTION_DB_MAP = {
  full: 'draft_queued',
  supp: 'supporting',
  mon:  'monitor',
  excl: 'exclude',
}

export async function undoReaction({ topicId, reaction, keepNotes = false }) {
  const dbReaction = REACTION_DB_MAP[reaction]
  if (!dbReaction) return { ok: false, error: `Unknown reaction: ${reaction}` }

  try {
    let docUrl = null

    if (reaction === 'full') {
      const { data: topicRow, error: fetchErr } = await supabase
        .from('topic_cards').select('draft_doc_url').eq('id', topicId).maybeSingle()
      if (fetchErr) throw new Error(`Fetch topic failed: ${fetchErr.message}`)
      docUrl = topicRow?.draft_doc_url || null

      if (keepNotes) {
        const { data: rxnRow } = await supabase
          .from('reactions').select('reason')
          .eq('topic_id', topicId).eq('reaction', 'draft_queued')
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (rxnRow?.reason) {
          try {
            localStorage.setItem(
              `ohm_parked_notes:${topicId}`,
              JSON.stringify({ notes: rxnRow.reason, parkedAt: new Date().toISOString() })
            )
          } catch (e) { console.warn('Could not stash parked notes:', e) }
        }
      }
    }

    // Delete reactions row
    const { error: rxnErr } = await supabase
      .from('reactions').delete()
      .eq('topic_id', topicId).eq('reaction', dbReaction)
    if (rxnErr) throw new Error(`Reactions delete failed: ${rxnErr.message}`)

    // Reset feed_status + null draft_doc_url for drafts
    if (reaction === 'full') {
      const { error: topicErr } = await supabase
        .from('topic_cards')
        .update({ draft_doc_url: null, feed_status: 'in_feed' })
        .eq('id', topicId)
      if (topicErr) throw new Error(`Topic update failed: ${topicErr.message}`)
    }

    // Reset feed_status for exclude undo
    if (reaction === 'excl') {
      const { error: topicErr } = await supabase
        .from('topic_cards')
        .update({ feed_status: 'in_feed' })
        .eq('id', topicId)
      if (topicErr) throw new Error(`Topic update failed: ${topicErr.message}`)
    }

    // Fire-and-forget archive webhook
    if (docUrl) {
      fireAppsScript({ action: 'archive', doc_url: docUrl, topic_id: topicId })
    }

    return { ok: true }
  } catch (err) {
    console.error('[undoReaction] failed:', err)
    return { ok: false, error: err.message || 'Unknown error' }
  }
}

export function readParkedNotes(topicId) {
  try {
    const raw = localStorage.getItem(`ohm_parked_notes:${topicId}`)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearParkedNotes(topicId) {
  try { localStorage.removeItem(`ohm_parked_notes:${topicId}`) } catch { /* no-op */ }
}