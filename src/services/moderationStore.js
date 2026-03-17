const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "moderation.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ lastCaseId: 0, cases: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      lastCaseId: parsed.lastCaseId || 0,
      cases: parsed.cases || {}
    };
  } catch (error) {
    console.error("Failed to read moderation store:", error);
    return {
      lastCaseId: 0,
      cases: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function createCase(entry) {
  const store = readStore();
  const nextId = store.lastCaseId + 1;
  const id = String(nextId);

  store.lastCaseId = nextId;
  store.cases[id] = {
    id,
    ...entry
  };

  writeStore(store);
  return store.cases[id];
}

function getCase(id) {
  const store = readStore();
  return store.cases[id] || null;
}

function updateCase(id, updater) {
  const store = readStore();
  const current = store.cases[id];

  if (!current) {
    return null;
  }

  store.cases[id] = updater(current);
  writeStore(store);
  return store.cases[id];
}

function updateCases(matcher, updater) {
  const store = readStore();
  const updated = [];

  for (const [id, entry] of Object.entries(store.cases)) {
    if (!matcher(entry)) {
      continue;
    }

    store.cases[id] = updater(entry);
    updated.push(store.cases[id]);
  }

  if (updated.length) {
    writeStore(store);
  }

  return updated;
}

function listCases(matcher = () => true) {
  const store = readStore();

  return Object.values(store.cases)
    .filter(matcher)
    .sort((left, right) => Number(right.id) - Number(left.id));
}

module.exports = {
  createCase,
  getCase,
  listCases,
  updateCase,
  updateCases
};
