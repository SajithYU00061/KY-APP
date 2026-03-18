/**
 * KY活動表 — Google Apps Script Backend
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com → New Project
 * 2. Paste this entire file, replacing the default code
 * 3. Change SPREADSHEET_ID below to your Google Sheet ID
 *    (The ID is in the URL: docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
 * 4. Click Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Click Deploy, copy the Web App URL
 * 6. Paste that URL into app.html where it says GOOGLE_SCRIPT_URL
 */

// ── CONFIG ────────────────────────────────────────────────────────
const SPREADSHEET_ID = '1kujFwgFG1jAbTcwJucqm8ZLG3J_jPo_BXhDAQz8gIFhSukErZj8NlfeM'; // ← Change this!
const SHEET_NAME     = 'KY記録';                    // Sheet tab name
// ──────────────────────────────────────────────────────────────────

// ── ANTHROPIC API KEY ─────────────────────────────────────────────
// Set this in Project Settings → Script Properties:
//   Key: ANTHROPIC_API_KEY   Value: sk-ant-xxxx...
// ──────────────────────────────────────────────────────────────────

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const data = JSON.parse(e.postData.contents);

    // ── AI PROXY REQUEST ────────────────────────────────────────
    if (data.type === 'ai_chat') {
      const result = callClaude(data.system, data.message);
      output.setContent(JSON.stringify({ status: 'ok', response: result }));
      return output;
    }

    // Handle batch submissions (offline queue)
    const records = Array.isArray(data) ? data : [data];
    let appended = 0;

    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet   = ss.getSheetByName(SHEET_NAME);

    // Create sheet with headers if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      writeHeaders(sheet);
    } else if (sheet.getLastRow() === 0) {
      writeHeaders(sheet);
    }

    records.forEach(record => {
      appendRecord(sheet, record);
      appended++;
    });

    output.setContent(JSON.stringify({ status: 'ok', appended }));
  } catch (err) {
    output.setContent(JSON.stringify({ status: 'error', message: err.toString() }));
  }

  return output;
}

// Handle preflight OPTIONS (CORS)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'KY活動表 API running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeHeaders(sheet) {
  const headers = [
    '提出日時', '日付', '曜日', '現場名', '会社名', 'リーダー', '確認者', '作業内容', 'ワンポイント',
    '危険①ポイント', '重篤度①', '可能性①', '危険度①', '対策①', '再評価①',
    '危険②ポイント', '重篤度②', '可能性②', '危険度②', '対策②', '再評価②',
    '危険③ポイント', '重篤度③', '可能性③', '危険度③', '対策③', '再評価③',
    '体調', '服装', '保護具', '作業把握',
    '参加者①', '参加者②', '参加者③', '参加者④', '参加者⑤', '参加者⑥',
    '参加者⑦', '参加者⑧', '参加者⑨', '参加者⑩',
  ];
  sheet.appendRow(headers);

  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#0f3460');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // Set column widths
  sheet.setColumnWidth(1, 140);  // 提出日時
  sheet.setColumnWidth(2, 90);   // 日付
  sheet.setColumnWidth(4, 200);  // 現場名
  sheet.setColumnWidth(8, 250);  // 作業内容
  [10,15,20].forEach(c => sheet.setColumnWidth(c, 200)); // hazard points
  [14,19,24].forEach(c => sheet.setColumnWidth(c, 200)); // countermeasures
}

function appendRecord(sheet, r) {
  const checks  = r.checks  || {};
  const hazards = r.hazards || [];
  const parts   = r.participants || [];

  const chkLabel = v => v === 'good' ? '○良い' : v === 'bad' ? '×悪い' : '未記入';

  const riskScore = (h) => {
    const a = h.severity, b = h.possibility;
    return (a && b) ? a * b : '';
  };

  const row = [
    new Date(),                           // 提出日時 (auto timestamp)
    r.date         || '',                 // 日付
    r.dayOfWeek    || '',                 // 曜日
    r.siteName     || '',                 // 現場名
    r.company      || '',                 // 会社名
    r.leader       || '',                 // リーダー
    r.supervisor   || '',                 // 確認者
    r.workContent  || '',                 // 作業内容
    r.todayPoint   || '',                 // ワンポイント
    // Hazard 1
    (hazards[0] || {}).point         || '',
    (hazards[0] || {}).severity      || '',
    (hazards[0] || {}).possibility   || '',
    riskScore(hazards[0] || {}),
    (hazards[0] || {}).countermeasure || '',
    (hazards[0] || {}).reeval        || '',
    // Hazard 2
    (hazards[1] || {}).point         || '',
    (hazards[1] || {}).severity      || '',
    (hazards[1] || {}).possibility   || '',
    riskScore(hazards[1] || {}),
    (hazards[1] || {}).countermeasure || '',
    (hazards[1] || {}).reeval        || '',
    // Hazard 3
    (hazards[2] || {}).point         || '',
    (hazards[2] || {}).severity      || '',
    (hazards[2] || {}).possibility   || '',
    riskScore(hazards[2] || {}),
    (hazards[2] || {}).countermeasure || '',
    (hazards[2] || {}).reeval        || '',
    // Checks
    chkLabel(checks.condition),
    chkLabel(checks.attire),
    chkLabel(checks.ppe),
    chkLabel(checks.workUnderstanding),
    // Participants (up to 10)
    parts[0]||'', parts[1]||'', parts[2]||'', parts[3]||'', parts[4]||'',
    parts[5]||'', parts[6]||'', parts[7]||'', parts[8]||'', parts[9]||'',
  ];

  sheet.appendRow(row);

  // Color-code risk scores
  const lastRow = sheet.getLastRow();
  colorRiskCell(sheet, lastRow, 13); // Hazard 1 risk score (col M = 13)
  colorRiskCell(sheet, lastRow, 19); // Hazard 2 risk score (col S = 19)
  colorRiskCell(sheet, lastRow, 25); // Hazard 3 risk score (col Y = 25)

  // Alternate row shading
  if (lastRow % 2 === 0) {
    sheet.getRange(lastRow, 1, 1, sheet.getLastColumn())
         .setBackground('#f0f4f8');
  }
}

function colorRiskCell(sheet, row, col) {
  const cell  = sheet.getRange(row, col);
  const score = cell.getValue();
  if (!score) return;
  if      (score >= 15) { cell.setBackground('#fecaca'); cell.setFontColor('#dc2626'); cell.setFontWeight('bold'); }
  else if (score >= 9)  { cell.setBackground('#fed7aa'); cell.setFontColor('#ea580c'); cell.setFontWeight('bold'); }
  else                  { cell.setBackground('#bbf7d0'); cell.setFontColor('#16a34a'); }
}

// ── CLAUDE AI PROXY ───────────────────────────────────────────────
function callClaude(systemPrompt, userMessage) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
    if (!apiKey) return 'APIキーが設定されていません。Script PropertiesにANTHROPIC_API_KEYを設定してください。';

    const payload = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', options);
    const json = JSON.parse(response.getContentText());

    if (json.content && json.content[0]) {
      return json.content[0].text;
    }
    return 'AIからの応答がありませんでした。';
  } catch (err) {
    return 'エラー: ' + err.toString();
  }
}
