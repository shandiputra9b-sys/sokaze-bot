const state = {
  channels: [],
  templates: [],
  limits: {
    fields: 25,
    buttons: 5
  },
  fields: [],
  buttons: [],
  focusedElement: null,
  currentTemplateId: ""
}

const elements = {
  loginOverlay: document.getElementById("loginOverlay"),
  loginForm: document.getElementById("loginForm"),
  loginError: document.getElementById("loginError"),
  passwordInput: document.getElementById("passwordInput"),
  logoutButton: document.getElementById("logoutButton"),
  sendButton: document.getElementById("sendButton"),
  channelSelect: document.getElementById("channelSelect"),
  templateSelect: document.getElementById("templateSelect"),
  loadTemplateButton: document.getElementById("loadTemplateButton"),
  deleteTemplateButton: document.getElementById("deleteTemplateButton"),
  saveTemplateButton: document.getElementById("saveTemplateButton"),
  templateNameInput: document.getElementById("templateNameInput"),
  statusText: document.getElementById("statusText"),
  formatTargetLabel: document.getElementById("formatTargetLabel"),
  messageContent: document.getElementById("messageContent"),
  embedTitle: document.getElementById("embedTitle"),
  embedColor: document.getElementById("embedColor"),
  embedDescription: document.getElementById("embedDescription"),
  authorName: document.getElementById("authorName"),
  authorIconUrl: document.getElementById("authorIconUrl"),
  authorUrl: document.getElementById("authorUrl"),
  thumbnailUrl: document.getElementById("thumbnailUrl"),
  imageUrl: document.getElementById("imageUrl"),
  footerText: document.getElementById("footerText"),
  footerIconUrl: document.getElementById("footerIconUrl"),
  timestampToggle: document.getElementById("timestampToggle"),
  fieldsContainer: document.getElementById("fieldsContainer"),
  buttonsContainer: document.getElementById("buttonsContainer"),
  addFieldButton: document.getElementById("addFieldButton"),
  addButtonButton: document.getElementById("addButtonButton"),
  previewRoot: document.getElementById("previewRoot")
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function isValidHttpUrl(value) {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function safeUrl(value) {
  return isValidHttpUrl(value) ? value : ""
}

function normalizeColor(value) {
  const raw = String(value || "").trim()

  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw
  }

  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw}`
  }

  return "#111214"
}

function setStatus(message, tone = "muted") {
  elements.statusText.textContent = message || ""
  elements.statusText.className = "status-text"

  if (tone === "success" || tone === "error") {
    elements.statusText.classList.add(tone)
  }
}

function setFocusedElement(element) {
  state.focusedElement = element || null
  elements.formatTargetLabel.textContent = state.focusedElement
    ? `Fokus: ${state.focusedElement.dataset.formatTarget || "Textarea"}`
    : "Fokus: belum ada textarea aktif"
}

function bindFocusTracking(root = document) {
  root.querySelectorAll("textarea[data-format-target]").forEach((element) => {
    element.addEventListener("focus", () => setFocusedElement(element))
    element.addEventListener("click", () => setFocusedElement(element))
  })
}

function getCurrentPayload() {
  return {
    channelId: elements.channelSelect.value || "",
    messageContent: elements.messageContent.value.trim(),
    embed: {
      title: elements.embedTitle.value.trim(),
      description: elements.embedDescription.value.trim(),
      color: normalizeColor(elements.embedColor.value),
      authorName: elements.authorName.value.trim(),
      authorIconUrl: elements.authorIconUrl.value.trim(),
      authorUrl: elements.authorUrl.value.trim(),
      thumbnailUrl: elements.thumbnailUrl.value.trim(),
      imageUrl: elements.imageUrl.value.trim(),
      footerText: elements.footerText.value.trim(),
      footerIconUrl: elements.footerIconUrl.value.trim(),
      timestamp: elements.timestampToggle.checked,
      fields: state.fields
        .map((field) => ({
          name: String(field.name || "").trim().slice(0, 256),
          value: String(field.value || "").trim().slice(0, 1024),
          inline: Boolean(field.inline)
        }))
        .filter((field) => field.name && field.value)
    },
    buttons: state.buttons
      .map((button) => ({
        label: String(button.label || "").trim().slice(0, 80),
        url: String(button.url || "").trim().slice(0, 1000)
      }))
      .filter((button) => button.label && isValidHttpUrl(button.url))
  }
}

function createBuilderItemHeader(title, index, total, onMoveUp, onMoveDown, onRemove) {
  const header = document.createElement("div")
  header.className = "builder-item-header"

  const titleEl = document.createElement("strong")
  titleEl.textContent = title
  header.appendChild(titleEl)

  const actions = document.createElement("div")
  actions.className = "builder-item-actions"

  const upButton = document.createElement("button")
  upButton.type = "button"
  upButton.className = "ghost-button mini-button"
  upButton.textContent = "↑"
  upButton.disabled = index === 0
  upButton.addEventListener("click", onMoveUp)
  actions.appendChild(upButton)

  const downButton = document.createElement("button")
  downButton.type = "button"
  downButton.className = "ghost-button mini-button"
  downButton.textContent = "↓"
  downButton.disabled = index >= total - 1
  downButton.addEventListener("click", onMoveDown)
  actions.appendChild(downButton)

  const removeButton = document.createElement("button")
  removeButton.type = "button"
  removeButton.className = "ghost-button mini-button danger"
  removeButton.textContent = "×"
  removeButton.addEventListener("click", onRemove)
  actions.appendChild(removeButton)

  header.appendChild(actions)
  return header
}

function moveArrayItem(items, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= items.length) {
    return
  }

  const [item] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, item)
}

function renderFields() {
  elements.fieldsContainer.innerHTML = ""

  if (!state.fields.length) {
    const empty = document.createElement("p")
    empty.className = "muted builder-empty"
    empty.textContent = "Belum ada field. Tambah field kalau butuh info tambahan di embed."
    elements.fieldsContainer.appendChild(empty)
    return
  }

  state.fields.forEach((field, index) => {
    const item = document.createElement("div")
    item.className = "builder-item"

    item.appendChild(createBuilderItemHeader(
      `Field ${index + 1}`,
      index,
      state.fields.length,
      () => {
        moveArrayItem(state.fields, index, index - 1)
        renderFields()
        renderPreview()
      },
      () => {
        moveArrayItem(state.fields, index, index + 1)
        renderFields()
        renderPreview()
      },
      () => {
        state.fields.splice(index, 1)
        renderFields()
        renderPreview()
      }
    ))

    const grid = document.createElement("div")
    grid.className = "double-grid"

    const nameWrap = document.createElement("label")
    nameWrap.className = "stack"
    const nameLabel = document.createElement("span")
    nameLabel.textContent = "Field Name"
    const nameInput = document.createElement("input")
    nameInput.type = "text"
    nameInput.maxLength = 256
    nameInput.value = field.name || ""
    nameInput.addEventListener("input", () => {
      field.name = nameInput.value
      renderPreview()
    })
    nameWrap.append(nameLabel, nameInput)

    const inlineWrap = document.createElement("label")
    inlineWrap.className = "inline-check"
    const inlineInput = document.createElement("input")
    inlineInput.type = "checkbox"
    inlineInput.checked = Boolean(field.inline)
    inlineInput.addEventListener("change", () => {
      field.inline = inlineInput.checked
      renderPreview()
    })
    const inlineLabel = document.createElement("span")
    inlineLabel.textContent = "Inline"
    inlineWrap.append(inlineInput, inlineLabel)

    const valueWrap = document.createElement("label")
    valueWrap.className = "stack full"
    const valueLabel = document.createElement("span")
    valueLabel.textContent = "Field Value"
    const valueInput = document.createElement("textarea")
    valueInput.rows = 4
    valueInput.value = field.value || ""
    valueInput.dataset.formatTarget = `Field ${index + 1} Value`
    valueInput.addEventListener("input", () => {
      field.value = valueInput.value
      renderPreview()
    })
    valueWrap.append(valueLabel, valueInput)

    grid.append(nameWrap, inlineWrap, valueWrap)
    item.appendChild(grid)
    elements.fieldsContainer.appendChild(item)
  })

  bindFocusTracking(elements.fieldsContainer)
}

function renderButtons() {
  elements.buttonsContainer.innerHTML = ""

  if (!state.buttons.length) {
    const empty = document.createElement("p")
    empty.className = "muted builder-empty"
    empty.textContent = "Belum ada link button. Tambah kalau mau bikin CTA seperti rules, vote, atau website."
    elements.buttonsContainer.appendChild(empty)
    return
  }

  state.buttons.forEach((button, index) => {
    const item = document.createElement("div")
    item.className = "builder-item"

    item.appendChild(createBuilderItemHeader(
      `Link Button ${index + 1}`,
      index,
      state.buttons.length,
      () => {
        moveArrayItem(state.buttons, index, index - 1)
        renderButtons()
        renderPreview()
      },
      () => {
        moveArrayItem(state.buttons, index, index + 1)
        renderButtons()
        renderPreview()
      },
      () => {
        state.buttons.splice(index, 1)
        renderButtons()
        renderPreview()
      }
    ))

    const grid = document.createElement("div")
    grid.className = "double-grid"

    const labelWrap = document.createElement("label")
    labelWrap.className = "stack"
    const labelText = document.createElement("span")
    labelText.textContent = "Button Label"
    const labelInput = document.createElement("input")
    labelInput.type = "text"
    labelInput.maxLength = 80
    labelInput.value = button.label || ""
    labelInput.addEventListener("input", () => {
      button.label = labelInput.value
      renderPreview()
    })
    labelWrap.append(labelText, labelInput)

    const urlWrap = document.createElement("label")
    urlWrap.className = "stack"
    const urlText = document.createElement("span")
    urlText.textContent = "URL"
    const urlInput = document.createElement("input")
    urlInput.type = "url"
    urlInput.placeholder = "https://..."
    urlInput.value = button.url || ""
    urlInput.addEventListener("input", () => {
      button.url = urlInput.value
      renderPreview()
    })
    urlWrap.append(urlText, urlInput)

    grid.append(labelWrap, urlWrap)
    item.appendChild(grid)
    elements.buttonsContainer.appendChild(item)
  })
}

function createField() {
  if (state.fields.length >= state.limits.fields) {
    setStatus(`Maksimal ${state.limits.fields} field per embed.`, "error")
    return
  }

  state.fields.push({
    name: "",
    value: "",
    inline: false
  })

  renderFields()
}

function createButton() {
  if (state.buttons.length >= state.limits.buttons) {
    setStatus(`Maksimal ${state.limits.buttons} link button per pesan.`, "error")
    return
  }

  state.buttons.push({
    label: "",
    url: ""
  })

  renderButtons()
}

function renderChannelOptions() {
  const currentValue = elements.channelSelect.value
  elements.channelSelect.innerHTML = ""

  if (!state.channels.length) {
    const option = document.createElement("option")
    option.value = ""
    option.textContent = "Tidak ada channel tersedia"
    elements.channelSelect.appendChild(option)
    return
  }

  state.channels.forEach((guildEntry) => {
    const group = document.createElement("optgroup")
    group.label = guildEntry.guildName

    guildEntry.channels.forEach((channel) => {
      const option = document.createElement("option")
      option.value = channel.id
      option.textContent = `#${channel.name}`
      group.appendChild(option)
    })

    elements.channelSelect.appendChild(group)
  })

  const flattened = state.channels.flatMap((entry) => entry.channels)
  elements.channelSelect.value = flattened.some((channel) => channel.id === currentValue)
    ? currentValue
    : flattened[0]?.id || ""
}

