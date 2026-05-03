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

// ─── Semantic Scholar ─────────────────────────────────────────────────────────

// Diverse queries covering the editorial taxonomy
const SEARCH_QUERIES = [
  'depression anxiety neurobiological mechanisms treatment randomized trial',
  'ADHD attention dysregulation brain executive function',
  'transcranial magnetic stimulation TMS clinical depression outcomes',
  'psilocybin MDMA psychedelic assisted therapy randomized controlled trial',
  'sleep slow wave memory consolidation brain health',
  'aerobic exercise hippocampus neurogenesis cognitive function',
  'Alzheimer dementia prevention lifestyle intervention',
  'gut microbiome brain axis depression anxiety cognition',
  'chronic stress burnout HPA cortisol brain',
  'EEG wearable neurofeedback cognitive performance',
  'cognitive training working memory neuroplasticity',
  'vagus nerve stimulation psychiatric neurological',
  'GLP-1 receptor brain neuroprotection cognition',
  'machine learning neuroimaging psychiatric diagnosis',
  'mindfulness meditation prefrontal cortex brain structure',
]

async function searchSemanticScholar(query) {
  const fields = 'title,authors,year,journal,externalIds,abstract,citationCount,publicationTypes'
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=5`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'OhmNeuro/1.0' } })
    if (!res.ok) return []
    const json = await res.json()
    return json.data || []
  } catch {
    return []
  }
}

function scorePaper(p) {
  if (!p.abstract || !p.externalIds?.DOI || !p.year) return -1
  let score = 0
  if (p.year >= 2023) score += 3
  else if (p.year >= 2021) score += 2
  else if (p.year >= 2019) score += 1
  score += Math.min((p.citationCount || 0) / 20, 4)
  if (p.publicationTypes?.includes('JournalArticle')) score += 2
  return score
}

async function fetchRealPapers(previousTitles = []) {
  const results = []
  const seenDois = new Set()
  const prevLower = previousTitles.map(t => t.toLowerCase())

  for (const query of SEARCH_QUERIES) {
    // Gentle rate limiting — Semantic Scholar allows 100 req/5min unauthenticated
    await new Promise(r => setTimeout(r, 250))

    const papers = await searchSemanticScholar(query)
    const best = papers
      .map(p => ({ ...p, _score: scorePaper(p) }))
      .filter(p => p._score >= 0)
      .sort((a, b) => b._score - a._score)[0]

    if (!best) continue

    const doi = best.externalIds.DOI
    if (seenDois.has(doi)) continue

    // Skip if title substantially overlaps with previously surfaced topics
    const titleLower = best.title.toLowerCase()
    if (prevLower.some(prev => prev.length > 20 && titleLower.includes(prev.slice(0, 20)))) continue

    seenDois.add(doi)
    results.push({
      title:         best.title,
      abstract:      (best.abstract || '').slice(0, 1000),
      authors:       (best.authors || []).map(a => a.name).join(', ') || 'Unknown',
      journal:       best.journal?.name || 'Unknown Journal',
      year:          best.year,
      doi,
      source_url:    `https://doi.org/${doi}`,
      citationCount: best.citationCount || 0,
      pubTypes:      (best.publicationTypes || []).join(', '),
    })

    if (results.length >= 12) break
  }

  return results
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a neuroscience content intelligence engine for Ohm Neuro.
You will receive real, published research papers fetched from Semantic Scholar.
Your job is to write editorial topic cards based solely on the papers provided — do NOT invent studies or URLs.

## Ohm Neuro Editorial Mission
The modern environment — digital, professional, social — is placing unprecedented demands on the human brain. Attention is fragmenting. Mental fatigue is rising. Cognitive overload has become a background condition of everyday life. Burnout, anxiety, and declining focus are not separate phenomena; they are symptoms of the same underlying challenge: the brain is being asked to operate in an environment it was not designed for.

Ohm Neuro believes brain health deserves the same systematic, measurable, and evidence-based attention that we give to physical health. The future of mental health is not reactive — it is preventative, measurable, and personal.

