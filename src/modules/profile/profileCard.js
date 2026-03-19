const { AttachmentBuilder } = require("discord.js");
const { Canvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
const { formatDurationShort } = require("./profileSystem");

const regularFontRegistered = GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeui.ttf", "Segoe UI");
const boldFontRegistered = GlobalFonts.registerFromPath("C:\\Windows\\Fonts\\segoeuib.ttf", "Segoe UI Bold");

function getFontFamily(weight = "normal") {
  if (weight === "bold" && boldFontRegistered) {
    return "Segoe UI Bold";
  }

  return regularFontRegistered ? "Segoe UI" : "sans-serif";
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

function wrapText(context, text, maxWidth) {
  const tokens = String(text || "").split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return [];
  }

  const lines = [];
  let current = tokens.shift();

  for (const token of tokens) {
    const nextValue = `${current} ${token}`;

    if (context.measureText(nextValue).width <= maxWidth) {
      current = nextValue;
      continue;
    }

    lines.push(current);
    current = token;
  }

  lines.push(current);
  return lines;
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

function drawBackground(context, width, height, theme) {
  const baseGradient = context.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, theme.palette.baseStart);
  baseGradient.addColorStop(1, theme.palette.baseEnd);
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.filter = "blur(54px)";
  const glowA = context.createRadialGradient(150, 120, 20, 150, 120, 220);
  glowA.addColorStop(0, theme.palette.glow);
  glowA.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glowA;
  context.fillRect(-40, -20, 420, 360);

  const glowB = context.createRadialGradient(width - 180, height - 140, 20, width - 180, height - 140, 240);
  glowB.addColorStop(0, theme.palette.glow);
  glowB.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glowB;
  context.fillRect(width - 440, height - 360, 460, 360);
  context.restore();

  context.strokeStyle = "rgba(255, 255, 255, 0.04)";
  context.lineWidth = 1;
  drawRoundedRect(context, 20, 20, width - 40, height - 40, 30);
  context.stroke();
}

function drawShell(context, width, height, theme) {
  context.fillStyle = theme.palette.panelStrong;
  drawRoundedRect(context, 28, 28, width - 56, height - 56, 28);
  context.fill();

  context.strokeStyle = theme.palette.line;
  context.lineWidth = 1;
  drawRoundedRect(context, 28, 28, width - 56, height - 56, 28);
  context.stroke();

  context.fillStyle = theme.palette.accent;
  drawRoundedRect(context, 44, 44, 6, height - 88, 3);
  context.fill();
}

function drawPanel(context, x, y, width, height, theme) {
  context.fillStyle = theme.palette.panel;
  drawRoundedRect(context, x, y, width, height, 22);
  context.fill();
  context.strokeStyle = theme.palette.line;
  context.lineWidth = 1;
  drawRoundedRect(context, x, y, width, height, 22);
  context.stroke();
}

function drawAvatar(context, avatar, member, theme) {
  const x = 76;
  const y = 78;
  const size = 118;
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
    fallback.addColorStop(0, theme.palette.accent);
    fallback.addColorStop(1, "rgba(255,255,255,0.08)");
    context.fillStyle = fallback;
    context.fillRect(x, y, size, size);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `bold 48px "${getFontFamily("bold")}"`;
    context.fillText((member.displayName || member.user.username).charAt(0).toUpperCase(), centerX, centerY + 2);
    context.textAlign = "start";
    context.textBaseline = "alphabetic";
  }

  context.restore();

  const ring = context.createLinearGradient(x, y, x + size, y + size);
  ring.addColorStop(0, theme.palette.accent);
  ring.addColorStop(1, "rgba(255,255,255,0.6)");
  context.strokeStyle = ring;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(centerX, centerY, (size / 2) - 2, 0, Math.PI * 2);
  context.stroke();
}

