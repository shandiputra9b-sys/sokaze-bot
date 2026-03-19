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
  base.addColorStop(0, "#0b0710");
  base.addColorStop(0.55, "#180811");
  base.addColorStop(1, "#050406");
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  context.save();
  context.filter = "blur(70px)";
  const redAura = context.createRadialGradient(170, 90, 24, 170, 90, 240);
  redAura.addColorStop(0, "rgba(174, 36, 59, 0.55)");
  redAura.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = redAura;
  context.fillRect(-60, -40, 420, 320);

  const goldAura = context.createRadialGradient(width - 150, height - 90, 30, width - 150, height - 90, 260);
  goldAura.addColorStop(0, "rgba(255, 185, 96, 0.38)");
  goldAura.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = goldAura;
  context.fillRect(width - 420, height - 300, 440, 320);
  context.restore();

  context.strokeStyle = "rgba(255, 255, 255, 0.05)";
  context.lineWidth = 1;
  drawRoundedRect(context, 22, 22, width - 44, height - 44, 32);
  context.stroke();
}

function drawFrame(context, width, height) {
  context.fillStyle = "rgba(13, 10, 16, 0.8)";
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

function drawAvatar(context, avatar, member) {
  const x = 74;
  const y = 78;
  const size = 124;
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

function drawHeader(context, member, previousLevelInfo, nextLevelInfo) {
  context.fillStyle = "#d5b792";
  context.font = `bold 20px "${getFontFamily("bold")}"`;
  context.fillText("SOKAZE GOTHIC ASCENSION", 238, 84);

  context.fillStyle = "#fff7ef";
  context.font = `bold 48px "${getFontFamily("bold")}"`;
  context.fillText("LEVEL UP", 238, 136);

  context.fillStyle = "#f3d8bf";
  context.font = `bold 34px "${getFontFamily("bold")}"`;
  context.fillText(fitText(context, member.displayName || member.user.username, 470), 238, 184);

  context.fillStyle = "#b69f8e";
  context.font = `17px "${getFontFamily()}"`;
  context.fillText(`@${fitText(context, member.user.username, 260)}`, 238, 214);

  context.fillStyle = "#ead8c5";
  context.font = `19px "${getFontFamily()}"`;
  context.fillText(
    `Naik dari ${previousLevelInfo.code} ${previousLevelInfo.name} ke ${nextLevelInfo.code} ${nextLevelInfo.name}`,
    238,
    258
  );
}

function drawTierPanel(context, x, y, title, value, accent) {
  context.fillStyle = "rgba(255, 255, 255, 0.03)";
  drawRoundedRect(context, x, y, 188, 104, 22);
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  drawRoundedRect(context, x, y, 188, 104, 22);
  context.stroke();

  context.fillStyle = accent;
  context.font = `bold 15px "${getFontFamily("bold")}"`;
  context.fillText(title, x + 22, y + 30);

  context.fillStyle = "#fff7ef";
  context.font = `bold 34px "${getFontFamily("bold")}"`;
  context.fillText(value, x + 22, y + 74);
}

function drawQuote(context, nextLevelInfo) {
  const lines = [
    "Loyalitasmu tidak lewat begitu saja.",
    `Sokaze sekarang mengenalmu sebagai ${nextLevelInfo.name}.`
  ];

  context.fillStyle = "rgba(255,255,255,0.035)";
  drawRoundedRect(context, 74, 340, 802, 102, 24);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.08)";
  drawRoundedRect(context, 74, 340, 802, 102, 24);
  context.stroke();

  context.fillStyle = "#f4e7da";
  context.font = `bold 24px "${getFontFamily("bold")}"`;
  context.fillText(lines[0], 102, 384);
  context.font = `20px "${getFontFamily()}"`;
  context.fillStyle = "#d5c0b0";
  context.fillText(lines[1], 102, 417);
}

function drawFooter(context, nextLevelInfo) {
  context.fillStyle = "#8f7a72";
  context.font = `15px "${getFontFamily()}"`;
  context.fillText(`Tier baru terbuka: ${nextLevelInfo.code} ${nextLevelInfo.name}`, 76, 494);
  context.textAlign = "right";
  context.fillText("Sokaze Loyalty Progression", 874, 494);
  context.textAlign = "start";
}

async function createLevelUpCard(member, previousLevelInfo, nextLevelInfo) {
  const width = 950;
  const height = 540;
  const canvas = new Canvas(width, height);
  const context = canvas.getContext("2d");
  const avatar = await loadAvatarImage(member).catch(() => null);

  drawBackground(context, width, height);
  drawFrame(context, width, height);
  drawAvatar(context, avatar, member);
  drawHeader(context, member, previousLevelInfo, nextLevelInfo);
  drawTierPanel(context, 74, 466 - 86, "PREVIOUS", previousLevelInfo.code, "#d6b38d");
  drawTierPanel(context, 284, 466 - 86, "CURRENT", nextLevelInfo.code, "#f6d49e");
  drawTierPanel(context, 494, 466 - 86, "TITLE", nextLevelInfo.name.toUpperCase(), "#d58d8d");
  drawQuote(context, nextLevelInfo);
  drawFooter(context, nextLevelInfo);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "sokaze-level-up.png"
  });
}

module.exports = {
  createLevelUpCard
};
