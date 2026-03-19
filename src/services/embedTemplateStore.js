const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "embed-templates.json");

function sanitizeTemplateTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seen = new Set();

  return tags
    .map((tag) => String(tag || "").trim().toLowerCase().slice(0, 32))
    .filter((tag) => {
      if (!tag || seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    })
    .slice(0, 12);
}

function normalizeTemplateRecord(record = {}) {
  return {
    id: String(record.id || ""),
    name: String(record.name || "").trim(),
    payload: record.payload || {},
    tags: sanitizeTemplateTags(record.tags),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString()
  };
}

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

function createTemplate(name, payload, meta = {}) {
  const store = readStore();
  const nextId = store.lastTemplateId + 1;
  const id = String(nextId);

  store.lastTemplateId = nextId;
  store.templates[id] = normalizeTemplateRecord({
    id,
    name,
    payload,
    tags: meta.tags,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  writeStore(store);
  return store.templates[id];
}

function updateTemplate(id, updater) {
  const store = readStore();
  const current = store.templates[String(id)];

  if (!current) {
    return null;
  }

  store.templates[String(id)] = normalizeTemplateRecord({
    ...updater(current),
    updatedAt: new Date().toISOString()
  });

  writeStore(store);
  return store.templates[String(id)];
}

function getTemplate(id) {
  const store = readStore();
  const template = store.templates[String(id)];
  return template ? normalizeTemplateRecord(template) : null;
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
    .map((template) => normalizeTemplateRecord(template))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function duplicateTemplate(id, overrides = {}) {
  const source = getTemplate(id);

  if (!source) {
    return null;
  }

  return createTemplate(
    String(overrides.name || `${source.name} Copy`).trim(),
    overrides.payload || source.payload,
    overrides
  );
}

module.exports = {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  sanitizeTemplateTags,
  updateTemplate
};
