// ─────────────────────────────────────────────────────────────
// FILE: src/constants.js  (replace the existing file with this)
// Changes: adds TIER_MAP, FEED_STATUSES, EXCLUDE_QUALIFIERS
// Old BUBBLES for positive reactions replaced by tier model
// ─────────────────────────────────────────────────────────────

// ─── Pipeline status stages ───────────────────────────────────────────────────

export const STATUSES = [
  'Idea',
  'Under Review',
  'Selected for Batch',
  'Researching',
  'Drafting',
  'Editing',
  'Published',
]

// ─── Feed status (topics.feed_status) ────────────────────────────────────────

export const FEED_STATUSES = {
  IN_FEED:  'in_feed',
  DRAFTED:  'drafted',
  ARCHIVED: 'archived',
  EXCLUDED: 'excluded',
}

// ─── Tier model ───────────────────────────────────────────────────────────────
// Tier 1 = Draft (full piece), Tier 2 = Monitor (prompt feedback signal), null = Exclude

export const TIER_MAP = {
  1:    { label: 'Draft',   reaction: 'draft_queued', shortLabel: '✓ Draft'   },
  2:    { label: 'Monitor', reaction: 'soft_yes',     shortLabel: '✓ Monitor' },
  null: { label: 'Exclude', reaction: 'exclude',      shortLabel: '✗ Excluded' },
}

// ─── Exclude qualifier vocabulary (single-select) ────────────────────────────
// Confirmed decisions from migration spec

export const EXCLUDE_QUALIFIERS = [
  'Already covered',
  'Off-narrative',
  'Weak evidence',
  'Too niche',
  'Not relevant to audience',
]

// ─── External endpoints ───────────────────────────────────────────────────────

export const APPS_SCRIPT_URL =
  'https://hook.us2.make.com/5j7meq3tcrn96fvn9rgucjhq2x4uw0hs'

export const SHARED_FOLDER_URL =
  'https://drive.google.com/drive/folders/1WjzuRQNt7lt0Li2nyWvx9PQ3NQwlJmn-'
