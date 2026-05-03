import { createClient } from '@supabase/supabase-js'

export async function buildPromptContext() {
  const supabase = createClient(
    'https://opwoaznzlcfxpwtrujse.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: reactions }, { data: recentCards }] = await Promise.all([
    supabase
      .from('reactions')
      .select('reaction, topic_cards(category)')
      .in('reaction', ['draft_queued', 'soft_yes', 'exclude'])
      .order('created_at', { ascending: false })
      .limit(200),

    supabase
      .from('topic_cards')
      .select('title')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Tally reactions per category
  const excludeCount  = {}
  const draftCount    = {}
  const monitorCount  = {}

  for (const r of reactions || []) {
    const cat = r.topic_cards?.category
    if (!cat) continue
    if (r.reaction === 'exclude') {
      excludeCount[cat]  = (excludeCount[cat]  || 0) + 1
    } else if (r.reaction === 'draft_queued') {
      draftCount[cat]    = (draftCount[cat]    || 0) + 1
    } else if (r.reaction === 'soft_yes') {
      monitorCount[cat]  = (monitorCount[cat]  || 0) + 1
    }
  }

  const rules = []
  for (const [cat, n] of Object.entries(excludeCount)) {
    if (n >= 3) rules.push(`Deprioritize "${cat}" — editors excluded ${n} cards from this category recently.`)
  }
  for (const [cat, n] of Object.entries(draftCount)) {
    if (n >= 3) rules.push(`Prioritize "${cat}" — editors drafted ${n} cards from this category recently.`)
  }
  for (const [cat, n] of Object.entries(monitorCount)) {
    if (n >= 2) rules.push(`Surface more content from "${cat}" — editors flagged ${n} cards as worth monitoring; this signals audience interest.`)
  }

  const parts = []

  if (rules.length > 0) {
    parts.push(`## Learned Editorial Rules\n${rules.map(r => `- ${r}`).join('\n')}`)
  }

  const titles = (recentCards || []).map(c => c.title).filter(Boolean)
  if (titles.length > 0) {
    parts.push(`## Previously Surfaced — DO NOT REPEAT\n${titles.map(t => `- ${t}`).join('\n')}`)
  }

  const context = parts.join('\n\n')
  console.log('[buildPromptContext] Assembled context:\n', context.slice(0, 500))
  return context
}
