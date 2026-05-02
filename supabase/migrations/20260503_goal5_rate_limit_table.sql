-- Goal 5: Persistent rate limit table
-- Replaces in-memory lastRequestTime which Vercel cold starts wipe.
-- Run in Supabase SQL Editor → New Query → Run All

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key            text        PRIMARY KEY,
  last_called_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
-- No anon policy — only service_role accesses this table

-- Seed the row so the first check always has something to read
INSERT INTO api_rate_limits (key, last_called_at)
VALUES ('generate_topic_cards', '2000-01-01 00:00:00+00')
ON CONFLICT (key) DO NOTHING;
