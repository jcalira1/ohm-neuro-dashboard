# Ohm Neuro — Sprint Roadmap

Full 10-goal roadmap. Goals 1–4 from the v2 refactor are reflected here
with updated context. See OHM_NEURO_V2_REFACTOR.md for the completed
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
🟠 PAIRED WITH #2 — verify after Goals 1 and 2

Context: Regenerate was producing no new topics on click despite credits
being live. Tightly linked to Goal 2 — rebuilding prompt architecture
should expose the failure point. Duplicate detection is handled in Goal 2,
not here.

Diagnostic checklist
- Confirm API call is firing — Network tab on Regenerate click
- Confirm Anthropic returns 200 with valid card payload — log raw response
- Confirm schema validation isn't silently rejecting the payload
- Confirm Supabase insert succeeds — check topic_cards for new rows after click
- Confirm feed query (ORDER BY created_at DESC LIMIT 10) picks up new batch
- Verify model string is current (claude-sonnet-4-6)

Rate-limit fix
- Move rate-limiting off in-memory lastRequestTime — Vercel cold starts wipe it
- Replace with Supabase table api_rate_limits tracking last_called_at
- Distinguish our 429 from Anthropic's 429 in the error toast

Done when
- Cold start → Regenerate works first try
- Regenerate twice → no overlap in titles across batches

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
🟠 NEXT — after Goal 4

Context: Structurally required. Drafted topics exit the feed and live in
the pipeline. Without this view, Drafted cards disappear and the workflow
breaks.

New view: src/views/PipelineView.jsx
- Wire to Pipeline SOON tag in Sidebar.jsx
- Status columns: Drafted → Editing → Published
- Simple list per column — tap to open linked Doc
- Filter: topics.status = 'drafted' and downstream

Feed filter update
- Default feed excludes status = 'drafted'
- Default feed includes status = 'in_feed' + Soft-yes tagged topics
- Excluded topics never appear (enforced via status = 'excluded')

Done when
- Draft a topic → exits feed, appears in Pipeline under Drafted
- Sidebar SOON tag replaced with active link

---

## Goal 8 — Archive Draft (replaces Undo flow)
🔧 PARTIALLY DONE — verify after Goal 4

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
