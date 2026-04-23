// ─── Config ───────────────────────────────────────────────────────────────────
// NOTE: Store sensitive values in Apps Script Project Properties, not here.
// Script Properties → SUPABASE_URL, SUPABASE_KEY, FOLDER_ID

const FOLDER_ID    = '1WjzuRQNt7lt0Li2nyWvx9PQ3NQwlJmn-'
const SUPABASE_URL = 'https://opwoaznzlcfxpwtrujse.supabase.co'
const SUPABASE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_KEY')

// ─── Main handler ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)

    if (data.action === 'delete' || (data.doc_url && !data.title)) {
      return handleDelete(data)
    }

    return handleCreate(data)

  } catch (err) {
    Logger.log('doPost error: ' + err.message)
    return jsonResponse({ error: err.message })
  }
}

// ─── Delete handler ───────────────────────────────────────────────────────────

function handleDelete(data) {
  if (data.doc_url) {
    const match = data.doc_url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    if (match) {
      try {
        DriveApp.getFileById(match[1]).setTrashed(true)
        Logger.log('Trashed file: ' + match[1])
      } catch (err) {
        Logger.log('Could not trash file (may already be deleted): ' + err.message)
      }
    }
  }
  return jsonResponse({ success: true, action: 'deleted' })
}

// ─── Create handler ───────────────────────────────────────────────────────────

function handleCreate(data) {
  const title    = data.title    || 'Untitled Draft'
  const brief    = data.brief    || ''
  const notes    = data.notes    || ''
  const topicId  = data.topic_id || ''
  const status   = data.status   || ''
  const category = data.category || ''
  const batchId  = data.batch_id || ''

  const doc  = DocumentApp.create(title)
  const body = doc.getBody()

  // Header
  const header = body.appendParagraph('OHM NEURO  ·  INTELLIGENCE V2')
  header.setFontSize(9).setForegroundColor('#6B6F67').setSpacingAfter(4)

  body.appendHorizontalRule()

  // Title
  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING1)
    .setSpacingBefore(16).setSpacingAfter(8)

  // Meta
  const meta = [status, category, batchId, 'Prompt v1.1'].filter(Boolean).join('  ·  ')
  body.appendParagraph(meta)
    .setFontSize(10).setForegroundColor('#6B6F67').setSpacingAfter(16)

  body.appendHorizontalRule()

  // Research Brief
  appendSection(body, 'RESEARCH BRIEF', brief || '—')

  // Draft Notes
  appendSection(body, 'DRAFT NOTES', notes || '(none)')

  // Outline
  body.appendParagraph('OUTLINE')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setSpacingBefore(4).setSpacingAfter(6)
  ;['Point 1', 'Point 2', 'Point 3'].forEach(pt => {
    body.appendParagraph(pt)
      .setGlyphType(DocumentApp.GlyphType.BULLET).setFontSize(11)
  })

  body.appendParagraph(' ').setSpacingAfter(8)
  body.appendHorizontalRule()

  // Sources
  body.appendParagraph('SOURCES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setSpacingBefore(16).setSpacingAfter(6)
  body.appendParagraph('Add sources here...').setForegroundColor('#9DA19A')

  // Editor Notes
  body.appendParagraph('EDITOR NOTES')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setSpacingBefore(16).setSpacingAfter(6)
  body.appendParagraph('Add editor notes here...').setForegroundColor('#9DA19A')

  doc.saveAndClose()

  // Move to shared folder
  const file   = DriveApp.getFileById(doc.getId())
  const folder = DriveApp.getFolderById(FOLDER_ID)
  file.moveTo(folder)
  Logger.log('Moved file to folder: ' + folder.getName())

  const docUrl = file.getUrl()

  // Write URL back to Supabase
  if (topicId) {
    UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/topics?id=eq.${topicId}`, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'return=minimal',
      },
      payload: JSON.stringify({ draft_doc_url: docUrl }),
    })
  }

  return jsonResponse({ url: docUrl, success: true })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function appendSection(body, heading, content) {
  body.appendParagraph(heading)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setSpacingBefore(16).setSpacingAfter(6)
  body.appendParagraph(content)
    .setFontSize(11).setSpacingAfter(16)
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

// ─── Manual test helpers ──────────────────────────────────────────────────────

function testFolder() {
  try {
    Logger.log('Folder found: ' + DriveApp.getFolderById(FOLDER_ID).getName())
  } catch (e) {
    Logger.log('Error: ' + e.message)
  }
}

function testMoveDoc() {
  const doc    = DocumentApp.create('TEST — delete me')
  const file   = DriveApp.getFileById(doc.getId())
  file.moveTo(DriveApp.getFolderById(FOLDER_ID))
  Logger.log('Test doc URL: ' + file.getUrl())
}
