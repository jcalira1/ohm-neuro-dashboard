import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { buildPromptContext } from './lib/buildPromptContext.mjs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  'https://opwoaznzlcfxpwtrujse.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RATE_LIMIT_KEY = 'generate_topic_cards'
const RATE_LIMIT_MS  = 30_000
const PROMPT_VERSION = 'v2.0'

// ─── Rate limit ───────────────────────────────────────────────────────────────

async function checkRateLimit() {
  try {
    const { data } = await supabase
      .from('api_rate_limits')
      .select('last_called_at')
      .eq('key', RATE_LIMIT_KEY)
      .maybeSingle()

    if (data?.last_called_at) {
      const elapsed = Date.now() - new Date(data.last_called_at).getTime()
      if (elapsed < RATE_LIMIT_MS) return Math.ceil((RATE_LIMIT_MS - elapsed) / 1000)
    }

    await supabase
      .from('api_rate_limits')
      .upsert({ key: RATE_LIMIT_KEY, last_called_at: new Date().toISOString() })

    return 0
  } catch {
    return 0
  }
}

// ─── PubMed ───────────────────────────────────────────────────────────────────

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

// Each query is tagged with the editorial category it maps to.
// Category boost/demote signals from triage reactions re-rank these at runtime.
const SEARCH_QUERIES = [
  { q: 'depression anxiety treatment randomized controlled trial[pt] 2020:2025[dp]',   cat: 'Clinical & Psychiatric' },
  { q: 'ADHD attention deficit hyperactivity disorder brain neuroscience 2020:2025[dp]', cat: 'Attention & Modern Brain' },
  { q: 'transcranial magnetic stimulation depression clinical trial 2020:2025[dp]',     cat: 'Intervention & Neuromodulation' },
  { q: 'psilocybin psychedelic therapy randomized trial 2019:2025[dp]',                cat: 'Psychedelics & Novel Therapeutics' },
  { q: 'sleep memory consolidation cognitive function brain 2021:2025[dp]',             cat: 'Lifestyle, Systems & Optimization' },
  { q: 'aerobic exercise hippocampus neurogenesis cognition 2020:2025[dp]',             cat: 'Lifestyle, Systems & Optimization' },
  { q: 'dementia Alzheimer prevention intervention randomized 2020:2025[dp]',           cat: 'Dementia Prevention' },
  { q: 'gut microbiome brain axis cognition depression 2020:2025[dp]',                 cat: 'Biological Pathways' },
  { q: 'burnout stress cortisol brain neurological 2020:2025[dp]',                     cat: 'Stress & Autonomic Nervous System' },
  { q: 'neurofeedback EEG cognitive performance brain 2020:2025[dp]',                  cat: 'Neurotechnology' },
  { q: 'cognitive training working memory neuroplasticity 2021:2025[dp]',               cat: 'Cognitive Performance' },
  { q: 'vagus nerve stimulation depression anxiety 2020:2025[dp]',                     cat: 'Intervention & Neuromodulation' },
  { q: 'GLP-1 semaglutide brain neuroprotection 2022:2025[dp]',                       cat: 'Emerging & Frontier' },
  { q: 'machine learning deep learning neuroimaging psychiatric 2022:2025[dp]',         cat: 'AI & Machine Learning' },
  { q: 'mindfulness meditation prefrontal cortex brain 2021:2025[dp]',                 cat: 'Mental Resilience' },
]

// Re-rank queries using triage feedback: boosted categories run first,
// demoted categories (excluded ≥ 3×) are skipped entirely.
function rankQueries(categoryBoosts = {}, categoryDemotes = {}) {
  return SEARCH_QUERIES
    .filter(({ cat }) => (categoryDemotes[cat] || 0) < 3)
    .map(q => ({ ...q, boost: categoryBoosts[q.cat] || 0 }))
    .sort((a, b) => b.boost - a.boost)
}

async function pubmedSearch(query) {
  const url = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json&sort=relevance`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'OhmNeuro/1.0' } })
    if (!res.ok) return []
    const json = await res.json()
    return json.esearchresult?.idlist || []
  } catch {
    return []
  }
}

async function pubmedFetch(ids) {
  if (!ids.length) return []
  const url = `${PUBMED_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'OhmNeuro/1.0' } })
    if (!res.ok) return []
    const json = await res.json()
    const result = json.result || {}
    return (result.uids || []).map(uid => result[uid]).filter(Boolean)
  } catch {
    return []
  }
}

