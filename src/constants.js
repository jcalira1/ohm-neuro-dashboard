// ─── Workflow constants ────────────────────────────────────────────────────────

export const STATUSES = [
  'Idea',
  'Under Review',
  'Selected for Batch',
  'Researching',
  'Drafting',
  'Editing',
  'Published',
]

// ─── Triage reason bubbles ────────────────────────────────────────────────────

export const BUBBLES = {
  up: [
    'Strong evidence base',
    'Emerging trend',
    'High audience relevance',
    'Unique angle',
    'Timely topic',
  ],
  down: [
    'Already covered',
    'Too niche',
    'Weak evidence',
    'Not relevant to audience',
    'Too broad',
  ],
  exclude: [
    'Not relevant to our audience',
    'Already covered this',
    'No credible evidence',
    'Not aligned with our editorial angle',
    'Low quality source',
  ],
}

// ─── External endpoints ───────────────────────────────────────────────────────

export const APPS_SCRIPT_URL =
  'https://hook.us2.make.com/5j7meq3tcrn96fvn9rgucjhq2x4uw0hs'

export const SHARED_FOLDER_URL =
  'https://drive.google.com/drive/folders/1WjzuRQNt7lt0Li2nyWvx9PQ3NQwlJmn-'
