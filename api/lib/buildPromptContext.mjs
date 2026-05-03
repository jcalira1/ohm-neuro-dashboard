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

  const tier1    = []  // draft_queued
  const tier2    = []  // soft_yes
  const excluded = []

  // Category signal — used to re-rank PubMed queries
  const categoryBoosts  = {}  // category → positive score
  const categoryDemotes = {}  // category → negative score

  for (const r of reactions || []) {
    const title    = r.topic_cards?.title
    const category = r.topic_cards?.category
    if (!title) continue
    const reason = r.reason || null

    if (r.reaction === 'draft_queued') {
      tier1.push({ title, reason })
      if (category) categoryBoosts[category] = (categoryBoosts[category] || 0) + 2
    } else if (r.reaction === 'soft_yes') {
      tier2.push({ title, reason })
      if (category) categoryBoosts[category] = (categoryBoosts[category] || 0) + 1
    } else if (r.reaction === 'exclude') {
      excluded.push({ title, reason })
      if (category) categoryDemotes[category] = (categoryDemotes[category] || 0) + 1
    }
  }

  // ── Claude context block ──────────────────────────────────────────────────────
  const parts = []

  if (tier1.length > 0 || tier2.length > 0 || excluded.length > 0) {
    const lines = ['## Editorial Feedback from Previous Batches']

    if (tier1.length > 0) {
      lines.push('\n**Drafted (Tier 1) — Prioritise topics like these. Write with more depth:**')
      for (const { title, reason } of tier1) {
        lines.push(reason ? `- ${title} — bring more in: ${reason}` : `- ${title}`)
      }
    }

    if (tier2.length > 0) {
      lines.push('\n**Soft-yes (Tier 2) — Related topics welcome, lower priority:**')
      for (const { title } of tier2) {
        lines.push(`- ${title}`)
      }
    }

    if (excluded.length > 0) {
      lines.push('\n**Excluded — Do not cover these specific topics. Related areas are OK:**')
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

  return {
    context,
    categoryBoosts,
    categoryDemotes,
  }
}
