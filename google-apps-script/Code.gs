const TEMPLATE_SPREADSHEET_ID = "1NfHeZFICoyZkaCZAvLTOme_ehrMebp4vzH_DNnTCVHc";
const DESTINATION_FOLDER_ID = "1AzesURMiWLwGfHL84A6R4qlu6BB1KU7C";
const SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    verifySecret_(request.secret);
    const userName = normalizeUserName_(request.userName);
    const fileName = buildFileName_(userName);

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const existing = findSpreadsheet_(fileName);
      if (existing) {
        ensureAnyoneCanEdit_(existing.id);
        return jsonResponse_({ ok: true, created: false, url: spreadsheetUrl_(existing.id) });
      }

      const copied = Drive.Files.copy(
        { name: fileName, parents: [DESTINATION_FOLDER_ID] },
        TEMPLATE_SPREADSHEET_ID,
        { supportsAllDrives: true, fields: "id,name,webViewLink" }
      );
      ensureAnyoneCanEdit_(copied.id);
      return jsonResponse_({ ok: true, created: true, url: copied.webViewLink || spreadsheetUrl_(copied.id) });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error("SNS analysis sheet creation failed", error && error.stack ? error.stack : error);
    return jsonResponse_({ ok: false, error: "Sheet creation failed" });
  }
}

function verifySecret_(receivedSecret) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty("API_SECRET");
  if (!expectedSecret || typeof receivedSecret !== "string" || receivedSecret !== expectedSecret) {
    throw new Error("Unauthorized request");
  }
}

function normalizeUserName_(value) {
  if (typeof value !== "string") throw new Error("User name is required");
  const normalized = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!normalized || normalized.length > 80) throw new Error("Invalid user name");
  return normalized;
}

function buildFileName_(userName) {
  return (userName.endsWith("さん") ? userName : userName + "さん") + " SNS分析用";
}

function findSpreadsheet_(fileName) {
  const query = [
    "'" + escapeQueryValue_(DESTINATION_FOLDER_ID) + "' in parents",
    "name = '" + escapeQueryValue_(fileName) + "'",
    "mimeType = '" + SPREADSHEET_MIME_TYPE + "'",
    "trashed = false"
  ].join(" and ");
  let pageToken;
  do {
    const result = Drive.Files.list({
      q: query,
      spaces: "drive",
      pageSize: 100,
      pageToken: pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields: "nextPageToken,files(id,name,webViewLink)"
    });
    if (result.files && result.files.length > 0) return result.files[0];
    pageToken = result.nextPageToken;
  } while (pageToken);
  return null;
}

function ensureAnyoneCanEdit_(fileId) {
  const result = Drive.Permissions.list(fileId, {
    supportsAllDrives: true,
    fields: "permissions(id,type,role,allowFileDiscovery)"
  });
  const anyonePermission = (result.permissions || []).find(function(permission) {
    return permission.type === "anyone";
  });
  if (anyonePermission) {
    if (anyonePermission.role !== "writer" || anyonePermission.allowFileDiscovery !== false) {
      Drive.Permissions.update(
        { role: "writer", allowFileDiscovery: false },
        fileId,
        anyonePermission.id,
        { supportsAllDrives: true, fields: "id,type,role,allowFileDiscovery" }
      );
    }
    return;
  }
  Drive.Permissions.create(
    { type: "anyone", role: "writer", allowFileDiscovery: false },
    fileId,
    { supportsAllDrives: true, fields: "id,type,role,allowFileDiscovery" }
  );
}

function spreadsheetUrl_(fileId) {
  return "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(fileId) + "/edit";
}

function escapeQueryValue_(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
