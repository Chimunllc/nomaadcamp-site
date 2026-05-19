/**
 * NOMAAD Quote Log — onEdit trigger
 * =================================================================
 * Зорилго: Quote Log Sheet-ийн "Төлөв" багана өөрчлөгдөх үед n8n-руу
 *          шууд POST хүсэлт явуулж, polling API call хэмнэх.
 *
 *   • Төлөв = ИЛГЭЭХ  →  WF2 (nomaad-quote-send)     → Customer Gmail draft
 *   • Төлөв = ГЭРЭЭ   →  WF3 (nomaad-contract-trigger) → Гэрээний Doc
 *
 * SETUP (1 удаа):
 * --------------------------------------------------------
 * 1. Quote Log Sheet нээх:
 *    https://docs.google.com/spreadsheets/d/16pHiShilnG-QdZtc2ciB5JeP_aslZRcqpQqEJvD-0wA
 * 2. Extensions → Apps Script
 * 3. Default `Code.gs`-ийг устгаад энэ файлын агуулгыг бүхэлд хуулах
 * 4. 💾 Save → нэр "NOMAAD onEdit"
 * 5. Зүүн талын ⏰ Triggers → "+ Add Trigger":
 *      • Function: onEdit
 *      • Event source: From spreadsheet
 *      • Event type: On edit
 *      • Failure notify: weekly
 *    → Save → Google нэвтрэх асуувал Allow
 * 6. Бэлэн — Sheets дээр Төлөв сольж туршаарай
 * =================================================================
 */

const N8N_BASE = 'https://chimunllc.app.n8n.cloud/webhook';
const WEBHOOK_SEND     = N8N_BASE + '/nomaad-quote-send';        // WF2
const WEBHOOK_CONTRACT = N8N_BASE + '/nomaad-contract-trigger';  // WF3

const SHEET_NAME       = 'Quote log';  // sheet нэр — case-sensitive
const STATUS_COL_NAME  = 'Төлөв';
const ID_COL_NAME      = 'Үнийн саналын дугаар';

function onEdit(e) {
  console.log('[onEdit] CALLED');
  try {
    if (!e || !e.range) { console.log('[onEdit] No event range, exit'); return; }

    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    console.log('[onEdit] Sheet:', sheetName, '| Row:', e.range.getRow(), '| Col:', e.range.getColumn(), '| Value:', JSON.stringify(e.value));

    if (sheetName !== SHEET_NAME) { console.log('[onEdit] Wrong sheet, exit'); return; }
    if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) { console.log('[onEdit] Multi-cell edit, exit'); return; }

    const row = e.range.getRow();
    if (row < 2) { console.log('[onEdit] Header row, exit'); return; }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
                         .getValues()[0];
    const statusCol = headers.indexOf(STATUS_COL_NAME) + 1;
    const idCol     = headers.indexOf(ID_COL_NAME) + 1;
    console.log('[onEdit] statusCol:', statusCol, '| idCol:', idCol);
    if (!statusCol || !idCol) { console.log('[onEdit] Column not found in headers, exit'); return; }

    if (e.range.getColumn() !== statusCol) { console.log('[onEdit] Not status column, exit'); return; }

    const newStatus = String(e.value || '').trim();
    const quoteId   = String(sheet.getRange(row, idCol).getValue() || '').trim();
    console.log('[onEdit] newStatus:', JSON.stringify(newStatus), '| quoteId:', quoteId);
    if (!quoteId) { console.log('[onEdit] No quote ID, exit'); return; }

    if (newStatus === 'ИЛГЭЭХ') {
      console.log('[onEdit] Calling WF2 webhook…');
      callWebhook_(WEBHOOK_SEND, sheet, row, headers, 'WF2 (Gmail draft)');
    } else if (newStatus === 'ГЭРЭЭ') {
      console.log('[onEdit] Calling WF3 webhook…');
      callWebhook_(WEBHOOK_CONTRACT, sheet, row, headers, 'WF3 (гэрээ үүсгэх)');
    } else {
      console.log('[onEdit] Status not ИЛГЭЭХ/ГЭРЭЭ, skipped');
    }
  } catch (err) {
    console.error('NOMAAD onEdit алдаа:', err && err.stack ? err.stack : err);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Алдаа: ' + (err && err.message ? err.message : err),
      'NOMAAD',
      10
    );
  }
}

/**
 * Webhook руу мөрийн бүх багана JSON-р POST хийх
 */
function callWebhook_(url, sheet, row, headers, label) {
  const values = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
  const body = {};
  for (let i = 0; i < headers.length; i++) {
    let v = values[i];
    // Огнооны object → ISO string
    if (v instanceof Date) v = v.toISOString();
    // Стринг бол зай арилгана (n8n IF яг таарч ажиллахын тулд)
    if (typeof v === 'string') v = v.trim();
    body[headers[i]] = v;
  }

  console.log('[callWebhook_] URL:', url);
  console.log('[callWebhook_] body keys:', Object.keys(body).join(','));

  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
    followRedirects: true,
  });
  const code = resp.getResponseCode();
  const respBody = resp.getContentText().slice(0, 300);
  const quoteId = body[ID_COL_NAME];
  console.log('[callWebhook_] Response code:', code);
  console.log('[callWebhook_] Response body:', respBody);

  if (code >= 200 && code < 300) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      quoteId + ' → ' + label + ' илгээгдсэн',
      'NOMAAD',
      6
    );
  } else {
    throw new Error(label + ' алдаа ' + code + ': ' + respBody);
  }
}

/**
 * MENU — гар ажиллагаа
 * "NOMAAD" гэдэг menu гарч ирнэ, тэндээс сонгосон мөрөнд webhook
 * дахин дуудаж болно (туршилт хийх эсвэл алдаа гарсан үед re-try).
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NOMAAD')
    .addItem('Сонгосон мөрд: Quote дахин илгээх (WF2)', 'menuResend_')
    .addItem('Сонгосон мөрд: Гэрээ дахин үүсгэх (WF3)', 'menuRegenContract_')
    .addToUi();
}

function menuResend_() {
  triggerManually_(WEBHOOK_SEND, 'WF2 (Gmail draft)');
}

function menuRegenContract_() {
  triggerManually_(WEBHOOK_CONTRACT, 'WF3 (гэрээ үүсгэх)');
}

function triggerManually_(url, label) {
  const sel = SpreadsheetApp.getActiveSheet().getActiveRange();
  const row = sel.getRow();
  const sheet = sel.getSheet();
  if (sheet.getName() !== SHEET_NAME) {
    SpreadsheetApp.getUi().alert('Quote Log таб дотроос сонгоно уу.');
    return;
  }
  if (row < 2) {
    SpreadsheetApp.getUi().alert('Header биш мөр сонгоно уу.');
    return;
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  callWebhook_(url, sheet, row, headers, label);
}