function renderTemplateOptions() {
  const currentValue = state.currentTemplateId || elements.templateSelect.value
  elements.templateSelect.innerHTML = ""

  const emptyOption = document.createElement("option")
  emptyOption.value = ""
  emptyOption.textContent = "Draft baru"
  elements.templateSelect.appendChild(emptyOption)

  state.templates.forEach((template) => {
    const option = document.createElement("option")
    option.value = template.id
    option.textContent = template.name
    elements.templateSelect.appendChild(option)
  })

  elements.templateSelect.value = state.templates.some((template) => template.id === currentValue)
    ? currentValue
    : ""
  state.currentTemplateId = elements.templateSelect.value
}

function applyPayloadToForm(payload = {}) {
  elements.channelSelect.value = payload.channelId || elements.channelSelect.value
  elements.messageContent.value = payload.messageContent || ""
  elements.embedTitle.value = payload.embed?.title || ""
  elements.embedColor.value = normalizeColor(payload.embed?.color)
  elements.embedDescription.value = payload.embed?.description || ""
  elements.authorName.value = payload.embed?.authorName || ""
  elements.authorIconUrl.value = payload.embed?.authorIconUrl || ""
  elements.authorUrl.value = payload.embed?.authorUrl || ""
  elements.thumbnailUrl.value = payload.embed?.thumbnailUrl || ""
  elements.imageUrl.value = payload.embed?.imageUrl || ""
  elements.footerText.value = payload.embed?.footerText || ""
  elements.footerIconUrl.value = payload.embed?.footerIconUrl || ""
  elements.timestampToggle.checked = Boolean(payload.embed?.timestamp)

  state.fields = Array.isArray(payload.embed?.fields)
    ? payload.embed.fields.map((field) => ({
      name: field.name || "",
      value: field.value || "",
      inline: Boolean(field.inline)
    }))
    : []

  state.buttons = Array.isArray(payload.buttons)
    ? payload.buttons.map((button) => ({
      label: button.label || "",
      url: button.url || ""
    }))
    : []

  renderFields()
  renderButtons()
  renderPreview()
}

