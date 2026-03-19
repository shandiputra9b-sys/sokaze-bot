const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "suggestions.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ lastSuggestionId: 0, suggestions: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      lastSuggestionId: parsed.lastSuggestionId || 0,
      suggestions: parsed.suggestions || {}
    };
  } catch (error) {
    console.error("Failed to read suggestion store:", error);
    return {
      lastSuggestionId: 0,
      suggestions: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function formatSuggestionPublicId(id) {
  return `SG-${String(id).padStart(3, "0")}`;
}

function createSuggestion(entry) {
  const store = readStore();
  const nextId = store.lastSuggestionId + 1;
  const id = String(nextId);

  store.lastSuggestionId = nextId;
  store.suggestions[id] = {
    id,
    publicId: formatSuggestionPublicId(id),
    votes: {},
    ...entry
  };

  writeStore(store);
  return store.suggestions[id];
}

function getSuggestion(id) {
  const store = readStore();
  return store.suggestions[String(id)] || null;
}

function updateSuggestion(id, updater) {
  const store = readStore();
  const current = store.suggestions[String(id)];

  if (!current) {
    return null;
  }

  store.suggestions[String(id)] = updater(current);
  writeStore(store);
  return store.suggestions[String(id)];
}

function deleteSuggestion(id) {
  const store = readStore();
  const current = store.suggestions[String(id)];

  if (!current) {
    return null;
  }

  delete store.suggestions[String(id)];
  writeStore(store);
  return current;
}

function listSuggestions(matcher = () => true) {
  const store = readStore();

  return Object.values(store.suggestions)
    .filter(matcher)
    .sort((left, right) => Number(right.id) - Number(left.id));
}

module.exports = {
  createSuggestion,
  deleteSuggestion,
  getSuggestion,
  listSuggestions,
  updateSuggestion
};
