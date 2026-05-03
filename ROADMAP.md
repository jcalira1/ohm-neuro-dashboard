# Ohm Neuro CMS — What's Been Built

**Stack:** React 19 · Vite · Supabase · Vercel · Anthropic Claude API · PubMed (NCBI) API  
**Last updated:** May 2026

---

## System Architecture

```
PubMed API → real papers (15 queries, scored by recency + RCT type)
     ↓
Triage reactions (past batches) → re-rank queries by editor preference
     ↓
Claude Sonnet → editorial layer (title, brief, key claims, signal summary)
     ↓
Supabase → topic_cards table → React feed
     ↓
Editor triages: Draft / Soft-yes / Exclude
     ↓
Make.com webhook → Google Doc created → draft_doc_url written back to Supabase
```

---

## Completed Features

### 1. Real Paper Sourcing (PubMed API)
- Replaced hallucinated AI-generated content with real published research
- Queries PubMed (NCBI) across 15 neuroscience topic areas per batch
- Each query returns up to 5 papers; best is selected by scoring: recency (+3 for 2023+, +2 for 2021+), publication type (RCT +3, meta-analysis +2, journal article +1), must have abstract + DOI
- `source_url` on every card is a verified `https://doi.org/...` link from PubMed — never from Claude

### 2. Triage-Aware Query Ranking
- Categories that editors have frequently **drafted** get their PubMed queries run first
- Categories that editors have **excluded 3+ times** are skipped entirely from the query set
- This means the system learns editorial preferences and adjusts what papers it fetches each batch — not just what Claude writes

### 3. Claude Editorial Layer
- Claude receives the real paper abstracts and writes: editorial title (reader-friendly, not the paper title), 2–3 sentence brief, 3 key claims with stats, signal summary (FULL PIECE or SUPPORTING REFERENCE)
- System prompt includes Ohm Neuro editorial mission, litmus test, and category taxonomy
- Dynamic context block is prepended: past drafted topics (Tier 1), soft-yes topics (Tier 2), and excluded topics — Claude uses these to calibrate tone, depth, and topic avoidance

### 4. Triage System (3-Action Model)
- **Draft** — opens notes panel, creates Google Doc, moves card to Pipeline
- **Soft-yes** — one-click, marks for monitoring, no panel
- **Exclude** — opens qualifier panel with reason selection
- All three are undoable
- Reactions stored in `reactions` table with correct FK to `topic_cards`

### 5. Google Docs Integration (Make.com)
- Drafting a card fires a webhook to Make.com
- Make creates a Google Doc from template, populates: title, brief, notes, key claims, signal summary, citation, source URL, category
- Doc is moved to OHM Neuro Drafts Google Drive folder
- `draft_doc_url` is written back to Supabase
- "Open Draft ↗" link appears on the card in both the feed and Pipeline view

### 6. Pipeline View
- Shows all drafted topic cards
- Expandable cards: click title to reveal key claims (numbered list), signal summary (highlighted), source type badges, Source ↗ link, Open Draft ↗ button
- Stat bar: total drafted + drafted this week

### 7. Prompt Inspector
- Two tabs: **PubMed Queries** (all 15 active search queries + scoring explanation) and **Claude Prompt** (full assembled system + user prompt per run)
- Timestamps each run, shows version label and change source
- Saved on every Regenerate to `prompt_versions` table

### 8. Collapsible Sidebar
- Desktop: sidebar collapses to hidden with a small re-expand tab at the edge
- Mobile: sidebar is a slide-in overlay with backdrop dismiss
- Hamburger button toggles collapse on desktop, opens overlay on mobile

### 9. Mobile Interface
- Compact header with stats displayed as inline pills (not 3-column grid)
- Regenerate button moves into the top bar row on mobile
- Touch targets meet 36px minimum
- Tighter padding throughout

### 10. Infrastructure
- Supabase-backed rate limiting on Regenerate (survives Vercel cold starts)
- RLS policy allowing anon key to UPDATE `topic_cards` (needed for feed_status changes)
- FK constraint corrected: `reactions_topic_id_fkey` → `topic_cards` (was pointing to deleted `topics` table)
- All API routes as Vercel serverless functions

---

## In Progress / Queued

| Item | Status | Notes |
|------|--------|-------|
| Soft-yes → Draft linking | Queued | Surface soft-yes cards as "related" when drafting a similar topic |
| Draft expansion (outline + LinkedIn + Twitter) | Queued | Auto-generate content variants from the brief |
| Surface linked soft-yes on Pipeline cards | Queued | Show related soft-yes entries alongside drafted cards |
| British news feed (Mark) | Queued | Separate editorial stream |

---

## Dropped

| Item | Reason |
|------|--------|
| Inline context block editor (pre-Regenerate modal) | Server-side context auto-assembles from reactions |
| Base prompt editor UI | Base prompt is locked in code; only dynamic layer changes |
