# Ohm Neuro — V2 Refactor Spec

---

## What v2 changes (one paragraph)

Triage collapses from 4 actions (Draft / Support / Monitor / Exclude) to 3
(Draft / Soft-yes / Exclude). The never-built "edit context" modal is dropped —
instead, the system prompt assembles itself on every regenerate by layering the
fixed base prompt + rules learned from past reactions + a list of recently
surfaced titles so the model stops repeating itself. Duplicate detection is
prompt-level only, no extra DB work.

---

## Refined board (13 items)

| # | Feature | Status | v2 change |
|---|---------|--------|-----------|
| 1 | Schema migration (tier model + status + prompt versions) | 🔴 Top Priority | Tier model is now 3 tiers: Draft=1, Soft-yes=2, Exclude=null. Drop tier 3 (Monitor). Bump prompt_version to v2.0 |
| 2 | Locked base prompt + auto-assembled context (`buildPromptContext.mjs`) | 🔴 Top Priority | Reframed from "context block architecture" — context is now server-side, not a UI modal |
| 3 | ~~Inline context block editor (modal before Regenerate)~~ | ~~After #2~~ | **DROPPED** — logic folded into buildPromptContext.mjs |
| 4 | Reactions wiring — collapse to 3-action model (Draft / Soft-yes / Exclude) | 🟠 After #1 | Soft-yes is one-click (no panel). Exclude still has single-select qualifier panel |
| 5 | Regenerate debug (duplicate detection folded in) | 🟠 Paired with #2 | Dedup is a section inside buildPromptContext — no separate feature |
| 6 | Draft generation expansion (outline + LinkedIn + Twitter) | 🟠 After #3 | Unchanged — still Later |
| 7 | Pipeline View (structural — Drafted topics live here) | 🟠 After #4 | Unchanged |
| 8 | Archive Draft (replaces Undo flow) | 🔧 Active | Partially done in current code. Verify it still works after triage refactor |
| 9 | ~~Base prompt editor + version history UI~~ | ~~After #2~~ | **DROPPED** — base prompt is locked in code; dynamic context auto-assembles |
| 10 | Mobile interface fixes | 🟡 Parallel | Unchanged |
| 11 | Soft-yes → Draft linking (after 1–2 batches live) | 🟡 Queued | Renamed from "Support → Draft linking" |
| 12 | Surface linked Soft-yes on Draft cards | 🟡 Queued | Renamed from "Surface linked Support on Draft cards" |
| 13 | British news feed for Mark | 🟡 Parallel — last | Unchanged, separate stream |

---

## Goals

### Goal 1 — Prompt architecture becomes the source of truth

Every regenerate builds the system prompt from 3 layers:
1. `BASE_SYSTEM_PROMPT` — locked in `api/generate-topic-cards.mjs`
2. Learned rules — derived from recent `reactions` rows (e.g. editor excluded 6 cards in a category → deprioritize)
3. Recent titles — last 50 surfaced titles, injected as "do not repeat"

**Files:**
- **CREATE** `api/lib/buildPromptContext.mjs` — queries Supabase, returns assembled string
- **UPDATE** `api/generate-topic-cards.mjs` — import builder, call before Anthropic, pass result as system prompt, bump `PROMPT_VERSION` to `'v2.0'`, drop unused `category`/`context` params

---

### Goal 2 — Consolidate triage to 3 actions

| Action | One-click? | DB writes |
|--------|-----------|-----------|
| **Draft** | No — opens DraftPanel | `reactions(reaction: draft_queued, tier: 1)` + `topic_cards.feed_status = 'drafted'` |
| **Soft-yes** | **Yes** — immediate | `reactions(reaction: soft_yes, tier: 2)` — no feed_status change |
| **Exclude** | No — opens ExcludePanel | `reactions(reaction: exclude, tier: null)` + `topic_cards.feed_status = 'excluded'` |

**Files:**
- **UPDATE** `src/constants.js` — new `TIER_MAP` (3 tiers), delete `MONITOR_BUBBLES`
- **UPDATE** `src/components/TriageBtn.jsx` — drop `mon`/`supp` kinds, add `soft`
- **UPDATE** `src/components/TopicRow.jsx` — replace `handleSupport`/monitor logic with `handleSoftYes`, rename `TriagePanel` to `ExcludePanel`, update button rows to 3 buttons in both `TopicRow` and `TopicReader`
- **UPDATE** `src/utils/undo.js` — update `REACTION_DB_MAP` (add `soft`, drop `mon`)
- **UPDATE** `src/hooks/useTopicCards.js` — drop unused `category`/`context` params from `regenerate`

---

### Goal 3 — Duplicate detection at the prompt level

Handled entirely inside `buildPromptContext.mjs`. No separate feature, no DB schema change.

Add section to assembled prompt:

    ## Previously Surfaced — DO NOT REPEAT
    - [title 1]
    - [title 2]

Add one rule to `BASE_SYSTEM_PROMPT`:
"Skip any topic substantively similar to those listed under Previously Surfaced."

---

## File-by-file checklist

Work through in this order. Check each box when done.

### New files
- [ ] `api/lib/buildPromptContext.mjs`

### Updated files
- [ ] `api/generate-topic-cards.mjs`
- [ ] `src/constants.js`
- [ ] `src/components/TriageBtn.jsx`
- [ ] `src/components/TopicRow.jsx`
- [ ] `src/utils/undo.js`
- [ ] `src/hooks/useTopicCards.js`

### Delete
- [ ] `src/counter.js` (unused Vite boilerplate — nothing imports it)

### Do not touch
- `apps-script/Code.gs`
- `src/App.jsx`
- `src/components/ConfirmModal.jsx`
- `src/components/Sidebar.jsx`
- `src/components/ProgressRing.jsx`
- `src/components/RegenerateButton.jsx`
- `src/components/Logo.jsx`
- `src/tokens.js`
- `src/utils/helpers.js`
- `src/supabase.js`
- `vercel.json`
- `vite.config.js`
- `package.json`

---

## Sprint order

### Now
1. Goal 1 — create `buildPromptContext.mjs`, wire into `generate-topic-cards.mjs`
2. Goal 2 — 3-action triage across all files
3. Verify `regenerate` end-to-end with new prompt builder

### Next
4. Manual test: click Draft on a card, confirm Google Doc still creates and link appears
5. Start Pipeline View sidebar nav

### Later
6. Archive view — surface drafted/excluded topics
7. Mobile polish — `TopicRow` and `TopicReader` on narrow viewports

---

## How to verify each goal worked

**Goal 1**
- Click Regenerate
- Check Vercel function logs — you should see the assembled prompt with reactions + titles sections
- Run two batches back to back — second batch should not repeat titles from the first

**Goal 2**
- Each card shows exactly 3 buttons: Draft / Soft-yes / Exclude
- Soft-yes marks the card immediately with no panel opening
- Exclude opens the qualifier panel (single-select from the 5 options)
- Draft opens the notes panel (unchanged)
- Undo still works on all three

**Goal 3**
- Covered by Goal 1 verification above
