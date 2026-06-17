const STATE_SHEET = "AquaLashState";
const IMAGE_SHEET = "AquaLashImages";
const RESERVATION_SHEET = "Reservations";
const SPREADSHEET_ID = "17n7By6g7Fn-3Q0Gt5BwIvO1GvxaYgS2WogzbVFK94a8";
const IMAGE_TOKEN = "__AQUA_LASH_STORED_IMAGE__";
const IMAGE_CHUNK_SIZE = 45000;

const DEFAULT_STATE = {
  siteContent: {},
  services: [],
  slots: [],
  reservations: [],
};

const RESERVATION_HEADERS = [
  "Created At",
  "Name",
  "Phone",
  "Line / IG",
  "Service",
  "Date",
  "Time",
  "Location / Tag",
  "Note",
  "Reservation ID",
];

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
  reservationSheet.getRange(1, 1, 1, RESERVATION_HEADERS.length).setValues([RESERVATION_HEADERS]);
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

  if (state.siteContent && state.siteContent.imageUrl === IMAGE_TOKEN) {
    state.siteContent.imageUrl = readImageChunks_(spreadsheet) || "";
  }

  return state;
}

function saveState(state) {
  const spreadsheet = getSpreadsheet_();
  const normalized = {
    siteContent: state.siteContent && typeof state.siteContent === "object" ? state.siteContent : {},
    services: Array.isArray(state.services) ? state.services : [],
    slots: Array.isArray(state.slots) ? state.slots : [],
    reservations: Array.isArray(state.reservations) ? state.reservations : [],
  };

  normalized.siteContent = saveLargeSiteImage_(spreadsheet, normalized.siteContent);

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

function saveLargeSiteImage_(spreadsheet, siteContent) {
  const nextSiteContent = Object.assign({}, siteContent);
  const imageUrl = nextSiteContent.imageUrl || "";

  if (imageUrl.indexOf("data:image/") === 0) {
    writeImageChunks_(spreadsheet, imageUrl);
    nextSiteContent.imageUrl = IMAGE_TOKEN;
  }

  return nextSiteContent;
}

function writeImageChunks_(spreadsheet, imageData) {
  const sheet = getOrCreateSheet_(spreadsheet, IMAGE_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([["index", "chunk"]]);

  const rows = [];
  for (let index = 0; index < imageData.length; index += IMAGE_CHUNK_SIZE) {
    rows.push([rows.length, imageData.slice(index, index + IMAGE_CHUNK_SIZE)]);
  }

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}

function readImageChunks_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(IMAGE_SHEET);
  if (!sheet) return "";

  const values = sheet.getDataRange().getValues().slice(1);
  if (!values.length) return "";

  return values
    .sort(function (a, b) {
      return Number(a[0]) - Number(b[0]);
    })
    .map(function (row) {
      return row[1] || "";
    })
    .join("");
}

function writeReservationSheet_(spreadsheet, reservations) {
  const sheet = getOrCreateSheet_(spreadsheet, RESERVATION_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, RESERVATION_HEADERS.length).setValues([RESERVATION_HEADERS]);

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
  sheet.getRange(2, 1, rows.length, RESERVATION_HEADERS.length).setValues(rows);
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
