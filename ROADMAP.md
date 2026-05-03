# Ohm Neuro CMS — Project Roadmap

**Stack:** React 19 · Vite · Supabase · Vercel · Anthropic API · PubMed API

---

## Completed

### Intelligence Pipeline — Accuracy Overhaul
- **Real paper sourcing via PubMed API** — The system now fetches real, published neuroscience papers from PubMed (NCBI) before generating cards. Every topic card is grounded in an actual study with a verified DOI link. Eliminates hallucinated titles and fabricated source URLs.
- **Two-step generation pipeline** — Step 1: query PubMed across 15 neuroscience topic areas, score and select the best papers. Step 2: Claude writes the editorial layer (title, brief, key claims, signal summary) based on the real paper abstracts.
- **Verified source URLs** — `source_url` on every card is a real `https://doi.org/...` link pulled directly from PubMed, never from the model.

### Triage System (3-Action Model)
- **Draft / Soft-yes / Exclude** — Replaced the previous 4-action model with a cleaner 3-action triage: Draft (queues for Google Doc), Soft-yes (one-click monitor), Exclude (with qualifier reason).
- **Undo** — All three actions are undoable from the card.
- **Reaction persistence** — Reactions stored in `reactions` table with `topic_id` FK correctly pointing to `topic_cards`.

### Google Docs Integration (Make.com webhook)
- **Send to Docs** — Clicking Draft on a card fires a webhook to Make.com, which creates a Google Doc from a template and moves it to the OHM Neuro Drafts folder.
- **Draft link in feed** — After doc creation, `draft_doc_url` is written back to Supabase and the "Open Draft ↗" link appears on the card in the feed.
- **Template fields** — Doc template populated with: title, brief, notes, key claims, signal summary, citation, source URL, category.

### Prompt Intelligence
- **Auto-assembled context** — Every Regenerate builds a dynamic context block from recent reactions: Tier 1 (draft_queued), Tier 2 (soft_yes), and excluded topics — so the model learns from editorial decisions.
- **Dedup at prompt level** — Last 50 surfaced titles injected as "Previously Surfaced — DO NOT REPEAT" so the model never surfaces the same topic twice.
- **Prompt audit trail** — Every assembled prompt (system + user) is saved to `prompt_versions` table and viewable in the Prompt Inspector.

### Pipeline View
- Drafted topics surface in the Pipeline tab with category, date, brief, key claims, signal summary, and direct link to the Google Doc.

### Prompt Inspector
- Read-only view of every prompt sent to the model, with timestamp and version label.
- Shows both the Claude system prompt and the PubMed search queries used to source papers.

### Infrastructure
- **Supabase-backed rate limiting** — Regenerate is rate-limited via `api_rate_limits` table, survives Vercel cold starts.
- **FK constraint fix** — `reactions_topic_id_fkey` corrected to point to `topic_cards` (was pointing to an old `topics` table).
- **RLS policy** — Added anon UPDATE policy on `topic_cards` so feed status updates work correctly.
- **Vercel serverless** — All API routes deployed as Vercel edge functions.

---

## In Progress

| # | Item | Notes |
|---|------|-------|
| 10 | Mobile interface polish | Touch targets, typography, layout on narrow viewports |
| 11 | Soft-yes → Draft linking | Surface soft-yes cards as "related" when drafting a similar topic |

---

## Queued

| # | Item | Notes |
|---|------|-------|
| 6  | Draft expansion (outline + LinkedIn + Twitter) | Auto-generate content variants from the brief |
| 12 | Surface linked Soft-yes on Draft cards | Show related soft-yes cards on pipeline entries |
| 13 | British news feed for Mark | Separate editorial stream |

---

## Dropped

| Item | Reason |
|------|--------|
| Inline context block editor (modal before Regenerate) | Logic folded into `buildPromptContext.mjs` server-side |
| Base prompt editor + version history UI | Base prompt is locked in code; dynamic context auto-assembles |
