# Ohm Neuro — Sprint Roadmap

Goals 1–5 complete. New Goals 5A and 5B inserted after successful first
live generation run (2026-05-03). See OHM_NEURO_V2_REFACTOR.md for
implementation detail on Goals 2 and 4.

---

## Status legend
🔴 Top Priority · 🟠 Sequenced · 🔧 Active · 🟡 Queued / Parallel · ✅ Done · ~~Dropped~~

---

## Goal 1 — Schema migration (tier model + status + prompt versions)
🔴 TOP PRIORITY

Context: Foundation for everything else. The tier model collapses the old
scoring approach — no weights, no per-bubble vocabulary. The DB needs to
support tier-based persistence and a clean separation between locked base
prompts and auto-assembled context.

Schema changes
- Add tier column to reactions — values: 1 (Draft), 2 (Soft-yes), null (Exclude). Tier 3 (Monitor) is dropped.
- Add status column to topics — values: in_feed (default), drafted, archived, excluded
- New table prompt_versions: id, version_label, prompt_text, generated_at, batch_id, parent_version_id, change_source (enum: manual | auto)
- Add prompt_version_id FK on each topic_cards row
- Add source_url column to topic_cards with unique constraint (enables hard dedup)
- Bump prompt_version to v2.0 on all new reaction inserts

Decisions to confirm before migration runs
- Soft-delete for Exclude via status: excluded (recommended) — avoids resurfacing same source_url
- Confirm Exclude qualifier vocabulary: Already covered · Off-narrative · Weak evidence · Too niche · Not relevant to audience (single-select)

Done when
- Migration runs cleanly on Supabase, existing data preserved
- Old vote_direction and reaction string columns deprecated
- New columns indexed appropriately (status, source_url, prompt_version_id)

---

## Goal 2 — Locked base prompt + auto-assembled context (buildPromptContext.mjs)
✅ DONE (v2 refactor)

Context: BASE_SYSTEM_PROMPT is locked in code. On every regenerate,
buildPromptContext.mjs assembles a dynamic context block from recent
reactions and recently surfaced titles. No UI editor — fully server-side.
Full fired prompt is saved to prompt_versions for traceability.

What shipped
- api/lib/buildPromptContext.mjs — pure function, queries Supabase, returns assembled context string
- api/generate-topic-cards.mjs — updated to call builder, pass assembled prompt, bumped PROMPT_VERSION to v2.0
- Duplicate detection folded in — "Previously Surfaced" section injected into every prompt
- Legacy reaction values (supporting, monitor) treated as positive signal for backward compatibility

---

## Goal 3 — ~~Inline context block editor (modal before Regenerate)~~
~~🟠 After #2~~ → ✅ DROPPED

Context: Logic folded into buildPromptContext.mjs. Context assembles
server-side automatically. No UI modal needed or planned.

---

## Goal 4 — Reactions wiring — 3-action model (Draft / Soft-yes / Exclude)
✅ DONE (v2 refactor)

What shipped
- TopicRow.jsx and TopicReader: 3 buttons only — Draft / Soft-yes / Exclude
- Soft-yes: one-click, no panel, tier: 2, topic stays in feed
- Exclude: single-select qualifier panel, 5 reasons, tier: null
- Draft: DraftPanel unchanged, tier: 1, status → drafted
- TriageBtn.jsx: mon/supp kinds removed, soft added
- undo.js: REACTION_DB_MAP updated for 3-action model
- MONITOR_BUBBLES deleted from constants.js
- vote_direction no longer written on new reactions

---

## Goal 5 — Regenerate debug
✅ DONE (2026-05-03)

What shipped
- Supabase-backed rate limit table (api_rate_limits) — survives Vercel cold starts
- Row-by-row insert fallback if bulk insert fails — generated cards not lost
- Switched upsert → insert (partial unique index on source_url incompatible with ON CONFLICT)
- Hardcoded correct Supabase URL in API — no longer depends on VITE_SUPABASE_URL env var
- Exposed real Supabase error code in toast for faster diagnosis

---

## Goal 5A — Card reader metadata completeness
🔴 NEXT — cards are live, editors need to verify content before triaging

Context: The expanded card view currently shows only title and brief.
Editors have no way to verify the research is legitimate before triaging
(no source link, incomplete "About this piece", no study-type signal).
This is a trust and usability gap that blocks real editorial use.

Reader view — add or complete
- Source link: clickable URL to the original article/paper for verification.
  Model currently returns source_url: null — update prompt to request a real
  DOI or journal URL, and surface it in the reader as "View source ↗"
- Sources list: already stored in DB as sources[] array (journal, author, year)
  — render it properly in the reader instead of leaving it blank
- Study type badge: surface from the sources[].type field (peer-reviewed /
  preprint / meta-analysis / RCT) as a small label next to the category chip
- Key claims: already stored as claims[] in DB — render as a bullet list in
  the reader under the brief, replacing the empty "About this piece" section
- Signal summary: already stored in DB as signal_summary — show it as the
  editorial rationale line ("Why this matters for Ohm Neuro")
- Category chip: display in reader header (already on feed card, missing in reader)
- Prompt version + batch date: small footer meta line for internal traceability

Prompt update (paired)
- Add instruction to return a real source_url (DOI or journal page) on each card
- If no verifiable URL exists, return null — do not hallucinate URLs
- Tighten sources[].type enum: peer-reviewed | preprint | meta-analysis | RCT | review

Done when
- Open any card → see source link, claims list, study type, signal summary
- Source link is real and opens the correct paper/article
- "About this piece" section is fully populated, not blank

---

## Goal 5B — Category taxonomy expansion
🟠 AFTER 5A — affects both prompt and UI category colours