// Batch-fetch abstracts for multiple PMIDs in one API call
async function pubmedAbstractsBatch(pmids) {
  if (!pmids.length) return {}
  const url = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=text&rettype=abstract`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'OhmNeuro/1.0' } })
    if (!res.ok) return {}
    const text = await res.text()
    // Each record in the text response is separated by a blank line before "PMID:"
    // Parse each block and map PMID → abstract
    const map = {}
    const blocks = text.split(/\n\n(?=\d+\. )/)
    for (const block of blocks) {
      const pmidMatch = block.match(/PMID:\s*(\d+)/)
      if (!pmidMatch) continue
      const pmid = pmidMatch[1]
      // Abstract text sits between the author block and the PMID line
      const absMatch = block.match(/(?:METHODS?|BACKGROUND|OBJECTIVE|PURPOSE|CONCLUSIONS?|RESULTS?|ABSTRACT)[^\n]*\n([\s\S]+?)(?:\n\nPMID:|$)/i)
        || block.match(/\n\n([\s\S]+?)(?:\n\nPMID:|$)/)
      if (absMatch) {
        map[pmid] = absMatch[1].replace(/\s+/g, ' ').trim().slice(0, 450)
      }
    }
    return map
  } catch {
    return {}
  }
}

function extractDoi(paper) {
  const doiEntry = (paper.articleids || []).find(a => a.idtype === 'doi')
  return doiEntry?.value || null
}

function scorePubmedPaper(paper, doi) {
  if (!doi) return -1
  let score = 0
  const year = parseInt((paper.pubdate || '').slice(0, 4), 10)
  if (year >= 2023) score += 3
  else if (year >= 2021) score += 2
  else if (year >= 2019) score += 1
  const types = paper.pubtype || []
  if (types.some(t => /randomized/i.test(t))) score += 3
  if (types.some(t => /meta.?analysis/i.test(t))) score += 2
  if (types.some(t => /journal article/i.test(t))) score += 1
  return score
}

async function fetchRealPapers(previousTitles = [], rankedQueries = SEARCH_QUERIES, usedSourceUrls = new Set()) {
  const candidates = []
  const seenDois   = new Set()
  const prevLower  = previousTitles.map(t => t.toLowerCase())

  // Phase 1: search + score — 2 API calls per query
  for (const { q: query } of rankedQueries) {
    await new Promise(r => setTimeout(r, 350))

    const pmids = await pubmedSearch(query)
    if (!pmids.length) continue

    await new Promise(r => setTimeout(r, 350))
    const papers = await pubmedFetch(pmids)

    const scored = papers
      .map(p => ({ paper: p, doi: extractDoi(p), score: scorePubmedPaper(p, extractDoi(p)) }))
      .filter(x => {
        if (x.score < 0) return false
        if (seenDois.has(x.doi)) return false
        if (usedSourceUrls.has(`https://doi.org/${x.doi}`)) return false
        const titleLower = (x.paper.title || '').toLowerCase()
        if (prevLower.some(prev => prev.length > 20 && titleLower.includes(prev.slice(0, 20)))) return false
        return true
      })
      .sort((a, b) => b.score - a.score)

    const top = scored[0]
    if (!top) continue

    seenDois.add(top.doi)
    candidates.push(top)
    if (candidates.length >= 12) break
  }

  if (!candidates.length) return []

  // Phase 2: batch-fetch all abstracts in ONE API call instead of one per paper
  await new Promise(r => setTimeout(r, 350))
  const pmids = candidates.map(c => c.paper.uid)
  const abstracts = await pubmedAbstractsBatch(pmids)

  const results = []
  for (const { paper, doi } of candidates) {
    const abstract = abstracts[paper.uid]
    if (!abstract) continue

    const year    = (paper.pubdate || '').slice(0, 4)
    const authors = (paper.authors || []).slice(0, 2).map(a => a.name).join(', ')

    results.push({
      pmid:       paper.uid,
      title:      paper.title,
      abstract,
      authors:    authors || 'Unknown',
      journal:    paper.source || 'Unknown Journal',
      year,
      doi,
      source_url: `https://doi.org/${doi}`,
      pubTypes:   (paper.pubtype || []).join(', '),
    })

    if (results.length >= 12) break
  }

  return results
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a neuroscience content intelligence engine for Ohm Neuro.
Write editorial topic cards from real PubMed papers. Stay strictly within what the paper says — do not invent claims or URLs.

Litmus test for every card: "Does this help people understand or improve their brain health?"

signal_summary format: start with "FULL PIECE" or "SUPPORTING REFERENCE", then one sentence on why it matters for brain health.

Categories (pick exactly one):
Clinical & Psychiatric | Intervention & Neuromodulation | Lifestyle, Systems & Optimization | Psychedelics & Novel Therapeutics | Emerging & Frontier | Neuroscience | Cognitive Performance | Attention & Modern Brain | Longevity & Brain Ageing | Mental Resilience | Neurotechnology | Neurorehabilitation | AI & Machine Learning | Behavioral Intervention | Behavioral Psychology | Biological Pathways | Brain-Computer Interfaces | Cognitive Assessment | Cognitive Reserve | Decision Making | Dementia Prevention | Diagnostics | Mental Health & Well-Being | Nutrition | Preventive Medicine | Public Policy | Stress & Autonomic Nervous System | Wearables & Digital Biomarkers | Dementia | Rehabilitation | Neuroplasticity

Return ONLY valid JSON — no markdown, no preamble, no code fences.`

function buildUserPrompt(papers, dynamicContext) {
  const paperList = papers.map((p, i) =>
    `[${i + 1}] ${p.journal}, ${p.year} | ${p.pubTypes || 'journal article'}\nDOI: ${p.doi}\nTitle: ${p.title}\nAbstract: ${p.abstract}`
  ).join('\n\n')

  return `${dynamicContext ? dynamicContext + '\n\n' : ''}Write one editorial topic card per paper. Use each paper's exact DOI URL as source_url — do not modify it.

