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
      .limit(60),   // was 200 — we only need recent signal, not the full history

    supabase
      .from('topic_cards')
      .select('title')
      .order('created_at', { ascending: false })
      .limit(20),   // was 50 — DOI dedup handles the real duplicates now
  ])

  const tier1    = []  // draft_queued — cap at 12
  const tier2    = []  // soft_yes    — cap at 8
  const excluded = []  // exclude     — cap at 15

  const categoryBoosts  = {}
  const categoryDemotes = {}

  for (const r of reactions || []) {
    const title    = r.topic_cards?.title
    const category = r.topic_cards?.category
    if (!title) continue
    const reason = r.reason || null

    if (r.reaction === 'draft_queued' && tier1.length < 12) {
      tier1.push({ title, reason })
      if (category) categoryBoosts[category] = (categoryBoosts[category] || 0) + 2
    } else if (r.reaction === 'soft_yes' && tier2.length < 8) {
      tier2.push({ title, reason })
      if (category) categoryBoosts[category] = (categoryBoosts[category] || 0) + 1
    } else if (r.reaction === 'exclude' && excluded.length < 15) {
      excluded.push({ title, reason })
      if (category) categoryDemotes[category] = (categoryDemotes[category] || 0) + 1
    } else if (r.reaction === 'draft_queued' || r.reaction === 'soft_yes' || r.reaction === 'exclude') {
      // Still count category signal even when over the title cap
      if (category) {
        if (r.reaction === 'draft_queued') categoryBoosts[category] = (categoryBoosts[category] || 0) + 1
        if (r.reaction === 'soft_yes')     categoryBoosts[category] = (categoryBoosts[category] || 0) + 0.5
        if (r.reaction === 'exclude')      categoryDemotes[category] = (categoryDemotes[category] || 0) + 1
      }
    }
  }

  const parts = []

  if (tier1.length > 0 || tier2.length > 0 || excluded.length > 0) {
    const lines = ['## Editorial Feedback']

    if (tier1.length > 0) {
      lines.push('\nDrafted — write more like these:')
      for (const { title, reason } of tier1) {
        lines.push(reason ? `- ${title} (more: ${reason})` : `- ${title}`)
      }
    }

    if (tier2.length > 0) {
      lines.push('\nSoft-yes — related topics welcome:')
      for (const { title } of tier2) {
        lines.push(`- ${title}`)
      }
    }

    if (excluded.length > 0) {
      lines.push('\nExcluded — skip these specific topics:')
      for (const { title, reason } of excluded) {
        lines.push(reason ? `- ${title} (${reason})` : `- ${title}`)
      }
    }

    parts.push(lines.join('\n'))
  }

  const titles = (recentCards || []).map(c => c.title).filter(Boolean)
  if (titles.length > 0) {
    parts.push(`## Do Not Repeat\n${titles.map(t => `- ${t}`).join('\n')}`)
  }

  const context = parts.join('\n\n')
  console.log('[buildPromptContext] context chars:', context.length, '| ~tokens:', Math.round(context.length / 4))

  return { context, categoryBoosts, categoryDemotes }
}
