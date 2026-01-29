// Google Apps Script Code
// 1. Go to https://script.google.com/
// 2. Create a new project.
// 3. Paste this code into "Code.gs".
// 4. Click "Deploy" -> "New deployment".
// 5. Select type: "Web app".
// 6. Description: "FF Event Tracker".
// 7. Execute as: "Me".
// 8. Who has access: "Anyone".
// 9. Click "Deploy".
// 10. Copy the "Web app URL" and provide it to the website script.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName('Events');

    if (!sheet) {
      sheet = doc.insertSheet('Events');
      // Headers
      sheet.appendRow(['Timestamp', 'Region', 'Title', 'Start Date', 'End Date', 'Banner URL', 'Details', 'Source']);
    }

    var data = JSON.parse(e.postData.contents);
    
    // Validate data is an array
    if (!Array.isArray(data)) {
        data = [data];
    }

    var newRows = [];
    data.forEach(function(item) {
        newRows.push([
            new Date(),
            item.region || 'Unknown',
            item.title,
            item.start,
            item.end,
            item.bannerUrl,
            item.details || '',
            'Website Tracker'
        ]);
    });

    if (newRows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'count': newRows.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName('Events');
    if (!sheet) {
        sheet = doc.insertSheet('Events');
        sheet.appendRow(['Timestamp', 'Region', 'Title', 'Start Date', 'End Date', 'Banner URL', 'Details', 'Source']);
    }
}
