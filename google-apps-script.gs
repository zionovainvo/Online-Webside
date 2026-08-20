const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Orders';

function doGet(e) {
  if (e.parameter.action !== 'orders') return jsonResponse({ ok: true });
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonResponse([]);
  return jsonResponse(values.slice(1).map(row => JSON.parse(row[1])));
}

function doPost(e) {
  const order = JSON.parse(e.postData.contents);
  const sheet = getSheet();
  const existingIds = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1)
    .getValues().flat();
  if (!existingIds.includes(order.id)) {
    sheet.appendRow([order.id, JSON.stringify(order), new Date(order.date)]);
  }
  return jsonResponse({ ok: true, id: order.id });
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(['Order ID', 'Order JSON', 'Created At']);
  return sheet;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}