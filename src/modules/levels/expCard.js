const { AttachmentBuilder } = require("discord.js");
const { Canvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
const path = require("node:path");
const {
  getExpCardConfig,
  normalizeExpCardConfig
} = require("../../services/expCardConfigStore");

const assetsDirectory = path.join(__dirname, "..", "..", "..", "assets");
const customFontPath = path.join(assetsDirectory, "font.otf");

const regularFontRegistered = GlobalFonts.registerFromPath(customFontPath, "Sokaze Gothic");
const boldFontRegistered = GlobalFonts.registerFromPath(customFontPath, "Sokaze Gothic Bold");
const fallbackRegularRegistered = GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeui.ttf", "Segoe UI");
const fallbackBoldRegistered = GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeuib.ttf", "Segoe UI Bold");

function getFontFamily(weight = "regular") {
  if (weight === "bold" && boldFontRegistered) {
    return "Sokaze Gothic Bold";
  }

  if (regularFontRegistered) {
    return "Sokaze Gothic";
  }

  if (weight === "bold" && fallbackBoldRegistered) {
    return "Segoe UI Bold";
  }

  if (fallbackRegularRegistered) {
    return "Segoe UI";
  }

  return "sans-serif";
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function fitText(context, value, maxWidth, fallback = "-") {
  const text = String(value || fallback);

  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;

  while (trimmed.length > 1 && context.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Math.max(0, Number(value || 0)));
}

async function loadRemoteImage(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  return loadImage(Buffer.from(await response.arrayBuffer()));
}

async function loadAvatarImage(member) {
  const avatarUrl = member.user.displayAvatarURL({
    extension: "png",
    forceStatic: true,
    size: 512
  });

  return loadRemoteImage(avatarUrl);
}

function drawBackground(context, width, height, config) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, config.background.baseStart);
  gradient.addColorStop(1, config.background.baseEnd);
  context.fillStyle = gradient;
  drawRoundedRect(context, 0, 0, width, height, config.borderRadius);
  context.fill();

  context.save();
  context.filter = "blur(34px)";
  const glow = context.createRadialGradient(width - 120, height / 2, 12, width - 120, height / 2, 180);
  glow.addColorStop(0, config.background.accentGlow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = glow;
  context.fillRect(width - 280, -30, 320, height + 60);
  context.restore();

  context.strokeStyle = config.background.border;
  context.lineWidth = 1;
  drawRoundedRect(context, 0.5, 0.5, width - 1, height - 1, config.borderRadius);
  context.stroke();
}

function drawAvatar(context, avatar, member, config) {
  const x = config.avatar.x;
  const y = config.avatar.y;
  const size = config.avatar.size;

  context.save();
  drawRoundedRect(context, x, y, size, size, config.avatar.radius);
  context.clip();

  if (avatar) {
    context.drawImage(avatar, x, y, size, size);
  } else {
    const fallback = context.createLinearGradient(x, y, x + size, y + size);
    fallback.addColorStop(0, "#4a4f55");
    fallback.addColorStop(1, "#262a2f");
    context.fillStyle = fallback;
    context.fillRect(x, y, size, size);
    context.fillStyle = "#f4f7fb";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `bold ${Math.round(size * 0.44)}px "${getFontFamily("bold")}"`;
    context.fillText((member.displayName || member.user.username).charAt(0).toUpperCase(), x + (size / 2), y + (size / 2));
    context.textAlign = "start";
    context.textBaseline = "alphabetic";
  }

  context.restore();
}

function drawTexts(context, member, levelInfo, config) {
  context.fillStyle = config.username.color;
  context.font = `bold ${config.username.size}px "${getFontFamily("bold")}"`;
  context.textAlign = "start";
  context.fillText(
    fitText(context, member.displayName || member.user.username, config.progress.x - config.username.x - 18),
    config.username.x,
    config.username.y
  );

  context.fillStyle = config.xp.color;
  context.font = `${config.xp.size}px "${getFontFamily()}"`;
  context.textAlign = "right";
  context.fillText(`${formatNumber(levelInfo.xp)} ${config.xp.suffix}`, config.xp.textX, config.xp.y);

  context.fillStyle = config.level.color;
  context.font = `${config.level.size}px "${getFontFamily()}"`;
  context.textAlign = "start";
  context.fillText(`${config.level.prefix} ${levelInfo.level}`, config.level.x, config.level.y);
}

function drawBadge(context, config) {
  if (!config.badge?.enabled) {
    return;
  }

  context.fillStyle = config.badge.fill;
  drawRoundedRect(context, config.badge.x, config.badge.y, config.badge.width, config.badge.height, config.badge.radius);
  context.fill();

  context.strokeStyle = config.badge.border;
  context.lineWidth = 1;
  drawRoundedRect(context, config.badge.x, config.badge.y, config.badge.width, config.badge.height, config.badge.radius);
  context.stroke();

  context.fillStyle = config.badge.textColor;
  context.font = `bold ${config.badge.textSize}px "${getFontFamily("bold")}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(config.badge.text, config.badge.textCenterX, config.badge.textCenterY);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";
}

function drawProgress(context, levelInfo, config) {
  const x = config.progress.x;
  const y = config.progress.y;
  const width = config.progress.width;
  const height = config.progress.height;
  const fillWidth = levelInfo.level >= 5
    ? width
    : Math.max(0, Math.round(width * Math.max(0, Math.min(1, levelInfo.progressRatio))));

  context.fillStyle = config.progress.background;
  drawRoundedRect(context, x, y, width, height, config.progress.radius);
  context.fill();

  if (fillWidth > 0) {
    const fill = context.createLinearGradient(x, y, x + width, y);
    fill.addColorStop(0, config.progress.fillStart);
    fill.addColorStop(1, config.progress.fillEnd);
    context.fillStyle = fill;
    drawRoundedRect(context, x, y, fillWidth, height, config.progress.radius);
    context.fill();
  }

  context.strokeStyle = config.progress.border;
  context.lineWidth = 1;
  drawRoundedRect(context, x, y, width, height, config.progress.radius);
  context.stroke();
}

async function createExpCard(member, levelInfo, configOverride = null) {
  const config = configOverride
    ? normalizeExpCardConfig(configOverride)
    : getExpCardConfig();
  const canvas = new Canvas(config.width, config.height);
  const context = canvas.getContext("2d");
  const avatar = await loadAvatarImage(member).catch(() => null);

  drawBackground(context, config.width, config.height, config);
  drawAvatar(context, avatar, member, config);
  drawTexts(context, member, levelInfo, config);
  drawBadge(context, config);
  drawProgress(context, levelInfo, config);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "sokaze-exp-card.png"
  });
}

module.exports = {
  createExpCard
};
