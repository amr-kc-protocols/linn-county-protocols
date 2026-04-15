// ── Linn County EMS — Quiz Results Logger ────────────────────
// Paste this into Extensions > Apps Script in your Google Sheet.
// Then: Deploy > New Deployment > Web App
//   Execute as: Me
//   Who has access: Anyone
// Copy the deployment URL and paste it into SHEETS_URL in quiz.html.

var SHEET_NAME = 'Quiz Results';

var HEADERS = [
  'Timestamp',
  'Level',
  'Score',
  'Total',
  'Percent',
  'Grade',
  'Categories',
  'Missed Questions'
];

function doPost(e) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Create the sheet and add headers if it doesn't exist yet
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length)
           .setFontWeight('bold')
           .setBackground('#2C1810')
           .setFontColor('#D4A96A');
    }

    var data = JSON.parse(e.parameter.payload);

    sheet.appendRow([
      new Date(data.date),   // Timestamp
      data.level,            // EMT / AEMT / PARAMEDIC
      data.score,            // e.g. 35
      data.total,            // e.g. 40
      data.pct + '%',        // e.g. 88%
      data.grade,            // e.g. "Good — review missed items"
      data.cats,             // e.g. "Airway: 3/3, Cardiac: 5/6"
      data.missed            // Missed question text, pipe-separated
    ]);

    return ContentService
      .createTextOutput('OK')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    return ContentService
      .createTextOutput('Error: ' + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}
