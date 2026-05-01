import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

let lastRequestTime = 0
const RATE_LIMIT_MS = 30_000
const PROMPT_VERSION = 'v1.1'

const SYSTEM_PROMPT = `You are a neuroscience content intelligence engine for Ohm Neuro.
Generate exactly 10 high-signal neuroscience topic cards for a content team to evaluate.

## Topics to focus on
- Mood disorders (depression, anxiety, bipolar disorder)
- Cognitive disorders and cognitive decline
- ADHD and attention regulation
- Burnout and stress-related neurological effects
- Neurodegeneration (Alzheimer's, Parkinson's, etc.)
- Neuromodulation (TMS, tDCS, neurofeedback, deep brain stimulation)
- Cognitive training and brain plasticity
- Wellness, mental health optimization, and neuroprotection
- Brain aging and longevity
- Psychedelics and psychedelic-assisted therapy
- Sleep and its role in cognitive health
- Gut-brain axis and microbiome
- Exercise and brain health

## Priority Sources
- Nature Neuroscience, Neuron, Cell, Nature Medicine
- The Lancet Psychiatry, JAMA Psychiatry, PNAS
- eLife, Journal of Neuroscience, Brain
- Neuropsychopharmacology, Biological Psychiatry
- Trends in Cognitive Sciences, Nature Reviews Neuroscience
- bioRxiv preprints only if highly cited or from top labs

## Extra Keywords
- psychedelic therapy RCT
- dementia prevention intervention
- cognitive reserve
- vagus nerve stimulation
- GLP-1 brain
- neuroprotection lifestyle

## Editorial Rules
- Prioritize RCTs over observational studies
- Deprioritize animal studies unless findings are very translational
- Every card must reference a real or plausible recent study
- Return ONLY valid JSON — no markdown, no preamble, no explanation.`

function buildUserPrompt(category, context) {
  const categoryClause = category
    ? `Focus specifically on the category: ${category}.`
    : 'Cover a diverse mix of the neuroscience categories listed above.'
  const contextClause = context
    ? `Additional editorial context for this run: ${context}.`
    : ''

  return `${categoryClause} ${contextClause}

Generate exactly 10 topic cards. Return this exact JSON structure with no other text:

{
  "cards": [
    {
      "title": "Concise, editorial-quality topic title",
      "brief": "2-3 sentence research brief covering the core finding and why it matters",
      "key_claims": [
        "Specific verifiable claim 1",
        "Specific verifiable claim 2",
        "Specific verifiable claim 3"
      ],
      "sources": [
        { "type": "peer-reviewed", "description": "Journal name, lead author, approximate year" }
      ],
      "source_url": "https://doi.org/... or null if not available",
      "signal_summary": "FULL PIECE — one sentence why, OR SUPPORTING REFERENCE — one sentence, OR MONITOR — one sentence",
      "category": "One of: Clinical & Psychiatric | Intervention & Neuromodulation | Lifestyle, Systems & Optimization | Psychedelics & Novel Therapeutics | Emerging & Frontier | Neuroscience"
    }
  ]
}`
}

async function callAnthropicWithRetry(category, context, retries = 2) {
  const delays = [2000, 4000]
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 4096,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: buildUserPrompt(category, context) }],
      })
      return response
    } catch (err) {
      const isRateLimit = err?.status === 429
      if (isRateLimit && attempt < retries) {
        await new Promise(r => setTimeout(r, delays[attempt]))
        continue
      }
      throw err
    }
  }
}

function validateCards(cards) {
  if (!Array.isArray(cards) || cards.length !== 10) return false
  return cards.every(c =>
    typeof c.title          === 'string' && c.title.trim() &&
    typeof c.brief          === 'string' && c.brief.trim() &&
    Array.isArray(c.key_claims) &&
    Array.isArray(c.sources) &&
    typeof c.signal_summary === 'string' && c.signal_summary.trim() &&
    typeof c.category       === 'string' && c.category.trim()
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const now = Date.now()
  if (now - lastRequestTime < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastRequestTime)) / 1000)
    return res.status(429).json({ error: `Rate limited. Try again in ${waitSec}s.` })
  }
  lastRequestTime = now

  const { category, context } = req.body || {}

  try {
    const response = await callAnthropicWithRetry(category, context)
    const rawText  = response.content[0]?.text || ''

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return res.status(502).json({ error: 'Model returned malformed JSON. Try again.' })
    }

    const cards = parsed?.cards
    if (!validateCards(cards)) {
      return res.status(502).json({ error: 'Model response did not match expected schema.' })
    }

    const rows = cards.map(c => ({
      title:             c.title,
      brief:             c.brief,
      claims:            c.key_claims,
      sources:           c.sources,
      signal_summary:    c.signal_summary,
      category:          c.category,
      prompt_version:    PROMPT_VERSION,
      source_url:        c.source_url || null,
    }))

    const { error: insertError } = await supabase
      .from('topic_cards')
      .insert(rows)
      .onConflict('source_url')
      .ignore()

    if (insertError) {
      return res.status(500).json({ error: 'Failed to persist cards to database.' })
    }

    return res.status(200).json({ cards })

  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected server error.' })
  }
}