Context: Current category list in BASE_SYSTEM_PROMPT is too coarse (6 buckets).
Editors and downstream content planning need finer-grained signal. Expand to
a richer controlled vocabulary that maps to real editorial verticals.

Prompt update (api/generate-topic-cards.mjs)
- Replace the current 6-category list with the expanded taxonomy below
- Model must return exactly one category string per card from this list
- Add the list to BASE_SYSTEM_PROMPT and to the USER_PROMPT schema comment

Expanded category list (controlled vocabulary)
Clinical & Psychiatric | Intervention & Neuromodulation |
Lifestyle, Systems & Optimization | Psychedelics & Novel Therapeutics |
Emerging & Frontier | Cognitive Performance | Attention & Modern Brain |
Longevity & Brain Ageing | Mental Resilience | Neurotechnology |
Neurorehabilitation | AI & Machine Learning | Behavioral Intervention |
Behavioral Psychology | Biological Pathways | Brain-Computer Interfaces |
Cognitive Assessment | Cognitive Reserve | Decision Making |
Dementia Prevention | Diagnostics | Mental Health & Well-Being | Nutrition |
Preventive Medicine | Public Policy | Stress & Autonomic Nervous System |
Wearables & Digital Biomarkers | Dementia | Rehabilitation | Neuroplasticity

UI update (src/tokens.js — CAT_STYLE)
- Add colour entries for each new category (can group similar ones)
- Fall back to a neutral grey for any unrecognised category string

Done when
- Generated cards surface fine-grained categories from the expanded list
- All categories render with a colour chip in feed and reader views
- No "unknown category" grey chips appear for standard taxonomy entries

---

## Goal 6 — Draft generation expansion (outline + LinkedIn + Twitter)
🟠 LATER — after core loop is stable

Context: When a topic is Drafted, expand the API call to produce the
research outline + a LinkedIn draft + a Twitter/X draft in one shot.
Token cost is similar whether the model writes one section or four.
Out of scope for v2 — revisit after Goals 1–5 are stable.

New API route: api/generate-draft.mjs
- Inputs: topic_id (pulls title + brief), user notes from Draft panel
- Single Anthropic call returns: { outline: [...], linkedin_draft, twitter_draft }
- Source URL pulled from topic, embedded directly

Prompt constraints (co-iterate with David)
- Preserve editorial voice, lead with strongest outline point
- LinkedIn ≈ 1200 chars · Twitter ≈ 280 chars

Update apps-script/Code.gs
- Add LinkedIn Draft and Twitter/X Draft sections to Doc template
- Source URL as clickable link in meta line

Done when
- Click Draft → Doc opens with all four sections within ~15s
- Failure modes surface a clear inline error, no orphaned Doc

---

## Goal 7 — Pipeline View (Drafted topics live here)
✅ DONE (2026-05-03)

What shipped
- src/views/PipelineView.jsx — loads feed_status = 'drafted', shows category, date, brief, Open Draft link
- Feed filter fixed: useTopicCards now queries .eq('feed_status', 'in_feed') — drafted/excluded cards exit the feed
- Sidebar Pipeline item is now a live nav link (SOON tag removed), active state synced to view
- App.jsx routes between 'feed' and 'pipeline' via activeView state — no router dependency needed

---

## Goal 8 — Archive Draft (replaces Undo flow)
✅ DONE — verified 2026-05-03

Context: Archive path already exists in codebase (keepNotes flow in
undo.js, conditional "Archive Draft" label in TopicRow). Verify it
still works correctly after the v2 triage refactor before marking done.

Verification checklist
- Draft a topic → Archive → card exits feed, Doc remains in Drive
- Supabase row shows status: archived, doc_url retained
- Archived topics do not appear in default feed view
- ConfirmModal still appears before archiving
- keepNotes checkbox still saves draft_notes to localStorage correctly

Acceptance criteria
- Archive sets status to archived in Supabase
- Card re-renders immediately — triage buttons return, "Open Draft ↗" disappears
- Google Doc is NOT deleted
- Action is idempotent

---

## Goal 9 — ~~Base prompt editor + version history UI~~
~~🟡 After #2~~ → ✅ DROPPED

Context: BASE_SYSTEM_PROMPT is locked in code. Dynamic context
auto-assembles via buildPromptContext.mjs. No UI editor needed.
Audit trail lives in prompt_versions table, readable from Supabase.
Only revisit if there is a future need to edit the base prompt through
the UI instead of code.

---

## Goal 10 — Mobile interface fixes
🟡 PARALLEL — audit after Goal 4 first

Context: Primary use is mobile. Current rendering pinches feed text and
hides triage buttons. After v2 triage refactor, the button row shrinks
from 4 to 3 buttons — audit first before making any changes, as some
issues may resolve naturally.

Feed card fixes (if still needed after audit)
- Reduce horizontal padding to 12px below 640px
- Drop title font from 21px to 18px on mobile
- Drop index column width from 36px to 24px on mobile
- Lift isMobile state into a useMediaQuery hook

Reader view fixes (if still needed after audit)
- Verify 3-button row renders cleanly on narrow screens
- Fix "Open Draft" button clipping on flex-wrap narrow screens

Done when
- Feed on phone → text near full screen-width, no pinching
- All 3 triage buttons visible without scrolling on iPhone SE viewports

---

## Queued (after core loop ships)

**11. Soft-yes → Draft linking** (renamed from Support → Draft linking)
After 1–2 batches live. Link related Soft-yes cards to a primary Draft.

**12. Surface linked Soft-yes on Draft cards**
Show related Soft-yes topics on the Draft card in Pipeline View.

**13. British news feed for Mark**
Separate stream, parallel to main feed. Unrelated to v2.
