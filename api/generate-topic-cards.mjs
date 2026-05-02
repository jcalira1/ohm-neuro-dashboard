import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { buildPromptContext } from './lib/buildPromptContext.mjs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RATE_LIMIT_KEY = 'generate_topic_cards'
const RATE_LIMIT_MS  = 30_000
const PROMPT_VERSION = 'v2.0'

// ─── Rate limit (Supabase-backed — survives Vercel cold starts) ───────────────

async function checkRateLimit() {
  try {
    const { data } = await supabase
      .from('api_rate_limits')
      .select('last_called_at')
      .eq('key', RATE_LIMIT_KEY)
      .maybeSingle()

    if (data?.last_called_at) {
      const elapsed = Date.now() - new Date(data.last_called_at).getTime()
      if (elapsed < RATE_LIMIT_MS) {
        return Math.ceil((RATE_LIMIT_MS - elapsed) / 1000)
      }
    }

    await supabase
      .from('api_rate_limits')
      .upsert({ key: RATE_LIMIT_KEY, last_called_at: new Date().toISOString() })

    return 0
  } catch {
    // Table missing or DB unreachable — allow the request through
    return 0
  }
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are a neuroscience content intelligence engine for Ohm Neuro.
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
- Return ONLY valid JSON — no markdown, no preamble, no explanation.
- Skip any topic substantively similar to those listed under Previously Surfaced.`

const USER_PROMPT = `Cover a diverse mix of the neuroscience categories listed above.

Generate exactly 10 topic cards. Return this exact JSON structure with no other text, no markdown, no code fences:

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
      "source_url": null,
      "signal_summary": "FULL PIECE — one sentence why, OR SUPPORTING REFERENCE — one sentence",
      "category": "One of: Clinical & Psychiatric | Intervention & Neuromodulation | Lifestyle, Systems & Optimization | Psychedelics & Novel Therapeutics | Emerging & Frontier | Neuroscience"
    }
  ]
}`

// ─── Anthropic call ───────────────────────────────────────────────────────────

async function callAnthropicWithRetry(systemPrompt, retries = 2) {
  const delays = [2000, 4000]
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: USER_PROMPT }],
      })
      return response
    } catch (err) {
      if (err?.status === 429 && attempt < retries) {
        console.warn(`[generate-topic-cards] Anthropic rate limit — retrying in ${delays[attempt]}ms`)
        await new Promise(r => setTimeout(r, delays[attempt]))
        continue
      }
      throw err
    }
  }
}

// ─── Parsing + validation ─────────────────────────────────────────────────────

function extractJSON(rawText) {
  try { return JSON.parse(rawText.trim()) } catch {}

  const stripped = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try { return JSON.parse(stripped) } catch {}

  const match = stripped.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch {} }

  return null
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

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const waitSec = await checkRateLimit()
  if (waitSec > 0) {
    return res.status(429).json({ error: `Please wait ${waitSec}s before regenerating.` })
  }

  try {
    console.log('[generate-topic-cards] Starting generation...')

    const dynamicContext = await buildPromptContext()
    const systemPrompt = dynamicContext
      ? `${BASE_SYSTEM_PROMPT}\n\n${dynamicContext}`
      : BASE_SYSTEM_PROMPT

    console.log('[generate-topic-cards] Prompt assembled. Dynamic context length:', dynamicContext?.length ?? 0)

    const response = await callAnthropicWithRetry(systemPrompt)
    const rawText  = response.content[0]?.text || ''

    console.log('[generate-topic-cards] Raw response (first 300):', rawText.slice(0, 300))

    const parsed = extractJSON(rawText)
    if (!parsed) {
      console.error('[generate-topic-cards] JSON extraction failed. Raw:', rawText.slice(0, 500))
      return res.status(502).json({ error: 'Model returned malformed JSON — try again.' })
    }

    const cards = parsed?.cards
    if (!validateCards(cards)) {
      console.error('[generate-topic-cards] Schema validation failed:', JSON.stringify(cards)?.slice(0, 300))
      return res.status(502).json({ error: 'Model response did not match expected schema — try again.' })
    }

    const rows = cards.map(c => ({
      title:          c.title,
      brief:          c.brief,
      claims:         c.key_claims,
      sources:        c.sources,
      signal_summary: c.signal_summary,
      category:       c.category,
      prompt_version: PROMPT_VERSION,
      source_url:     c.source_url || null,
      feed_status:    'in_feed',
    }))

    const { error: insertError } = await supabase
      .from('topic_cards')
      .insert(rows)

    if (insertError) {
      console.error('[generate-topic-cards] Supabase insert error:', insertError)
      return res.status(500).json({ error: 'Failed to persist cards to database.' })
    }

    console.log('[generate-topic-cards] Cards inserted successfully.')
    return res.status(200).json({ cards })

  } catch (err) {
    console.error('[generate-topic-cards] Unexpected error:', err)
    return res.status(500).json({ error: err?.message || 'Unexpected server error.' })
  }
}
