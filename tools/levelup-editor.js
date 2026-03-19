(function levelUpEditorApp() {
  const state = {
    config: null,
    defaults: null,
    preview: {
      previousLevel: 66,
      nextLevel: 67,
      avatarUrl: ""
    },
    previewUrl: ""
  };

  const elements = {
    loginCard: document.getElementById("loginCard"),
    editorCard: document.getElementById("editorCard"),
    passwordInput: document.getElementById("passwordInput"),
    loginButton: document.getElementById("loginButton"),
    loginStatus: document.getElementById("loginStatus"),
    saveButton: document.getElementById("saveButton"),
    resetButton: document.getElementById("resetButton"),
    logoutButton: document.getElementById("logoutButton"),
    editorStatus: document.getElementById("editorStatus"),
    previewImage: document.getElementById("previewImage"),
    previewPrevious: document.getElementById("previewPrevious"),
    previewNext: document.getElementById("previewNext"),
    previewAvatar: document.getElementById("previewAvatar")
  };

  let previewTimer = null;

  function setStatus(target, message, tone = "") {
    target.textContent = message;
    target.className = `status${tone ? ` ${tone}` : ""}`;
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      ...options
    });

    if (!response.ok) {
      let payload = null;

      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      throw new Error(payload?.error || `Request gagal (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return response.blob();
  }

  function getByPath(object, path) {
    return path.split(".").reduce((current, key) => current?.[key], object);
  }

  function setByPath(object, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    let current = object;

    for (const key of keys) {
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }

      current = current[key];
    }

    current[last] = value;
  }

  function parseInputValue(input) {
    if (input.type === "checkbox") {
      return input.checked;
    }

    if (input.type === "number") {
      return Number(input.value || 0);
    }

    return input.value;
  }

  function fillForm() {
    document.querySelectorAll("[data-path]").forEach((input) => {
      const value = getByPath(state.config, input.dataset.path);

      if (input.type === "checkbox") {
        input.checked = Boolean(value);
        return;
      }

      input.value = value ?? "";
    });

    elements.previewPrevious.value = state.preview.previousLevel;
    elements.previewNext.value = state.preview.nextLevel;
    elements.previewAvatar.value = state.preview.avatarUrl;
  }

  async function refreshPreview() {
    if (!state.config) {
      return;
    }

    try {
      const blob = await request("/api/levelup-editor/preview", {
        method: "POST",
        body: JSON.stringify({
          config: state.config,
          sample: state.preview
        })
      });

      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }

      state.previewUrl = URL.createObjectURL(blob);
      elements.previewImage.src = state.previewUrl;
      setStatus(elements.editorStatus, "Preview diperbarui.", "success");
    } catch (error) {
      setStatus(elements.editorStatus, error.message || "Gagal render preview.", "error");
    }
  }

  function schedulePreview() {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(refreshPreview, 180);
  }

  async function bootstrap() {
    try {
      const data = await request("/api/levelup-editor/bootstrap");
      state.config = data.config;
      state.defaults = data.defaults;
      elements.loginCard.classList.add("hidden");
      elements.editorCard.classList.remove("hidden");
      fillForm();
      await refreshPreview();
    } catch (error) {
      elements.loginCard.classList.remove("hidden");
      elements.editorCard.classList.add("hidden");
      setStatus(elements.loginStatus, error.message || "Login dibutuhkan.", "error");
    }
  }

  async function login() {
    try {
      await request("/api/embed-builder/login", {
        method: "POST",
        body: JSON.stringify({
          password: elements.passwordInput.value
        })
      });

      setStatus(elements.loginStatus, "Login berhasil.", "success");
      await bootstrap();
    } catch (error) {
      setStatus(elements.loginStatus, error.message || "Login gagal.", "error");
    }
  }

  async function logout() {
    try {
      await request("/api/embed-builder/logout", {
        method: "POST",
        body: JSON.stringify({})
      });
    } finally {
      elements.loginCard.classList.remove("hidden");
      elements.editorCard.classList.add("hidden");
      setStatus(elements.loginStatus, "Logout berhasil.", "success");
    }
  }

  async function save() {
    try {
      const data = await request("/api/levelup-editor/config", {
        method: "POST",
        body: JSON.stringify({
          config: state.config
        })
      });

      state.config = data.config;
      fillForm();
      await refreshPreview();
      setStatus(elements.editorStatus, "Config level-up card berhasil disimpan.", "success");
    } catch (error) {
      setStatus(elements.editorStatus, error.message || "Gagal menyimpan config.", "error");
    }
  }

  async function reset() {
    try {
      const data = await request("/api/levelup-editor/reset", {
        method: "POST",
        body: JSON.stringify({})
      });

      state.config = data.config;
      fillForm();
      await refreshPreview();
      setStatus(elements.editorStatus, "Config direset ke default.", "success");
    } catch (error) {
      setStatus(elements.editorStatus, error.message || "Gagal reset config.", "error");
    }
  }

  document.querySelectorAll("[data-path]").forEach((input) => {
    input.addEventListener("input", () => {
      if (!state.config) {
        return;
      }

      setByPath(state.config, input.dataset.path, parseInputValue(input));
      schedulePreview();
    });
  });

  elements.previewPrevious.addEventListener("input", () => {
    state.preview.previousLevel = Number(elements.previewPrevious.value || 0);
    schedulePreview();
  });

  elements.previewNext.addEventListener("input", () => {
    state.preview.nextLevel = Number(elements.previewNext.value || 0);
    schedulePreview();
  });

  elements.previewAvatar.addEventListener("input", () => {
    state.preview.avatarUrl = elements.previewAvatar.value.trim();
    schedulePreview();
  });

  elements.loginButton.addEventListener("click", login);
  elements.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      login();
    }
  });
  elements.saveButton.addEventListener("click", save);
  elements.resetButton.addEventListener("click", reset);
  elements.logoutButton.addEventListener("click", logout);

  bootstrap();
})();
