const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "embed-templates.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ lastTemplateId: 0, templates: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      lastTemplateId: parsed.lastTemplateId || 0,
      templates: parsed.templates || {}
    };
  } catch (error) {
    console.error("Failed to read embed template store:", error);
    return {
      lastTemplateId: 0,
      templates: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function createTemplate(name, payload) {
  const store = readStore();
  const nextId = store.lastTemplateId + 1;
  const id = String(nextId);

  store.lastTemplateId = nextId;
  store.templates[id] = {
    id,
    name,
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  writeStore(store);
  return store.templates[id];
}

function updateTemplate(id, updater) {
  const store = readStore();
  const current = store.templates[String(id)];

  if (!current) {
    return null;
  }

  store.templates[String(id)] = {
    ...updater(current),
    updatedAt: new Date().toISOString()
  };

  writeStore(store);
  return store.templates[String(id)];
}

function getTemplate(id) {
  const store = readStore();
  return store.templates[String(id)] || null;
}

function deleteTemplate(id) {
  const store = readStore();
  const current = store.templates[String(id)];

  if (!current) {
    return null;
  }

  delete store.templates[String(id)];
  writeStore(store);
  return current;
}

function listTemplates() {
  const store = readStore();

  return Object.values(store.templates)
    .sort((left, right) => left.name.localeCompare(right.name));
}

module.exports = {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate
};