function applyFormatWrapper(element, prefix, suffix, placeholder = "text") {
  const start = element.selectionStart ?? element.value.length
  const end = element.selectionEnd ?? element.value.length
  const selected = element.value.slice(start, end) || placeholder
  const nextValue = `${element.value.slice(0, start)}${prefix}${selected}${suffix}${element.value.slice(end)}`

  element.value = nextValue
  element.focus()
  element.selectionStart = start + prefix.length
  element.selectionEnd = start + prefix.length + selected.length
  element.dispatchEvent(new Event("input", { bubbles: true }))
}

function transformSelectedLines(element, lineFormatter) {
  const start = element.selectionStart ?? 0
  const end = element.selectionEnd ?? 0
  const value = element.value
  const blockStart = value.lastIndexOf("\n", start - 1) + 1
  const nextNewLine = value.indexOf("\n", end)
  const blockEnd = nextNewLine === -1 ? value.length : nextNewLine
  const selectedBlock = value.slice(blockStart, blockEnd)
  const transformed = selectedBlock
    .split("\n")
    .map((line, index) => lineFormatter(line, index))
    .join("\n")

  element.value = `${value.slice(0, blockStart)}${transformed}${value.slice(blockEnd)}`
  element.focus()
  element.selectionStart = blockStart
  element.selectionEnd = blockStart + transformed.length
  element.dispatchEvent(new Event("input", { bubbles: true }))
}

