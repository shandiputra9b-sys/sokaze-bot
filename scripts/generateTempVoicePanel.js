const fs = require("node:fs");
const path = require("node:path");
const { Canvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");

GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeui.ttf", "Segoe UI");
GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeuib.ttf", "Segoe UI Bold");

const iconDirectory = path.join(__dirname, "..", "assets", "temp-voice-emojis");
const outputDirectory = path.join(__dirname, "..", "assets", "temp-voice");
const outputFile = path.join(outputDirectory, "panel.png");

const BUTTONS = [
  { key: "name", label: "NAME" },
  { key: "limit", label: "LIMIT" },
  { key: "privacy", label: "PRIVACY" },
  { key: "waiting", label: "WAITING R." },
  { key: "chat", label: "CHAT" },
  { key: "trust", label: "TRUST" },
  { key: "untrust", label: "UNTRUST" },
  { key: "invite", label: "INVITE" },
  { key: "kick", label: "KICK" },
  { key: "region", label: "REGION" },
  { key: "block", label: "BLOCK" },
  { key: "unblock", label: "UNBLOCK" },
  { key: "claim", label: "CLAIM" },
  { key: "transfer", label: "TRANSFER" },
  { key: "delete", label: "DELETE" }
];

function ensureDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
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

async function renderPanel() {
  const width = 1440;
  const height = 330;
  const canvas = new Canvas(width, height);
  const context = canvas.getContext("2d");

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#13151c");
  background.addColorStop(1, "#101219");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const buttonWidth = 265;
  const buttonHeight = 72;
  const gapX = 18;
  const gapY = 14;
  const startX = 18;
  const startY = 22;

  for (const [index, button] of BUTTONS.entries()) {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const x = startX + (column * (buttonWidth + gapX));
    const y = startY + (row * (buttonHeight + gapY));
    const iconPath = path.join(iconDirectory, `${button.key}.png`);
    const icon = await loadImage(iconPath);

    context.fillStyle = "#20232b";
    drawRoundedRect(context, x, y, buttonWidth, buttonHeight, 18);
    context.fill();

    context.strokeStyle = "rgba(255,255,255,0.06)";
    context.lineWidth = 1;
    drawRoundedRect(context, x, y, buttonWidth, buttonHeight, 18);
    context.stroke();

    context.drawImage(icon, x + 12, y + 10, 48, 48);

    context.fillStyle = "#f8fafc";
    context.font = "bold 28px Segoe UI Bold";
    context.fillText(button.label, x + 68, y + 45);
  }

  fs.writeFileSync(outputFile, await canvas.encode("png"));
}

async function main() {
  ensureDirectory(outputDirectory);
  await renderPanel();
  console.log(`Generated Temp Voice panel asset at ${outputFile}`);
}

main().catch((error) => {
  console.error("Failed to generate Temp Voice panel:", error);
  process.exitCode = 1;
});
