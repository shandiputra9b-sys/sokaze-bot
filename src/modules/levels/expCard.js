const { AttachmentBuilder } = require("discord.js");
const { Canvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
const path = require("node:path");

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

  return "serif";
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

function drawBackground(context, width, height) {
  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#08050a");
  base.addColorStop(0.45, "#12070d");
  base.addColorStop(1, "#040305");
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  context.save();
  context.filter = "blur(88px)";

  const redAura = context.createRadialGradient(180, 120, 25, 180, 120, 260);
  redAura.addColorStop(0, "rgba(142, 28, 49, 0.5)");
  redAura.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = redAura;
  context.fillRect(-80, -60, 480, 360);

  const goldAura = context.createRadialGradient(width - 180, height - 120, 30, width - 180, height - 120, 280);
  goldAura.addColorStop(0, "rgba(232, 191, 122, 0.34)");
  goldAura.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = goldAura;
  context.fillRect(width - 460, height - 360, 500, 380);
  context.restore();

  context.strokeStyle = "rgba(255, 255, 255, 0.05)";
  context.lineWidth = 1;
  drawRoundedRect(context, 22, 22, width - 44, height - 44, 32);
  context.stroke();
}

function drawShell(context, width, height) {
  context.fillStyle = "rgba(12, 9, 14, 0.82)";
  drawRoundedRect(context, 34, 34, width - 68, height - 68, 28);
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  drawRoundedRect(context, 34, 34, width - 68, height - 68, 28);
  context.stroke();

  context.fillStyle = "#c89c63";
  drawRoundedRect(context, 54, 54, 6, height - 108, 3);
  context.fill();
}

function drawPanel(context, x, y, width, height) {
  context.fillStyle = "rgba(255, 255, 255, 0.035)";
  drawRoundedRect(context, x, y, width, height, 24);
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  drawRoundedRect(context, x, y, width, height, 24);
  context.stroke();
}

function drawAvatar(context, avatar, member) {
  const x = 76;
  const y = 78;
  const size = 122;
  const centerX = x + (size / 2);
  const centerY = y + (size / 2);

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  if (avatar) {
    context.drawImage(avatar, x, y, size, size);
  } else {
    const fallback = context.createLinearGradient(x, y, x + size, y + size);
    fallback.addColorStop(0, "#31111a");
    fallback.addColorStop(1, "#14080d");
    context.fillStyle = fallback;
    context.fillRect(x, y, size, size);
    context.fillStyle = "#fff8ef";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `bold 52px "${getFontFamily("bold")}"`;
    context.fillText((member.displayName || member.user.username).charAt(0).toUpperCase(), centerX, centerY + 2);
    context.textAlign = "start";
    context.textBaseline = "alphabetic";
  }

  context.restore();

  const ring = context.createLinearGradient(x, y, x + size, y + size);
  ring.addColorStop(0, "#f5d0a8");
  ring.addColorStop(1, "#8e1f33");
  context.strokeStyle = ring;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(centerX, centerY, (size / 2) - 2, 0, Math.PI * 2);
  context.stroke();
}

function drawHeader(context, member, levelInfo) {
  context.fillStyle = "#d5b792";
  context.font = `bold 20px "${getFontFamily("bold")}"`;
  context.fillText("SOKAZE EXP CHRONICLE", 238, 84);

  context.fillStyle = "#fff7ef";
  context.font = `bold 46px "${getFontFamily("bold")}"`;
  context.fillText("EXPERIENCE", 238, 136);

  context.fillStyle = "#f3d8bf";
  context.font = `bold 33px "${getFontFamily("bold")}"`;
  context.fillText(fitText(context, member.displayName || member.user.username, 470), 238, 184);

  context.fillStyle = "#b69f8e";
  context.font = `17px "${getFontFamily()}"`;
  context.fillText(`@${fitText(context, member.user.username, 260)}`, 238, 214);

  context.fillStyle = "rgba(255, 236, 215, 0.08)";
  drawRoundedRect(context, 760, 72, 134, 44, 18);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  drawRoundedRect(context, 760, 72, 134, 44, 18);
  context.stroke();

  context.fillStyle = "#fff5eb";
  context.font = `bold 18px "${getFontFamily("bold")}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`${levelInfo.code} ${levelInfo.name}`, 827, 94);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(238, 244);
  context.lineTo(894, 244);
  context.stroke();
}

function drawMetric(context, x, y, width, label, value, caption) {
  drawPanel(context, x, y, width, 108);

  context.fillStyle = "#b8a092";
  context.font = `bold 15px "${getFontFamily("bold")}"`;
  context.fillText(label, x + 20, y + 28);

  context.fillStyle = "#fff7ef";
  context.font = `bold 30px "${getFontFamily("bold")}"`;
  context.fillText(value, x + 20, y + 68);

  context.fillStyle = "#cab8ac";
  context.font = `15px "${getFontFamily()}"`;
  context.fillText(caption, x + 20, y + 90);
}

function drawProgressPanel(context, levelInfo) {
  const panelX = 74;
  const panelY = 276;
  const panelWidth = 820;
  const panelHeight = 170;
  const barX = panelX + 28;
  const barY = panelY + 92;
  const barWidth = panelWidth - 56;
  const barHeight = 28;

  drawPanel(context, panelX, panelY, panelWidth, panelHeight);

  context.fillStyle = "#d5b792";
  context.font = `bold 18px "${getFontFamily("bold")}"`;
  context.fillText("XP PROGRESSION", panelX + 28, panelY + 34);

  context.fillStyle = "#fff7ef";
  context.font = `bold 28px "${getFontFamily("bold")}"`;
  context.fillText(
    levelInfo.level >= 5
      ? `${formatNumber(levelInfo.xp)} XP`
      : `${formatNumber(levelInfo.xp)} / ${formatNumber(levelInfo.nextThreshold)} XP`,
    panelX + 28,
    panelY + 70
  );

  context.fillStyle = "rgba(255, 255, 255, 0.05)";
  drawRoundedRect(context, barX, barY, barWidth, barHeight, 14);
  context.fill();

  const rawFillWidth = Math.round(barWidth * levelInfo.progressRatio);
  const fillWidth = levelInfo.progressRatio <= 0
    ? 0
    : Math.max(18, rawFillWidth);
  const progressGradient = context.createLinearGradient(barX, barY, barX + barWidth, barY);
  progressGradient.addColorStop(0, "#f4d19f");
  progressGradient.addColorStop(0.6, "#d69a64");
  progressGradient.addColorStop(1, "#8e1f33");
  context.fillStyle = levelInfo.level >= 5 ? "#f0c98e" : progressGradient;
  drawRoundedRect(context, barX, barY, levelInfo.level >= 5 ? barWidth : fillWidth, barHeight, 14);
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.09)";
  context.lineWidth = 1;
  drawRoundedRect(context, barX, barY, barWidth, barHeight, 14);
  context.stroke();

  context.fillStyle = "#cab8ac";
  context.font = `16px "${getFontFamily()}"`;
  context.fillText(
    levelInfo.level >= 5
      ? "Kamu sudah mencapai tier tertinggi Sokaze."
      : `Sisa ${formatNumber(levelInfo.remainingXp)} XP lagi menuju ${levelInfo.level + 1}.`,
    panelX + 28,
    panelY + 140
  );

  context.textAlign = "right";
  context.fillStyle = "#fff0df";
  context.font = `bold 16px "${getFontFamily("bold")}"`;
  context.fillText(
    levelInfo.level >= 5 ? "MAX TIER" : `${Math.round(levelInfo.progressRatio * 100)}%`,
    panelX + panelWidth - 28,
    panelY + 34
  );
  context.textAlign = "start";
}

function drawFooter(context, levelInfo) {
  const tierLabel = `${levelInfo.code} ${levelInfo.name}`;
  const lowerProgress = formatNumber(levelInfo.currentThreshold);
  const upperProgress = levelInfo.level >= 5 ? "MAX" : formatNumber(levelInfo.nextThreshold);

  context.fillStyle = "#8f7a72";
  context.font = `15px "${getFontFamily()}"`;
  context.fillText(`Tier saat ini: ${tierLabel}`, 76, 514);
  context.textAlign = "right";
  context.fillText(`Range XP: ${lowerProgress} -> ${upperProgress}`, 894, 514);
  context.textAlign = "start";
}

async function createExpCard(member, levelInfo) {
  const width = 968;
  const height = 560;
  const canvas = new Canvas(width, height);
  const context = canvas.getContext("2d");
  const avatar = await loadAvatarImage(member).catch(() => null);

  drawBackground(context, width, height);
  drawShell(context, width, height);
  drawAvatar(context, avatar, member);
  drawHeader(context, member, levelInfo);

  drawMetric(context, 74, 462 - 82, 188, "CURRENT LEVEL", String(levelInfo.level), tierLabel(levelInfo));
  drawMetric(
    context,
    282,
    462 - 82,
    250,
    "TOTAL XP",
    formatNumber(levelInfo.xp),
    levelInfo.level >= 5 ? "Puncak progression tercapai" : "Akumulasi loyalitas aktif"
  );
  drawMetric(
    context,
    552,
    462 - 82,
    342,
    "NEXT TARGET",
    levelInfo.level >= 5 ? "MAX TIER" : `${formatNumber(levelInfo.remainingXp)} XP`,
    levelInfo.level >= 5 ? "Tidak ada tier setelah ini" : `Menuju L${levelInfo.level + 1}`
  );

  drawProgressPanel(context, levelInfo);
  drawFooter(context, levelInfo);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "sokaze-exp-card.png"
  });
}

function tierLabel(levelInfo) {
  return `${levelInfo.code} ${levelInfo.name}`;
}

module.exports = {
  createExpCard
};