function applyToolbarAction(action) {
  const element = state.focusedElement

  if (!element) {
    setStatus("Pilih textarea dulu sebelum pakai formatting toolbar.", "error")
    return
  }

  if (action === "bold") {
    applyFormatWrapper(element, "**", "**", "bold text")
    return
  }

  if (action === "italic") {
    applyFormatWrapper(element, "*", "*", "italic text")
    return
  }

  if (action === "underline") {
    applyFormatWrapper(element, "__", "__", "underlined text")
    return
  }

  if (action === "strike") {
    applyFormatWrapper(element, "~~", "~~", "strikethrough text")
    return
  }

  if (action === "spoiler") {
    applyFormatWrapper(element, "||", "||", "spoiler text")
    return
  }

  if (action === "code") {
    applyFormatWrapper(element, "`", "`", "inline code")
    return
  }

  if (action === "codeblock") {
    const start = element.selectionStart ?? element.value.length
    const end = element.selectionEnd ?? element.value.length
    const selected = element.value.slice(start, end) || "code block"
    const block = `\`\`\`\n${selected}\n\`\`\``
    element.value = `${element.value.slice(0, start)}${block}${element.value.slice(end)}`
    element.focus()
    element.selectionStart = start + 4
    element.selectionEnd = start + 4 + selected.length
    element.dispatchEvent(new Event("input", { bubbles: true }))
    return
  }

  if (action === "quote") {
    transformSelectedLines(element, (line) => line.startsWith("> ") ? line : `> ${line || "quoted text"}`)
    return
  }

  if (action === "bullet") {
    transformSelectedLines(element, (line) => line.startsWith("- ") ? line : `- ${line || "list item"}`)
    return
  }

  if (action === "number") {
    transformSelectedLines(element, (line, index) => `${index + 1}. ${line.replace(/^\d+\.\s*/, "") || "list item"}`)
  }
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text)

  html = html.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler">$1</span>')
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/__([\s\S]+?)__/g, "<u>$1</u>")
  html = html.replace(/~~([\s\S]+?)~~/g, "<s>$1</s>")
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>")
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>')

  return html
}

