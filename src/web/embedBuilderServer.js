const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate
} = require("../services/embedTemplateStore");
const {
  MAX_BUTTONS,
  MAX_FIELDS,
  listAvailableTextChannels,
  normalizeBuilderPayload,
  sendBuilderMessage
} = require("../modules/embed-builder/embedBuilderSystem");

const SESSION_COOKIE_NAME = "sokaze_embed_session";
const sessions = new Map();

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split("=");
        return [name, decodeURIComponent(rest.join("="))];
      })
  );
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    ...extraHeaders
  });
  response.end(payload);
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonBody(request) {
  const raw = await readRequestBody(request);

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Body request tidak valid.");
  }
}

function createSession(serverConfig) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + (serverConfig.sessionTtlHours * 60 * 60 * 1000);
  sessions.set(token, { expiresAt });
  return { token, expiresAt };
}

function buildSessionCookie(token, serverConfig) {
  const maxAge = serverConfig.sessionTtlHours * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

function buildExpiredSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function authenticateRequest(request, serverConfig) {
  const cookies = parseCookies(request.headers.cookie || "");
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token) {
    return false;
  }

  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }

  session.expiresAt = Date.now() + (serverConfig.sessionTtlHours * 60 * 60 * 1000);
  return true;
}

function requireAuth(request, response, serverConfig) {
  if (authenticateRequest(request, serverConfig)) {
    return true;
  }

  sendJson(response, 401, {
    ok: false,
    error: "Unauthorized"
  });
  return false;
}

function mapTemplatesForResponse() {
  return listTemplates().map((template) => ({
    id: template.id,
    name: template.name,
    payload: normalizeBuilderPayload(template.payload),
    updatedAt: template.updatedAt
  }));
}

function getStaticPaths() {
  const root = path.join(__dirname, "..", "..");

  return {
    html: path.join(root, "tools", "embed-builder.html"),
    css: path.join(root, "tools", "embed-builder.css"),
    js: path.join(root, "tools", "embed-builder.js")
  };
}

async function handleLogin(request, response, serverConfig) {
  const payload = await readJsonBody(request);
  const password = String(payload.password || "");

  if (!serverConfig.password || password !== serverConfig.password) {
    sendJson(response, 401, {
      ok: false,
      error: "Password salah."
    });
    return;
  }

  const session = createSession(serverConfig);

  sendJson(response, 200, { ok: true }, {
    "Set-Cookie": buildSessionCookie(session.token, serverConfig)
  });
}

async function handleBootstrap(response, client) {
  const channels = await listAvailableTextChannels(client);
  const templates = mapTemplatesForResponse();

  sendJson(response, 200, {
    ok: true,
    channels,
    templates,
    limits: {
      fields: MAX_FIELDS,
      buttons: MAX_BUTTONS
    }
  });
}

async function handleTemplateSave(request, response) {
  const payload = await readJsonBody(request);
  const name = String(payload.name || "").trim().slice(0, 80);
  const normalized = normalizeBuilderPayload(payload.payload || {});

  if (!name) {
    sendJson(response, 400, {
      ok: false,
      error: "Nama template wajib diisi."
    });
    return;
  }

  let template = null;

  if (payload.templateId && getTemplate(payload.templateId)) {
    template = updateTemplate(payload.templateId, (current) => ({
      ...current,
      name,
      payload: normalized
    }));
  } else {
    template = createTemplate(name, normalized);
  }

  sendJson(response, 200, {
    ok: true,
    template: {
      id: template.id,
      name: template.name,
      payload: normalizeBuilderPayload(template.payload),
      updatedAt: template.updatedAt
    }
  });
}

async function handleTemplateDelete(response, templateId) {
  const deleted = deleteTemplate(templateId);

  if (!deleted) {
    sendJson(response, 404, {
      ok: false,
      error: "Template tidak ditemukan."
    });
    return;
  }

  sendJson(response, 200, {
    ok: true
  });
}

async function handleSend(request, response, client) {
  const payload = await readJsonBody(request);
  const result = await sendBuilderMessage(client, payload.payload || payload);

  sendJson(response, 200, {
    ok: true,
    result
  });
}

function startEmbedBuilderServer(client) {
  const serverConfig = client.config.embedBuilder;

  if (!serverConfig?.enabled) {
    return null;
  }

  if (!serverConfig.password) {
    console.warn("Embed Builder disabled because EMBED_BUILDER_PASSWORD is empty.");
    return null;
  }

  if (client.embedBuilderServer) {
    return client.embedBuilderServer;
  }

  const staticPaths = getStaticPaths();

  const server = http.createServer((request, response) => {
    const handler = async () => {
      const url = new URL(request.url, `http://${request.headers.host || `${serverConfig.host}:${serverConfig.port}`}`);

      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/embed-builder")) {
        const html = await fs.readFile(staticPaths.html, "utf8");
        return sendText(response, 200, html, "text/html; charset=utf-8");
      }

      if (request.method === "GET" && url.pathname === "/embed-builder.css") {
        const css = await fs.readFile(staticPaths.css, "utf8");
        return sendText(response, 200, css, "text/css; charset=utf-8");
      }

      if (request.method === "GET" && url.pathname === "/embed-builder.js") {
        const js = await fs.readFile(staticPaths.js, "utf8");
        return sendText(response, 200, js, "application/javascript; charset=utf-8");
      }

      if (request.method === "POST" && url.pathname === "/api/embed-builder/login") {
        return handleLogin(request, response, serverConfig);
      }

      if (request.method === "POST" && url.pathname === "/api/embed-builder/logout") {
        const cookies = parseCookies(request.headers.cookie || "");
        const token = cookies[SESSION_COOKIE_NAME];

        if (token) {
          sessions.delete(token);
        }

        return sendJson(response, 200, { ok: true }, {
          "Set-Cookie": buildExpiredSessionCookie()
        });
      }

      if (request.method === "GET" && url.pathname === "/api/embed-builder/health") {
        return sendJson(response, 200, {
          ok: true,
          ready: client.isReady?.() || false
        });
      }

      if (!requireAuth(request, response, serverConfig)) {
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/embed-builder/bootstrap") {
        return handleBootstrap(response, client);
      }

      if (request.method === "GET" && url.pathname === "/api/embed-builder/templates") {
        return sendJson(response, 200, {
          ok: true,
          templates: mapTemplatesForResponse()
        });
      }

      if (request.method === "POST" && url.pathname === "/api/embed-builder/templates") {
        return handleTemplateSave(request, response);
      }

      if (request.method === "DELETE" && url.pathname.startsWith("/api/embed-builder/templates/")) {
        const templateId = url.pathname.slice("/api/embed-builder/templates/".length);
        return handleTemplateDelete(response, templateId);
      }

      if (request.method === "POST" && url.pathname === "/api/embed-builder/send") {
        return handleSend(request, response, client);
      }

      return sendJson(response, 404, {
        ok: false,
        error: "Not found"
      });
    };

    handler().catch((error) => {
      console.error("Embed builder request failed:", error);
      sendJson(response, 500, {
        ok: false,
        error: error.message || "Internal server error"
      });
    });
  });

  server.listen(serverConfig.port, serverConfig.host, () => {
    console.log(`Embed builder running on http://${serverConfig.host}:${serverConfig.port}/embed-builder`);
  });

  client.embedBuilderServer = server;
  return server;
}

module.exports = {
  startEmbedBuilderServer
};
