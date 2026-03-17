const { AttachmentBuilder } = require("discord.js");
const { Canvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
const fs = require("node:fs");
const path = require("node:path");

const fontRegistered = GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeuib.ttf", "Segoe UI");
const assetsDirectory = path.join(__dirname, "..", "..", "..", "assets");
const preferredBackgroundCandidates = [
  path.join(assetsDirectory, "welcome-bg.jpg"),
  path.join(assetsDirectory, "welcome-bg.png"),
  path.join(assetsDirectory, "welcome-bg.webp")
];

function sanitizeHexColor(input, fallback = "#111111") {
  if (typeof input !== "string") {
    return fallback;
  }

  return /^#?[0-9a-fA-F]{6}$/.test(input)
    ? (input.startsWith("#") ? input : `#${input}`)
    : fallback;
}

function hexToRgba(hex, alpha) {
  const normalized = sanitizeHexColor(hex).replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

async function loadAvatar(member) {
  const avatarUrl = member.user.displayAvatarURL({
    extension: "png",
    forceStatic: true,
    size: 256
  });

  const response = await fetch(avatarUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch avatar: ${response.status}`);
  }

  const avatarBuffer = Buffer.from(await response.arrayBuffer());
  return loadImage(avatarBuffer);
}

function getBackgroundAssetPath() {
  const preferredAsset = preferredBackgroundCandidates.find((candidate) => fs.existsSync(candidate));

  if (preferredAsset) {
    return preferredAsset;
  }

  if (!fs.existsSync(assetsDirectory)) {
    return null;
  }

  const fallbackAsset = fs.readdirSync(assetsDirectory)
    .find((file) => /\.(png|jpe?g|webp)$/i.test(file));

  return fallbackAsset ? path.join(assetsDirectory, fallbackAsset) : null;
}

async function drawBackgroundImage(context, width, height) {
  const backgroundAssetPath = getBackgroundAssetPath();

  if (!backgroundAssetPath) {
    return false;
  }

  const backgroundImage = await loadImage(backgroundAssetPath);
  context.drawImage(backgroundImage, 0, 0, width, height);

  const leftOverlay = context.createLinearGradient(0, 0, width, 0);
  leftOverlay.addColorStop(0, "rgba(0, 0, 0, 0.68)");
  leftOverlay.addColorStop(0.45, "rgba(0, 0, 0, 0.42)");
  leftOverlay.addColorStop(1, "rgba(0, 0, 0, 0.30)");
  context.fillStyle = leftOverlay;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(8, 8, 8, 0.14)";
  context.fillRect(0, 0, width, height);

  return true;
}

function drawBackground(context, width, height, accentColor, skipBaseFill = false) {
  if (!skipBaseFill) {
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#050505");
    background.addColorStop(0.45, "#101010");
    background.addColorStop(1, "#030303");

    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  context.fillStyle = hexToRgba(accentColor, 0.16);
  context.beginPath();
  context.arc(90, 70, 190, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = hexToRgba(accentColor, 0.11);
  context.beginPath();
  context.arc(width - 30, height + 10, 230, 0, Math.PI * 2);
  context.fill();

  const meshGradient = context.createLinearGradient(0, 0, width, height);
  meshGradient.addColorStop(0, hexToRgba(accentColor, 0.08));
  meshGradient.addColorStop(1, "rgba(255, 255, 255, 0.01)");
  context.fillStyle = meshGradient;
  drawRoundedRect(context, 24, 24, width - 48, height - 48, 28);
  context.fill();

  context.strokeStyle = hexToRgba(accentColor, 0.28);
  context.lineWidth = 2;
  drawRoundedRect(context, 24, 24, width - 48, height - 48, 28);
  context.stroke();

  context.strokeStyle = hexToRgba("#ffffff", 0.08);
  context.lineWidth = 1;
  drawRoundedRect(context, 38, 38, width - 76, height - 76, 22);
  context.stroke();

  context.fillStyle = "rgba(255, 255, 255, 0.03)";
  drawRoundedRect(context, 54, 58, 250, 324, 24);
  context.fill();

  context.fillStyle = "rgba(255, 255, 255, 0.025)";
  drawRoundedRect(context, 324, 58, 582, 324, 24);
  context.fill();

  context.fillStyle = hexToRgba(accentColor, 0.9);
  drawRoundedRect(context, 326, 72, 176, 42, 20);
  context.fill();
}

function drawText(context, member, accentColor) {
  const primaryFont = fontRegistered ? "Segoe UI" : "sans-serif";
  const contentLeft = 326;
  const badgeTop = 72;
  const titleTop = 182;
  const subtitleTop = 214;
  const dividerTop = 238;
  const nameTop = 296;
  const usernameTop = 334;
  const metaLabelTop = 376;
  const metaValueTop = 404;
  const taglineTop = 404;

  context.shadowColor = "rgba(255, 255, 255, 0.32)";
  context.shadowBlur = 18;
  context.fillStyle = "#f7f7f7";
  context.font = `bold 32px "${primaryFont}"`;
  context.fillText("SOKAZE", contentLeft + 18, badgeTop + 30);
  context.shadowBlur = 0;

  context.fillStyle = "#ffffff";
  context.font = `bold 64px "${primaryFont}"`;
  context.fillText("WELCOME", contentLeft, titleTop);

  context.fillStyle = "#d2d2d2";
  context.font = `24px "${primaryFont}"`;
  context.fillText("A new soul enters the gateway", contentLeft + 2, subtitleTop);

  context.fillStyle = sanitizeHexColor(accentColor, "#2d2d2d");
  drawRoundedRect(context, contentLeft, dividerTop, 188, 6, 3);
  context.fill();

  context.fillStyle = "#d4d4d4";
  context.font = `bold 34px "${primaryFont}"`;
  context.fillText(member.displayName.slice(0, 24), contentLeft, nameTop);

  context.fillStyle = "#cfcfcf";
  context.font = `24px "${primaryFont}"`;
  context.fillText(`@${member.user.username}`.slice(0, 30), contentLeft, usernameTop);

  context.fillStyle = "#f0f0f0";
  context.font = `bold 16px "${primaryFont}"`;
  context.fillText("NEW MEMBER", contentLeft, metaLabelTop);

  context.fillStyle = "#d8d8d8";
  context.font = `22px "${primaryFont}"`;
  context.fillText(`Member #${member.guild.memberCount}`, contentLeft, metaValueTop);

  context.fillStyle = "#c6c6c6";
  context.font = `20px "${primaryFont}"`;
  context.fillText("Step into the dark. Stay sharp.", contentLeft + 228, taglineTop);
}

function drawAvatarFrame(context, accentColor) {
  const ringGradient = context.createLinearGradient(70, 120, 270, 320);
  ringGradient.addColorStop(0, hexToRgba(accentColor, 0.95));
  ringGradient.addColorStop(1, "rgba(255, 255, 255, 0.18)");
  const badgeLeft = 82;
  const badgeTop = 336;
  const badgeWidth = 176;
  const badgeHeight = 32;

  context.fillStyle = "#0c0c0c";
  drawRoundedRect(context, 82, 132, 176, 176, 40);
  context.fill();

  context.strokeStyle = ringGradient;
  context.lineWidth = 4;
  drawRoundedRect(context, 74, 124, 192, 192, 48);
  context.stroke();

  context.strokeStyle = hexToRgba("#ffffff", 0.12);
  context.lineWidth = 1;
  drawRoundedRect(context, 66, 116, 208, 208, 56);
  context.stroke();

  context.fillStyle = "rgba(10, 10, 10, 0.72)";
  drawRoundedRect(context, badgeLeft, badgeTop, badgeWidth, badgeHeight, 16);
  context.fill();

  context.strokeStyle = hexToRgba(accentColor, 0.22);
  context.lineWidth = 1;
  drawRoundedRect(context, badgeLeft, badgeTop, badgeWidth, badgeHeight, 16);
  context.stroke();

  context.fillStyle = "#f1f1f1";
  context.font = `bold 15px "${fontRegistered ? "Segoe UI" : "sans-serif"}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("SOKAZE ENTRY", badgeLeft + (badgeWidth / 2), badgeTop + (badgeHeight / 2) + 1);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";
}

function drawAvatarPlaceholderGlow(context, accentColor) {
  context.fillStyle = hexToRgba(accentColor, 0.1);
  context.beginPath();
  context.arc(170, 220, 112, 0, Math.PI * 2);
  context.fill();
}

function drawAvatarFallback(context, member, accentColor) {
  const primaryFont = fontRegistered ? "Segoe UI" : "sans-serif";
  const fallbackColor = sanitizeHexColor(accentColor, "#111111");

  const fallbackGradient = context.createLinearGradient(74, 124, 266, 316);
  fallbackGradient.addColorStop(0, hexToRgba(fallbackColor, 0.85));
  fallbackGradient.addColorStop(1, "rgba(255, 255, 255, 0.14)");
  context.fillStyle = fallbackGradient;
  context.fillRect(74, 124, 192, 192);

  context.fillStyle = "#f3f3f3";
  context.font = `bold 86px "${primaryFont}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(member.displayName.charAt(0).toUpperCase(), 170, 220);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";
}

function clipAvatarCircle(context) {
  context.save();
  drawRoundedRect(context, 74, 124, 192, 192, 44);
  context.clip();
}

function restoreAvatarCircle(context) {
  context.restore();
}

async function createWelcomeCard(member, accentColor) {
  const width = 960;
  const height = 460;
  const canvas = new Canvas(width, height);
  const context = canvas.getContext("2d");

  const usedBackgroundImage = await drawBackgroundImage(context, width, height);

  if (!usedBackgroundImage) {
    drawBackground(context, width, height, accentColor);
  } else {
    drawBackground(context, width, height, accentColor, true);
    context.fillStyle = "rgba(0, 0, 0, 0.14)";
    drawRoundedRect(context, 24, 24, width - 48, height - 48, 28);
    context.fill();
  }

  drawAvatarPlaceholderGlow(context, accentColor);
  drawAvatarFrame(context, accentColor);

  try {
    const avatar = await loadAvatar(member);
    clipAvatarCircle(context);
    context.drawImage(avatar, 74, 124, 192, 192);
    restoreAvatarCircle(context);
  } catch (error) {
    console.error("Failed to render welcome avatar:", error);
    clipAvatarCircle(context);
    drawAvatarFallback(context, member, accentColor);
    restoreAvatarCircle(context);
  }

  drawText(context, member, accentColor);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "welcome-card.png"
  });
}

module.exports = {
  createWelcomeCard
};