${paperList}

JSON (no markdown):
{"cards":[{"title":"reader-friendly editorial title","brief":"2-3 sentences on core finding and brain health relevance","key_claims":["stat-backed claim 1","claim 2","claim 3"],"sources":[{"type":"peer-reviewed","description":"Journal, Lead Author et al., year"}],"source_url":"https://doi.org/EXACT","signal_summary":"FULL PIECE or SUPPORTING REFERENCE — one sentence","category":"one category"}]}`
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function extractJSON(raw) {
  try { return JSON.parse(raw.trim()) } catch {}
  const stripped = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(stripped) } catch {}
  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }
  return null
}

function validateCards(cards, expectedCount) {
  if (!Array.isArray(cards) || cards.length !== expectedCount) return false
  return cards.every(c =>
    typeof c.title          === 'string' && c.title.trim() &&
    typeof c.brief          === 'string' && c.brief.trim() &&
    Array.isArray(c.key_claims) &&
    Array.isArray(c.sources) &&
    typeof c.signal_summary === 'string' && c.signal_summary.trim() &&
    typeof c.category       === 'string' && c.category.trim()
  )
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const waitSec = await checkRateLimit()
  if (waitSec > 0) return res.status(429).json({ error: `Please wait ${waitSec}s before regenerating.` })

  try {
    console.log('[generate] Fetching real papers from PubMed...')

    // Pull previous titles and source_urls so we don't repeat topics or re-insert the same DOI
    const { data: recentCards } = await supabase
      .from('topic_cards')
      .select('title, source_url')
      .order('created_at', { ascending: false })
      .limit(100)
    const previousTitles = (recentCards || []).map(c => c.title).filter(Boolean)
    const usedSourceUrls = new Set((recentCards || []).map(c => c.source_url).filter(Boolean))

    const { context: dynamicContext, categoryBoosts, categoryDemotes } = await buildPromptContext()
    const rankedQueries = rankQueries(categoryBoosts, categoryDemotes)
    console.log('[generate] Category boosts:', JSON.stringify(categoryBoosts))
    console.log('[generate] Category demotes:', JSON.stringify(categoryDemotes))

    const papers = await fetchRealPapers(previousTitles, rankedQueries, usedSourceUrls)
    console.log(`[generate] Got ${papers.length} real papers from PubMed`)

    if (papers.length < 5) {
      return res.status(502).json({ error: 'Could not fetch enough real papers from PubMed — try again.' })
    }

    const selectedPapers = papers.slice(0, 10)
    const userPrompt = buildUserPrompt(selectedPapers, dynamicContext)

    // Save prompt audit trail (non-blocking)
    supabase.from('prompt_versions').insert({
      version_label: PROMPT_VERSION,
      prompt_text:   SYSTEM_PROMPT + '\n\n' + userPrompt,
      change_source: 'auto',
    }).then(({ error }) => {
      if (error) console.warn('[generate] Could not save prompt version:', error.message)
    })

    console.log('[generate] Calling Claude with real paper data...')
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content[0]?.text || ''
    const parsed  = extractJSON(rawText)

    if (!parsed) {
      console.error('[generate] JSON extraction failed. Raw:', rawText.slice(0, 500))
      return res.status(502).json({ error: 'Model returned malformed JSON — try again.' })
    }

    const cards = parsed?.cards
    if (!validateCards(cards, selectedPapers.length)) {
      console.error('[generate] Schema validation failed:', JSON.stringify(cards)?.slice(0, 300))
      return res.status(502).json({ error: 'Model response did not match expected schema — try again.' })
    }

    // Always overwrite source_url with the verified PubMed DOI — never trust the model's URL
    const rows = cards.map((c, i) => ({
      title:          c.title,
      brief:          c.brief,
      claims:         c.key_claims,
      sources:        c.sources,
      signal_summary: c.signal_summary,
      category:       c.category,
      prompt_version: PROMPT_VERSION,
      source_url:     selectedPapers[i].source_url,
      feed_status:    'in_feed',
    }))

    const { error: bulkError } = await supabase
      .from('topic_cards')
      .insert(rows)

    if (bulkError) {
      console.warn('[generate] Bulk insert failed, trying row-by-row:', bulkError.message)
      const failed = []
      for (const row of rows) {
        const { error: rowErr } = await supabase
          .from('topic_cards')
          .insert([row])
        if (rowErr) {
          console.error('[generate] Row failed:', rowErr.message, '|', row.title)
          failed.push(row.title)
        }
      }
      if (failed.length === rows.length) {
        return res.status(500).json({ error: `DB insert failed: ${bulkError.message}` })
      }
    } else {
      console.log('[generate] All cards inserted successfully.')
    }

    return res.status(200).json({ cards })

  } catch (err) {
    console.error('[generate] Unexpected error:', err)
    return res.status(500).json({ error: err?.message || 'Unexpected server error.' })
  }
}
