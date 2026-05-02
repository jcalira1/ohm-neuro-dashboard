# Ohm Neuro Dashboard

React 19 + Vite + Supabase + Vercel. Editors triage AI-generated
neuroscience topic cards into Draft / Soft-yes / Exclude. Approved
drafts ship to Google Docs via Apps Script / Make webhook.

## Active refactor: v2
See OHM_NEURO_V2_REFACTOR.md for the full spec and file checklist.

## Currently working on
- [x] Goal 1: Prompt architecture — create `api/lib/buildPromptContext.mjs`, wire into `api/generate-topic-cards.mjs`
- [x] Goal 2: 3-action triage — update `src/constants.js`, `src/components/TopicRow.jsx`, `src/components/TriageBtn.jsx`, `src/utils/undo.js`
- [x] Goal 3: Dedup at prompt level — folded into Goal 1 (handled inside buildPromptContext)

## Stack
- React 19, no TypeScript, `.jsx` files only
- Inline styles using `OHM` tokens from `src/tokens.js`
- Supabase client in `src/supabase.js`
- API routes in `/api/` as Vercel serverless functions
- Apps Script untouched — `apps-script/Code.gs` is not part of v2

## Conventions
- All styles inline, never external CSS classes (except `src/index.css` for globals)
- Token reference: `OHM.primary`, `OHM.sage`, `OHM.roseInk`, etc.
- Category colors from `CAT_STYLE` in `src/tokens.js`
- Supabase tables: `topic_cards`, `reactions`
- `prompt_version` on all new reaction inserts should be `'v2.0'`
- New `reactions.reaction` values: `draft_queued` | `soft_yes` | `exclude`
