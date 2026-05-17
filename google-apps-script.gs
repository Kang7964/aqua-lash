const STATE_SHEET = "AquaLashState";
const RESERVATION_SHEET = "Reservations";

const DEFAULT_STATE = {
  services: [],
  slots: [],
  reservations: [],
};

function doGet(event) {
  const action = event.parameter.action || "state";
  const callback = event.parameter.callback || "callback";

  try {
    if (action === "state") {
      return jsonp(callback, {
        ok: true,
        state: getState(),
      });
    }

    return jsonp(callback, {
      ok: false,
      error: "Unknown action",
    });
  } catch (error) {
    return jsonp(callback, {
      ok: false,
      error: String(error),
    });
  }
}

function doPost(event) {
  try {
    const action = event.parameter.action;
    const payload = JSON.parse(event.parameter.payload || "{}");

    if (action === "saveState") {
      saveState(payload);
      return textJson({ ok: true });
    }

    return textJson({ ok: false, error: "Unknown action" });
  } catch (error) {
    return textJson({ ok: false, error: String(error) });
  }
}

function setupAquaLashSheets() {
  const spreadsheet = SpreadsheetApp.getActive();
  const stateSheet = getOrCreateSheet_(spreadsheet, STATE_SHEET);
  stateSheet.clear();
  stateSheet.getRange(1, 1, 1, 2).setValues([["key", "json"]]);
  stateSheet.getRange(2, 1, 3, 2).setValues([
    ["services", "[]"],
    ["slots", "[]"],
    ["reservations", "[]"],
  ]);

  const reservationSheet = getOrCreateSheet_(spreadsheet, RESERVATION_SHEET);
  reservationSheet.clear();
  reservationSheet.getRange(1, 1, 1, 9).setValues([
    ["建立時間", "姓名", "聯絡方式", "服務", "日期", "時間", "地點/標籤", "備註", "預約ID"],
  ]);
}

function getState() {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = getOrCreateSheet_(spreadsheet, STATE_SHEET);
  const values = sheet.getDataRange().getValues();
  const state = Object.assign({}, DEFAULT_STATE);

  values.slice(1).forEach((row) => {
    const key = row[0];
    const json = row[1];
    if (!key || !json) return;
    try {
      state[key] = JSON.parse(json);
    } catch (error) {
      state[key] = [];
    }
  });

  return state;
}

function saveState(state) {
  const normalized = {
    services: Array.isArray(state.services) ? state.services : [],
    slots: Array.isArray(state.slots) ? state.slots : [],
    reservations: Array.isArray(state.reservations) ? state.reservations : [],
  };

  const spreadsheet = SpreadsheetApp.getActive();
  const stateSheet = getOrCreateSheet_(spreadsheet, STATE_SHEET);
  stateSheet.clear();
  stateSheet.getRange(1, 1, 1, 2).setValues([["key", "json"]]);
  stateSheet.getRange(2, 1, 3, 2).setValues([
    ["services", JSON.stringify(normalized.services)],
    ["slots", JSON.stringify(normalized.slots)],
    ["reservations", JSON.stringify(normalized.reservations)],
  ]);

  writeReservationSheet_(spreadsheet, normalized.reservations);
}

function writeReservationSheet_(spreadsheet, reservations) {
  const sheet = getOrCreateSheet_(spreadsheet, RESERVATION_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, 9).setValues([
    ["建立時間", "姓名", "聯絡方式", "服務", "日期", "時間", "地點/標籤", "備註", "預約ID"],
  ]);

  if (!reservations.length) return;

  const rows = reservations.map((item) => [
    item.createdAt || "",
    item.customerName || "",
    item.contact || "",
    item.serviceName || "",
    item.date || "",
    item.time || "",
    item.label || "",
    item.note || "",
    item.id || "",
  ]);
  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function jsonp(callback, payload) {
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(payload) + ");").setMimeType(
    ContentService.MimeType.JAVASCRIPT
  );
}

function textJson(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
