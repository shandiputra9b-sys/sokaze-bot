const path = require("node:path");
const { AttachmentBuilder } = require("discord.js");
const { Canvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");

const fontRegistered = GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeui.ttf", "Segoe UI");
const boldFontRegistered = GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeuib.ttf", "Segoe UI Bold");
const assetsDirectory = path.join(__dirname, "..", "..", "..", "assets", "streak-emojis");

function getFontFamily(weight = "normal") {
  if (weight === "bold" && boldFontRegistered) {
    return "Segoe UI Bold";
  }

  return fontRegistered ? "Segoe UI" : "sans-serif";
}

function createSeededRandom(seed) {
  let state = 2166136261;

  for (const character of seed) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
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

async function loadRemoteImage(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return loadImage(buffer);
}

async function loadAvatarImage(user) {
  const avatarUrl = user.displayAvatarURL({
    extension: "png",
    forceStatic: true,
    size: 512
  });

  return loadRemoteImage(avatarUrl);
}

async function loadTierFlameImage(assetFile) {
  return loadImage(path.join(assetsDirectory, assetFile));
}

function truncateText(value, maxLength = 18) {
  if (!value) {
    return "-";
  }

  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value;
}

function drawBackground(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0f0f10");
  gradient.addColorStop(1, "#171718");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 255, 255, 0.02)";
  drawRoundedRect(context, 18, 18, width - 36, height - 36, 22);
  context.fill();
}

function drawAvatarCircle(context, avatar, x, y, size, fallbackLetter) {
  context.save();
  context.beginPath();
  context.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  if (avatar) {
    context.drawImage(avatar, x, y, size, size);
  } else {
    const fallbackGradient = context.createLinearGradient(x, y, x + size, y + size);
    fallbackGradient.addColorStop(0, "#2a2a2b");
    fallbackGradient.addColorStop(1, "#151516");
    context.fillStyle = fallbackGradient;
    context.fillRect(x, y, size, size);
    context.fillStyle = "#f5f5f5";
    context.font = `bold 52px "${getFontFamily("bold")}"`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(fallbackLetter, x + (size / 2), y + (size / 2) + 2);
  }

  context.restore();

  context.strokeStyle = "rgba(255, 255, 255, 0.92)";
  context.lineWidth = 6;
  context.beginPath();
  context.arc(x + (size / 2), y + (size / 2), (size / 2) - 3, 0, Math.PI * 2);
  context.stroke();
}

function drawNames(context, leftUser, rightUser, width) {
  context.fillStyle = "#f7f7f7";
  context.font = `bold 27px "${getFontFamily("bold")}"`;
  context.textAlign = "center";

  context.fillText(truncateText(leftUser.globalName || leftUser.username, 16), 150, 262);
  context.fillText(truncateText(rightUser.globalName || rightUser.username, 16), width - 150, 262);
}

function drawMainFlame(context, flameImage) {
  context.save();
  context.shadowColor = "rgba(255, 132, 36, 0.30)";
  context.shadowBlur = 30;
  context.drawImage(flameImage, 320, 42, 160, 160);
  context.restore();
}

function isPointInsideSafeZone(x, y, safeZones) {
  return safeZones.some((zone) =>
    x >= zone.x
    && x <= zone.x + zone.width
    && y >= zone.y
    && y <= zone.y + zone.height
  );
}

function drawDecorativeFlames(context, flameImage, streakCount, seed) {
  const random = createSeededRandom(seed);
  const safeZones = [
    { x: 70, y: 46, width: 170, height: 220 },
    { x: 285, y: 30, width: 230, height: 250 },
    { x: 560, y: 46, width: 170, height: 220 }
  ];
  const sizeProfile = streakCount <= 12
    ? { min: 18, max: 34 }
    : streakCount <= 40
      ? { min: 12, max: 24 }
      : streakCount <= 120
        ? { min: 8, max: 16 }
        : { min: 4, max: 12 };

  for (let index = 0; index < streakCount; index += 1) {
    const size = sizeProfile.min + ((sizeProfile.max - sizeProfile.min) * random());
    let x = random() * (800 - size);
    let y = random() * (320 - size);
    let tries = 0;

    while (isPointInsideSafeZone(x, y, safeZones) && tries < 12) {
      x = random() * (800 - size);
      y = random() * (320 - size);
      tries += 1;
    }

    context.save();
    context.globalAlpha = 0.05 + (random() * 0.22);
    context.translate(x + (size / 2), y + (size / 2));
    context.rotate((random() - 0.5) * 0.55);
    context.drawImage(flameImage, -(size / 2), -(size / 2), size, size);
    context.restore();
  }
}

function drawCounter(context, streakCount) {
  context.fillStyle = "#ffffff";
  context.font = `bold 54px "${getFontFamily("bold")}"`;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText(String(streakCount), 400, 300);
}

async function createStreakNotificationCard({
  leftUser,
  rightUser,
  streakCount,
  tier
}) {
  const width = 800;
  const height = 320;
  const canvas = new Canvas(width, height);
  const context = canvas.getContext("2d");

  drawBackground(context, width, height);

  const [leftAvatar, rightAvatar, flameImage] = await Promise.all([
    loadAvatarImage(leftUser).catch(() => null),
    loadAvatarImage(rightUser).catch(() => null),
    loadTierFlameImage(tier.assetFile)
  ]);

  drawDecorativeFlames(context, flameImage, Math.max(1, streakCount), `${leftUser.id}:${rightUser.id}:${streakCount}`);
  drawMainFlame(context, flameImage);
  drawAvatarCircle(context, leftAvatar, 74, 56, 120, (leftUser.globalName || leftUser.username).charAt(0).toUpperCase());
  drawAvatarCircle(context, rightAvatar, width - 194, 56, 120, (rightUser.globalName || rightUser.username).charAt(0).toUpperCase());
  drawNames(context, leftUser, rightUser, width);
  drawCounter(context, streakCount);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: `streak-${tier.key}.png`
  });
}

module.exports = {
  createStreakNotificationCard
};
