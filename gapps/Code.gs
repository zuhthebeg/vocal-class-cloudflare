// Google Apps Script example: doPost handler to append attendance to a Google Sheet
// 1) Create a new Apps Script project and paste this code.
// 2) Set `SHEET_ID` to your Google Sheet ID and deploy as Web App (Anyone, even anonymous) or require auth.

const SHEET_ID = 'YOUR_SHEET_ID_HERE'; // replace with your sheet id
const SHEET_NAME = 'attendance';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    // Ensure header
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['sessionId', 'studentName', 'timestamp', 'signature']);
    }

    sheet.appendRow([payload.sessionId || '', payload.student || payload.studentName || '', payload.timestamp || new Date().toISOString(), payload.signature || '']);

    return ContentService.createTextOutput(JSON.stringify({ok: true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