function drawHeader(context, snapshot) {
  const { member, levelInfo, theme, title, variant } = snapshot;
  const chipX = 900;
  const chipY = 82;

  context.fillStyle = theme.palette.textSecondary;
  context.font = `bold 18px "${getFontFamily("bold")}"`;
  context.fillText(theme.kicker || "SOKAZE PROFILE", 226, 84);

  context.fillStyle = theme.palette.textPrimary;
  context.font = `bold 42px "${getFontFamily("bold")}"`;
  context.fillText(fitText(context, member.displayName || member.user.username, 530), 226, 128);

  context.fillStyle = theme.palette.textSecondary;
  context.font = `18px "${getFontFamily()}"`;
  context.fillText(`@${fitText(context, member.user.username, 250)}`, 226, 158);

  context.fillStyle = theme.palette.accent;
  context.font = `bold 22px "${getFontFamily("bold")}"`;
  context.fillText(title.label, 226, 194);

  context.fillStyle = theme.palette.textMuted;
  context.font = `16px "${getFontFamily()}"`;
  context.fillText(
    variant === "premium"
      ? "Premium profile card unlocked lewat loyalitas tertinggi di Sokaze."
      : variant === "advanced"
        ? "Advanced card buat member inti yang sudah naik ke level lebih tinggi."
        : "Basic card buat member yang mulai buka prestige benefit.",
    226,
    224
  );

  context.fillStyle = theme.palette.accentSoft;
  drawRoundedRect(context, chipX, chipY, 180, 42, 18);
  context.fill();
  context.strokeStyle = theme.palette.line;
  drawRoundedRect(context, chipX, chipY, 180, 42, 18);
  context.stroke();
  context.fillStyle = theme.palette.textPrimary;
  context.font = `bold 17px "${getFontFamily("bold")}"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`${levelInfo.code} ${levelInfo.name}`, chipX + 90, chipY + 23);
  context.textAlign = "start";
  context.textBaseline = "alphabetic";

  context.strokeStyle = theme.palette.line;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(226, 242);
  context.lineTo(1080, 242);
  context.stroke();
}

function drawBadgeRow(context, badges, theme) {
  context.font = `bold 15px "${getFontFamily("bold")}"`;
  let currentX = 74;
  const y = 274;

  for (const badge of badges.slice(0, 5)) {
    const width = Math.max(112, context.measureText(badge.label).width + 28);
    const fill = badge.tone === "accent"
      ? theme.palette.accentSoft
      : badge.tone === "special"
        ? "rgba(255,255,255,0.1)"
        : badge.tone === "warm"
          ? "rgba(255, 180, 91, 0.16)"
          : badge.tone === "cool"
            ? "rgba(115, 240, 199, 0.16)"
            : "rgba(255, 255, 255, 0.08)";

    context.fillStyle = fill;
    drawRoundedRect(context, currentX, y, width, 34, 17);
    context.fill();
    context.strokeStyle = theme.palette.line;
    drawRoundedRect(context, currentX, y, width, 34, 17);
    context.stroke();
    context.fillStyle = theme.palette.textPrimary;
    context.fillText(badge.label, currentX + 14, y + 22);
    currentX += width + 10;
  }
}

function drawMetricCard(context, config, theme) {
  drawPanel(context, config.x, config.y, config.width, config.height, theme);
  context.fillStyle = theme.palette.textMuted;
  context.font = `bold 15px "${getFontFamily("bold")}"`;
  context.fillText(config.label, config.x + 22, config.y + 28);
  context.fillStyle = theme.palette.textPrimary;
  context.font = `bold 30px "${getFontFamily("bold")}"`;
  context.fillText(config.value, config.x + 22, config.y + 72);
  context.fillStyle = theme.palette.textSecondary;
  context.font = `15px "${getFontFamily()}"`;
  context.fillText(config.caption, config.x + 22, config.y + config.height - 20);
}

function drawMetricsGrid(context, snapshot) {
  const { metrics, levelInfo, variant, theme } = snapshot;
  const topY = 332;
  const cardWidth = 236;
  const cardHeight = 118;
  const gap = 16;
  const cards = [
    {
      label: "LEVEL TIER",
      value: `${levelInfo.level}`,
      caption: `${levelInfo.code} ${levelInfo.name}`
    },
    {
      label: "CHAT",
      value: metrics.totalMessages.toLocaleString("id-ID"),
      caption: metrics.chatRank ? `Rank #${metrics.chatRank} server` : "Belum masuk rank"
    },
    {
      label: "VOICE",
      value: formatDurationShort(metrics.voiceTotalMs),
      caption: metrics.voiceRank ? `Rank #${metrics.voiceRank} server` : "Belum masuk rank"
    }
  ];

  if (variant !== "basic") {
    cards.push({
      label: "DONASI",
      value: metrics.donationAmount > 0 ? `Rp ${Number(metrics.donationAmount).toLocaleString("id-ID")}` : "Belum ada",
      caption: metrics.donationRank ? `Rank #${metrics.donationRank} donatur` : "Belum ada kontribusi tercatat"
    });
  }

  cards.forEach((card, index) => {
    drawMetricCard(context, {
      ...card,
      x: 74 + (index * (cardWidth + gap)),
      y: topY,
      width: cardWidth,
      height: cardHeight
    }, theme);
  });
}

