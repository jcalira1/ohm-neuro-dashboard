import { createClient } from '@supabase/supabase-js'

export async function buildPromptContext() {
  const supabase = createClient(
    'https://opwoaznzlcfxpwtrujse.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: reactions }, { data: recentCards }] = await Promise.all([
    supabase
      .from('reactions')
      .select('reaction, reason, topic_cards(title, category)')
      .in('reaction', ['draft_queued', 'soft_yes', 'exclude'])
      .order('created_at', { ascending: false })
      .limit(200),

    supabase
      .from('topic_cards')
      .select('title')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const tier1 = []  // draft_queued
  const tier2 = []  // soft_yes / monitor
  const excluded = []

  for (const r of reactions || []) {
    const title = r.topic_cards?.title
    if (!title) continue
    const reason = r.reason || null

    if (r.reaction === 'draft_queued') {
      tier1.push({ title, reason })
    } else if (r.reaction === 'soft_yes') {
      tier2.push({ title, reason })
    } else if (r.reaction === 'exclude') {
      excluded.push({ title, reason })
    }
  }

  const parts = []

  if (tier1.length > 0 || tier2.length > 0 || excluded.length > 0) {
    const lines = ['## Last Batch Context']

    if (tier1.length > 0) {
      lines.push('\n**Tier 1 — Prioritise, find more like these:**')
      for (const { title, reason } of tier1) {
        lines.push(reason ? `- ${title} — bring more in: ${reason}` : `- ${title}`)
      }
    }

    if (tier2.length > 0) {
      lines.push('\n**Tier 2 — Find related, lower priority:**')
      for (const { title } of tier2) {
        lines.push(`- ${title}`)
      }
    }

    if (excluded.length > 0) {
      lines.push('\n**Excluded — Skip these papers (related areas are OK):**')
      for (const { title, reason } of excluded) {
        lines.push(reason ? `- ${title} (reason: ${reason})` : `- ${title}`)
      }
    }

    parts.push(lines.join('\n'))
  }

  const titles = (recentCards || []).map(c => c.title).filter(Boolean)
  if (titles.length > 0) {
    parts.push(`## Previously Surfaced — DO NOT REPEAT\n${titles.map(t => `- ${t}`).join('\n')}`)
  }

  const context = parts.join('\n\n')
  console.log('[buildPromptContext] Assembled context:\n', context.slice(0, 600))
  return context
}