function renderMarkdown(text) {
  const raw = String(text || "")

  if (!raw.trim()) {
    return ""
  }

  const codeBlocks = []
  let working = raw.replace(/```([\s\S]*?)```/g, (_, code) => {
    const token = `@@CODEBLOCK_${codeBlocks.length}@@`
    codeBlocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`)
    return token
  })

  const lines = working.split("\n")
  const htmlChunks = []
  let listType = null

  function closeList() {
    if (listType) {
      htmlChunks.push(listType === "ol" ? "</ol>" : "</ul>")
      listType = null
    }
  }

  for (const line of lines) {
    if (/^\s*-\s+/.test(line)) {
      if (listType !== "ul") {
        closeList()
        htmlChunks.push("<ul>")
        listType = "ul"
      }

      htmlChunks.push(`<li>${renderInlineMarkdown(line.replace(/^\s*-\s+/, ""))}</li>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      if (listType !== "ol") {
        closeList()
        htmlChunks.push("<ol>")
        listType = "ol"
      }

      htmlChunks.push(`<li>${renderInlineMarkdown(line.replace(/^\s*\d+\.\s+/, ""))}</li>`)
      continue
    }

    closeList()

    if (/^\s*>\s?/.test(line)) {
      htmlChunks.push(`<blockquote>${renderInlineMarkdown(line.replace(/^\s*>\s?/, ""))}</blockquote>`)
      continue
    }

    if (!line.trim()) {
      htmlChunks.push("<br>")
      continue
    }

    htmlChunks.push(`<div>${renderInlineMarkdown(line)}</div>`)
  }

  closeList()

  let html = htmlChunks.join("")
  codeBlocks.forEach((block, index) => {
    html = html.replace(`@@CODEBLOCK_${index}@@`, block)
  })

  return html
}

