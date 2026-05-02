-- Goal 1: Schema Migration
-- Run in Supabase SQL Editor → New Query → Run All
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS / DROP CONSTRAINT IF EXISTS

-- ── 1. Fix reactions.reaction CHECK constraint ────────────────────────────────
-- The old constraint blocks 'soft_yes'. Drop and replace with v2 vocabulary.

ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_check;

ALTER TABLE reactions
  ADD CONSTRAINT reactions_reaction_check
  CHECK (reaction IN (
    'draft_queued',   -- tier 1: Draft
    'soft_yes',       -- tier 2: Shortlist (was: supporting)
    'exclude',        -- tier null: Exclude
    'supporting',     -- legacy — kept for backward compat with existing rows
    'monitor'         -- legacy — kept for backward compat with existing rows
  ));


-- ── 2. Create prompt_versions table ──────────────────────────────────────────
-- Audit trail for every assembled system prompt sent to Anthropic.

CREATE TABLE IF NOT EXISTS prompt_versions (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  version_label       text        NOT NULL,           -- e.g. 'v2.0'
  prompt_text         text        NOT NULL,           -- full assembled prompt
  generated_at        timestamptz DEFAULT now(),
  batch_id            text,                           -- links to a topic_cards batch
  parent_version_id   uuid        REFERENCES prompt_versions(id),
  change_source       text        NOT NULL DEFAULT 'auto'
                      CHECK (change_source IN ('manual', 'auto'))
);

-- RLS: allow anon reads, service_role writes
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prompt_versions'
    AND policyname  = 'anon can read prompt_versions'
  ) THEN
    CREATE POLICY "anon can read prompt_versions"
      ON prompt_versions FOR SELECT TO anon USING (true);
  END IF;
END $$;


-- ── 3. Add prompt_version_id FK to topic_cards (nullable — backfill later) ───
-- Links each card batch to the exact prompt that generated it.

ALTER TABLE topic_cards
  ADD COLUMN IF NOT EXISTS prompt_version_id uuid REFERENCES prompt_versions(id);


-- ── 4. Partial unique index on source_url ────────────────────────────────────
-- Enables hard dedup: same source URL can't be surfaced twice.
-- Partial (WHERE NOT NULL) so multiple cards without a URL are still allowed.

CREATE UNIQUE INDEX IF NOT EXISTS topic_cards_source_url_unique
  ON topic_cards (source_url)
  WHERE source_url IS NOT NULL;


-- ── 5. Performance indexes ────────────────────────────────────────────────────

-- Feed query: ORDER BY created_at DESC LIMIT 10
CREATE INDEX IF NOT EXISTS idx_topic_cards_created_at
  ON topic_cards (created_at DESC);

-- Feed filter (Goal 7): WHERE feed_status = 'in_feed'
CREATE INDEX IF NOT EXISTS idx_topic_cards_feed_status
  ON topic_cards (feed_status);

-- buildPromptContext: reactions ORDER BY created_at DESC LIMIT 200
CREATE INDEX IF NOT EXISTS idx_reactions_created_at
  ON reactions (created_at DESC);

-- Join in buildPromptContext: reactions.topic_id → topic_cards
CREATE INDEX IF NOT EXISTS idx_reactions_topic_id
  ON reactions (topic_id);
