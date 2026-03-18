const fs = require("node:fs");
const path = require("node:path");

const layoutPath = path.join(__dirname, "idCardLayout.json");
const defaultLayout = Object.freeze(JSON.parse(fs.readFileSync(layoutPath, "utf8")));

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDeep(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? clone(base) : clone(override);
  }

  const merged = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(override)]);

  for (const key of keys) {
    const baseValue = base[key];
    const overrideValue = override[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      merged[key] = mergeDeep(baseValue, overrideValue);
      continue;
    }

    if (overrideValue === undefined) {
      merged[key] = clone(baseValue);
      continue;
    }

    merged[key] = clone(overrideValue);
  }

  return merged;
}

function normalizeLayout(layout) {
  return mergeDeep(defaultLayout, layout || {});
}

function readLayoutConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(layoutPath, "utf8"));
    return normalizeLayout(parsed);
  } catch (error) {
    return clone(defaultLayout);
  }
}

function writeLayoutConfig(layout) {
  const normalized = normalizeLayout(layout);
  fs.writeFileSync(layoutPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

module.exports = {
  layoutPath,
  defaultLayout: clone(defaultLayout),
  normalizeLayout,
  readLayoutConfig,
  writeLayoutConfig
};