function renderPreview() {
  const payload = getCurrentPayload()
  const hasEmbed = Boolean(
    payload.embed.title
    || payload.embed.description
    || payload.embed.authorName
    || payload.embed.footerText
    || safeUrl(payload.embed.thumbnailUrl)
    || safeUrl(payload.embed.imageUrl)
    || payload.embed.fields.length
    || payload.embed.timestamp
  )

  const embedBorder = normalizeColor(payload.embed.color)
  const authorIcon = safeUrl(payload.embed.authorIconUrl)
  const thumbnail = safeUrl(payload.embed.thumbnailUrl)
  const image = safeUrl(payload.embed.imageUrl)
  const footerIcon = safeUrl(payload.embed.footerIconUrl)

  const messageContent = payload.messageContent
    ? `<div class="discord-content markdown">${renderMarkdown(payload.messageContent)}</div>`
    : ""

  const authorBlock = payload.embed.authorName
    ? `
      <div class="embed-author embed-author-row">
        ${authorIcon ? `<img class="mini-icon" src="${escapeHtml(authorIcon)}" alt="">` : ""}
        ${payload.embed.authorUrl
          ? `<a href="${escapeHtml(payload.embed.authorUrl)}" target="_blank" rel="noreferrer">${escapeHtml(payload.embed.authorName)}</a>`
          : `<span>${escapeHtml(payload.embed.authorName)}</span>`}
      </div>
    `
    : ""

  const titleBlock = payload.embed.title
    ? `<div class="embed-title markdown">${renderMarkdown(payload.embed.title)}</div>`
    : ""

  const descriptionBlock = payload.embed.description
    ? `<div class="embed-description markdown">${renderMarkdown(payload.embed.description)}</div>`
    : ""

  const fieldsBlock = payload.embed.fields.length
    ? `
      <div class="embed-fields">
        ${payload.embed.fields.map((field) => `
          <div class="embed-field ${field.inline ? "" : "full-width"}">
            <div class="embed-field-name markdown">${renderMarkdown(field.name)}</div>
            <div class="markdown">${renderMarkdown(field.value)}</div>
          </div>
        `).join("")}
      </div>
    `
    : ""

  const footerParts = []

  if (payload.embed.footerText) {
    footerParts.push(`
      <div class="embed-footer embed-footer-row">
        ${footerIcon ? `<img class="mini-icon" src="${escapeHtml(footerIcon)}" alt="">` : ""}
        <span>${escapeHtml(payload.embed.footerText)}</span>
      </div>
    `)
  }

  if (payload.embed.timestamp) {
    footerParts.push(`<div class="embed-footer">${new Date().toLocaleString("id-ID")}</div>`)
  }

  const embedBlock = hasEmbed
    ? `
      <div class="discord-embed" style="border-left-color: ${escapeHtml(embedBorder)}">
        ${authorBlock}
        <div class="embed-header">
          <div class="embed-main">
            ${titleBlock}
            ${descriptionBlock}
          </div>
          ${thumbnail ? `<img class="embed-thumbnail" src="${escapeHtml(thumbnail)}" alt="">` : ""}
        </div>
        ${fieldsBlock}
        ${image ? `<img class="embed-image" src="${escapeHtml(image)}" alt="">` : ""}
        ${footerParts.join("")}
      </div>
    `
    : ""

  const buttonsBlock = payload.buttons.length
    ? `
      <div class="button-preview-row">
        ${payload.buttons.map((button) => `
          <a class="button-preview" href="${escapeHtml(button.url)}" target="_blank" rel="noreferrer">
            ${escapeHtml(button.label)}
          </a>
        `).join("")}
      </div>
    `
    : ""

  const emptyState = !messageContent && !embedBlock
    ? '<div class="preview-empty">Mulai isi content atau embed untuk melihat preview Discord di sini.</div>'
    : ""

  elements.previewRoot.innerHTML = `
    <div class="discord-message">
      <div class="discord-avatar"></div>
      <div>
        <div class="discord-author">
          Sokaze Assistant
          <span class="discord-meta">Today at ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        ${messageContent}
        ${embedBlock}
        ${buttonsBlock}
        ${emptyState}
      </div>
    </div>
  `
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  })

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { ok: false, error: "Respons server tidak valid." }
  }

  if (response.status === 401) {
    elements.loginOverlay.classList.remove("hidden")
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data?.error || "Request gagal.")
  }

  return data
}

async function bootstrap() {
  const data = await request("/api/embed-builder/bootstrap", {
    method: "GET",
    headers: {}
  })

  state.channels = data.channels || []
  state.templates = data.templates || []
  state.limits = data.limits || state.limits

  renderChannelOptions()
  renderTemplateOptions()
  applyPayloadToForm({
    channelId: elements.channelSelect.value || "",
    embed: {
      color: "#111214"
    }
  })

  elements.loginOverlay.classList.add("hidden")
  elements.passwordInput.value = ""
  elements.loginError.textContent = ""
  setStatus("Embed builder siap dipakai.", "success")
}

function resetDraft() {
  state.currentTemplateId = ""
  elements.templateSelect.value = ""
  elements.templateNameInput.value = ""
  applyPayloadToForm({
    channelId: elements.channelSelect.value || "",
    messageContent: "",
    embed: {
      color: "#111214"
    },
    buttons: []
  })
}

function loadTemplate(templateId) {
  const template = state.templates.find((entry) => entry.id === templateId)

  if (!template) {
    resetDraft()
    return
  }

  state.currentTemplateId = template.id
  elements.templateNameInput.value = template.name
  applyPayloadToForm(template.payload)
  setStatus(`Template "${template.name}" dimuat.`, "success")
}