THE LITMUS TEST — applied to every card: "Does this help people understand or improve their brain health?"

For signal_summary: state whether this warrants a FULL PIECE or is a SUPPORTING REFERENCE, then explain in one sentence how it connects to brain health in the modern world.

## Category Taxonomy (use exactly one per card)
Clinical & Psychiatric | Intervention & Neuromodulation | Lifestyle, Systems & Optimization |
Psychedelics & Novel Therapeutics | Emerging & Frontier | Neuroscience |
Cognitive Performance | Attention & Modern Brain | Longevity & Brain Ageing |
Mental Resilience | Neurotechnology | Neurorehabilitation | AI & Machine Learning |
Behavioral Intervention | Behavioral Psychology | Biological Pathways |
Brain-Computer Interfaces | Cognitive Assessment | Cognitive Reserve | Decision Making |
Dementia Prevention | Diagnostics | Mental Health & Well-Being | Nutrition |
Preventive Medicine | Public Policy | Stress & Autonomic Nervous System |
Wearables & Digital Biomarkers | Dementia | Rehabilitation | Neuroplasticity

Return ONLY valid JSON — no markdown, no preamble, no code fences.`

function buildUserPrompt(papers, dynamicContext) {
  const paperList = papers.map((p, i) => [
    `[Paper ${i + 1}]`,
    `Title:     ${p.title}`,
    `Authors:   ${p.authors}`,
    `Journal:   ${p.journal}, ${p.year}`,
    `Citations: ${p.citationCount}`,
    `Type:      ${p.pubTypes || 'unknown'}`,
    `DOI:       ${p.doi}`,
    `Abstract:  ${p.abstract}`,
  ].join('\n')).join('\n\n---\n\n')

  return `${dynamicContext ? dynamicContext + '\n\n' : ''}Write one editorial topic card for each of the ${papers.length} papers below. The source_url for each card MUST be the exact doi.org URL shown — do not modify it.

${paperList}

Return this exact JSON (no markdown, no code fences):
{
  "cards": [
    {
      "title": "Concise, editorial-quality topic title — NOT the paper title, make it reader-friendly",
      "brief": "2-3 sentence research brief covering the core finding and why it matters for brain health",
      "key_claims": [
        "Specific verifiable claim from the paper, include stats or numbers where available",
        "Specific verifiable claim 2",
        "Specific verifiable claim 3"
      ],
      "sources": [
        { "type": "peer-reviewed", "description": "Journal name, Lead Author et al., year" }
      ],
      "source_url": "COPY THE EXACT doi.org URL FROM THE PAPER — do not change it",
      "signal_summary": "FULL PIECE or SUPPORTING REFERENCE — one sentence on how this helps the audience understand or improve their brain health",
      "category": "Exactly one category from the taxonomy"
    }
  ]
}`
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
    console.log('[generate] Fetching real papers from Semantic Scholar...')

    // Pull previous titles so we don't repeat topics
    const { data: recentCards } = await supabase
      .from('topic_cards')
      .select('title')
      .order('created_at', { ascending: false })
      .limit(50)
    const previousTitles = (recentCards || []).map(c => c.title).filter(Boolean)

    const papers = await fetchRealPapers(previousTitles)
    console.log(`[generate] Got ${papers.length} real papers from Semantic Scholar`)

    if (papers.length < 5) {
      return res.status(502).json({ error: 'Could not fetch enough real papers from Semantic Scholar — try again.' })
    }

    const selectedPapers = papers.slice(0, 10)

    const dynamicContext = await buildPromptContext()
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

    // Always overwrite source_url with the verified Semantic Scholar DOI — never trust the model's URL
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

    const { error: bulkError } = await supabase.from('topic_cards').insert(rows)

    if (bulkError) {
      console.warn('[generate] Bulk insert failed, trying row-by-row:', bulkError.message)
      const failed = []
      for (const row of rows) {
        const { error: rowErr } = await supabase.from('topic_cards').insert([row])
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
