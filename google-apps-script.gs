const STATE_SHEET = "AquaLashState";
const RESERVATION_SHEET = "Reservations";
const SPREADSHEET_ID = "17n7By6g7Fn-3Q0Gt5BwIvO1GvxaYgS2WogzbVFK94a8";

const DEFAULT_STATE = {
  siteContent: {},
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
  const spreadsheet = getSpreadsheet_();
  const stateSheet = getOrCreateSheet_(spreadsheet, STATE_SHEET);
  stateSheet.clear();
  stateSheet.getRange(1, 1, 1, 2).setValues([["key", "json"]]);
  stateSheet.getRange(2, 1, 4, 2).setValues([
    ["siteContent", "{}"],
    ["services", "[]"],
    ["slots", "[]"],
    ["reservations", "[]"],
  ]);

  const reservationSheet = getOrCreateSheet_(spreadsheet, RESERVATION_SHEET);
  reservationSheet.clear();
  reservationSheet.getRange(1, 1, 1, 10).setValues([
    ["建立時間", "姓名", "電話", "Line / IG", "服務", "日期", "時間", "地點/標籤", "備註", "預約ID"],
  ]);
}

function getState() {
  const spreadsheet = getSpreadsheet_();
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
      state[key] = key === "siteContent" ? {} : [];
    }
  });

  return state;
}

function saveState(state) {
  const normalized = {
    siteContent: state.siteContent && typeof state.siteContent === "object" ? state.siteContent : {},
    services: Array.isArray(state.services) ? state.services : [],
    slots: Array.isArray(state.slots) ? state.slots : [],
    reservations: Array.isArray(state.reservations) ? state.reservations : [],
  };

  const spreadsheet = getSpreadsheet_();
  const stateSheet = getOrCreateSheet_(spreadsheet, STATE_SHEET);
  stateSheet.clear();
  stateSheet.getRange(1, 1, 1, 2).setValues([["key", "json"]]);
  stateSheet.getRange(2, 1, 4, 2).setValues([
    ["siteContent", JSON.stringify(normalized.siteContent)],
    ["services", JSON.stringify(normalized.services)],
    ["slots", JSON.stringify(normalized.slots)],
    ["reservations", JSON.stringify(normalized.reservations)],
  ]);

  writeReservationSheet_(spreadsheet, normalized.reservations);
}

function writeReservationSheet_(spreadsheet, reservations) {
  const sheet = getOrCreateSheet_(spreadsheet, RESERVATION_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, 10).setValues([
    ["建立時間", "姓名", "電話", "Line / IG", "服務", "日期", "時間", "地點/標籤", "備註", "預約ID"],
  ]);

  if (!reservations.length) return;

  const rows = reservations.map((item) => [
    item.createdAt || "",
    item.customerName || "",
    item.phone || "",
    item.contact || "",
    item.serviceName || "",
    item.date || "",
    item.time || "",
    item.label || "",
    item.note || "",
    item.id || "",
  ]);
  sheet.getRange(2, 1, rows.length, 10).setValues(rows);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function jsonp(callback, payload) {
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(payload) + ");").setMimeType(
    ContentService.MimeType.JAVASCRIPT
  );
}

function textJson(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