async function initialize() {
  document.querySelectorAll("[data-format]").forEach((button) => {
    if (button.dataset.format === "bullet") {
      button.innerHTML = "&bull;"
    }
  })

  bindFocusTracking()
  renderFields()
  renderButtons()
  renderPreview()

  document.querySelectorAll("[data-format]").forEach((button) => {
    button.addEventListener("click", () => applyToolbarAction(button.dataset.format))
  })

  document.querySelectorAll("input, select, textarea").forEach((element) => {
    element.addEventListener("input", renderPreview)
    element.addEventListener("change", renderPreview)
  })

  elements.channelSelect.addEventListener("change", renderPreview)
  elements.templateSelect.addEventListener("change", () => {
    state.currentTemplateId = elements.templateSelect.value
  })

  elements.addFieldButton.addEventListener("click", () => {
    createField()
    renderPreview()
  })

  elements.addButtonButton.addEventListener("click", () => {
    createButton()
    renderPreview()
  })

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault()

    try {
      elements.loginError.textContent = ""
      await request("/api/embed-builder/login", {
        method: "POST",
        body: JSON.stringify({
          password: elements.passwordInput.value
        })
      })
      await bootstrap()
    } catch (error) {
      elements.loginError.textContent = error.message || "Login gagal."
    }
  })

  elements.logoutButton.addEventListener("click", async () => {
    try {
      await request("/api/embed-builder/logout", {
        method: "POST"
      })
    } catch {}

    elements.loginOverlay.classList.remove("hidden")
    setStatus("Session ditutup.")
  })

  elements.loadTemplateButton.addEventListener("click", () => {
    if (!elements.templateSelect.value) {
      resetDraft()
      setStatus("Draft baru dibuka.")
      return
    }

    loadTemplate(elements.templateSelect.value)
  })

  elements.deleteTemplateButton.addEventListener("click", async () => {
    if (!elements.templateSelect.value) {
      setStatus("Pilih template dulu sebelum menghapus.", "error")
      return
    }

    const selectedId = elements.templateSelect.value
    const selectedTemplate = state.templates.find((entry) => entry.id === selectedId)

    if (!window.confirm(`Hapus template "${selectedTemplate?.name || selectedId}"?`)) {
      return
    }

    try {
      await request(`/api/embed-builder/templates/${selectedId}`, {
        method: "DELETE",
        headers: {}
      })

      state.templates = state.templates.filter((template) => template.id !== selectedId)
      resetDraft()
      renderTemplateOptions()
      setStatus("Template dihapus.", "success")
    } catch (error) {
      setStatus(error.message, "error")
    }
  })

  elements.saveTemplateButton.addEventListener("click", async () => {
    const name = elements.templateNameInput.value.trim()

    if (!name) {
      setStatus("Isi nama template dulu sebelum menyimpan.", "error")
      return
    }

    try {
      const data = await request("/api/embed-builder/templates", {
        method: "POST",
        body: JSON.stringify({
          templateId: state.currentTemplateId || "",
          name,
          payload: getCurrentPayload()
        })
      })

      const existingIndex = state.templates.findIndex((template) => template.id === data.template.id)

      if (existingIndex >= 0) {
        state.templates[existingIndex] = data.template
      } else {
        state.templates.push(data.template)
      }

      state.templates.sort((left, right) => left.name.localeCompare(right.name))
      state.currentTemplateId = data.template.id
      renderTemplateOptions()
      elements.templateSelect.value = data.template.id
      setStatus(`Template "${data.template.name}" tersimpan.`, "success")
    } catch (error) {
      setStatus(error.message, "error")
    }
  })

  elements.sendButton.addEventListener("click", async () => {
    try {
      setStatus("Mengirim pesan ke Discord...")
      const data = await request("/api/embed-builder/send", {
        method: "POST",
        body: JSON.stringify(getCurrentPayload())
      })

      setStatus(`Pesan berhasil dikirim ke Discord. Message ID: ${data.result.messageId}`, "success")
    } catch (error) {
      setStatus(error.message, "error")
    }
  })

  try {
    await bootstrap()
  } catch {
    elements.loginOverlay.classList.remove("hidden")
    setStatus("Masuk dulu untuk membuka embed builder.")
  }
}

initialize()
