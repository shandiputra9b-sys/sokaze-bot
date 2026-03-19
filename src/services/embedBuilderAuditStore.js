const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "embed-builder-audit.json");
const MAX_ENTRIES = 200;

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ entries: [] }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : []
    };
  } catch (error) {
    console.error("Failed to read embed builder audit store:", error);
    return {
      entries: []
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function appendAuditEntry(entry) {
  const store = readStore();
  const nextEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    at: new Date().toISOString(),
    action: String(entry.action || "unknown"),
    status: String(entry.status || "ok"),
    channelId: String(entry.channelId || ""),
    messageId: String(entry.messageId || ""),
    templateId: String(entry.templateId || ""),
    templateName: String(entry.templateName || ""),
    detail: String(entry.detail || "").slice(0, 160)
  };

  store.entries.unshift(nextEntry);
  store.entries = store.entries.slice(0, MAX_ENTRIES);
  writeStore(store);
  return nextEntry;
}

function listAuditEntries(limit = 20) {
  const store = readStore();
  return store.entries.slice(0, Math.max(1, Math.min(limit, MAX_ENTRIES)));
}

module.exports = {
  appendAuditEntry,
  listAuditEntries
};