function drawWrappedTextBlock(context, text, x, y, maxWidth, maxLines, theme) {
  context.fillStyle = theme.palette.textSecondary;
  context.font = `16px "${getFontFamily()}"`;
  const lines = wrapText(context, text, maxWidth).slice(0, maxLines);

  lines.forEach((line, index) => {
    context.fillText(line, x, y + (index * 22));
  });
}

function drawAdvancedPanels(context, snapshot) {
  const { metrics, variant, theme, member } = snapshot;

  drawPanel(context, 74, 470, 496, 134, theme);
  context.fillStyle = theme.palette.textMuted;
  context.font = `bold 15px "${getFontFamily("bold")}"`;
  context.fillText("ACTIVITY SNAPSHOT", 96, 498);
  context.fillStyle = theme.palette.textPrimary;
  context.font = `bold 28px "${getFontFamily("bold")}"`;
  context.fillText(`${metrics.currentTopStreak} Current Streak Peak`, 96, 540);
  drawWrappedTextBlock(
    context,
    metrics.streakPairs > 0
      ? `Punya ${metrics.streakPairs} partner streak aktif dengan best streak ${metrics.bestStreak} hari.`
      : "Belum ada partner streak aktif yang tercatat di sistem bot.",
    96,
    568,
    440,
    2,
    theme
  );

  drawPanel(context, 586, 470, 494, 134, theme);
  context.fillStyle = theme.palette.textMuted;
  context.font = `bold 15px "${getFontFamily("bold")}"`;
  context.fillText("SERVER STATUS", 608, 498);
  context.fillStyle = theme.palette.textPrimary;
  context.font = `bold 24px "${getFontFamily("bold")}"`;
  context.fillText(member.premiumSinceTimestamp ? "Booster privilege aktif" : "Belum booster aktif", 608, 538);
  drawWrappedTextBlock(
    context,
    [
      `Masuk server: ${metrics.joinedAtLabel}`,
      metrics.hasCustomRole
        ? "Sudah punya custom role aktif."
        : "Belum punya custom role aktif.",
      metrics.hasDonorGrant
        ? "Sedang punya akses donatur sementara."
        : metrics.donationAmount > 0
          ? "Pernah tercatat di board donasi."
          : "Belum punya status donatur."
    ].join(" "),
    608,
    566,
    440,
    3,
    theme
  );

  if (variant !== "premium") {
    return;
  }

  drawPanel(context, 74, 620, 1006, 92, theme);
  context.fillStyle = theme.palette.textMuted;
  context.font = `bold 15px "${getFontFamily("bold")}"`;
  context.fillText("ELITE FOOTING", 96, 648);
  context.fillStyle = theme.palette.textPrimary;
  context.font = `bold 22px "${getFontFamily("bold")}"`;
  context.fillText("Premium profile channel siap jadi pondasi prestige, shop, dan private utility phase berikutnya.", 96, 685);
}

function drawFooter(context, snapshot, height) {
  const { variant, theme } = snapshot;
  context.fillStyle = theme.palette.textMuted;
  context.font = `15px "${getFontFamily()}"`;
  context.fillText(`Variant: ${variant.toUpperCase()}`, 76, height - 34);
  context.textAlign = "right";
  context.fillText("Sokaze Profile Card", 1080, height - 34);
  context.textAlign = "start";
}

async function createProfileCard(snapshot) {
  const width = 1150;
  const height = snapshot.variant === "premium" ? 780 : 720;
  const canvas = new Canvas(width, height);
  const context = canvas.getContext("2d");
  const avatar = await loadAvatarImage(snapshot.member).catch(() => null);

  drawBackground(context, width, height, snapshot.theme);
  drawShell(context, width, height, snapshot.theme);
  drawAvatar(context, avatar, snapshot.member, snapshot.theme);
  drawHeader(context, snapshot);
  drawBadgeRow(context, snapshot.badges, snapshot.theme);
  drawMetricsGrid(context, snapshot);
  drawAdvancedPanels(context, snapshot);
  drawFooter(context, snapshot, height);

  return new AttachmentBuilder(await canvas.encode("png"), {
    name: "sokaze-profile-card.png"
  });
}

module.exports = {
  createProfileCard
};
