const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", "..", ".env")
});

const config = {
  token: process.env.DISCORD_TOKEN,
  prefix: process.env.PREFIX || "sk",
  welcome: {
    channelId: process.env.WELCOME_CHANNEL_ID || "",
    publicChannelId: process.env.PUBLIC_CHAT_CHANNEL_ID || "",
    accentColor: process.env.WELCOME_ACCENT_COLOR || "#111111",
    rulesChannelId: process.env.RULES_CHANNEL_ID || "",
    introChannelId: process.env.INTRO_CHANNEL_ID || ""
  },
  tickets: {
    categoryId: process.env.TICKET_CATEGORY_ID || "",
    partnershipCategoryId: process.env.PARTNERSHIP_TICKET_CATEGORY_ID || "",
    logChannelId: process.env.TICKET_LOG_CHANNEL_ID || "",
    supportRoleId: process.env.TICKET_SUPPORT_ROLE_ID || "",
    panelChannelId: process.env.TICKET_PANEL_CHANNEL_ID || "",
    partnershipPanelChannelId: process.env.PARTNERSHIP_TICKET_PANEL_CHANNEL_ID || "",
    commandListChannelId: process.env.TICKET_COMMAND_LIST_CHANNEL_ID || "",
    partnershipEnabled: process.env.PARTNERSHIP_TICKET_ENABLED !== "false",
    panelAccentColor: process.env.TICKET_PANEL_ACCENT_COLOR || "#111111"
  },
  confessions: {
    channelId: process.env.CONFESSION_CHANNEL_ID || "",
    logChannelId: process.env.CONFESSION_LOG_CHANNEL_ID || "",
    panelChannelId: process.env.CONFESSION_PANEL_CHANNEL_ID || "",
    accentColor: process.env.CONFESSION_ACCENT_COLOR || "#111111"
  },
  counting: {
    channelId: process.env.COUNTING_CHANNEL_ID || "",
    startNumber: Number.parseInt(process.env.COUNTING_START_NUMBER || "1", 10)
  },
  nameRequests: {
    panelChannelId: process.env.NAME_REQUEST_PANEL_CHANNEL_ID || "",
    reviewChannelId: process.env.NAME_REQUEST_REVIEW_CHANNEL_ID || "",
    logChannelId: process.env.NAME_REQUEST_LOG_CHANNEL_ID || "",
    protectedRoleIds: process.env.NAME_REQUEST_PROTECTED_ROLE_IDS
      ? process.env.NAME_REQUEST_PROTECTED_ROLE_IDS.split(",").map((item) => item.trim()).filter(Boolean)
      : [],
    accentColor: process.env.NAME_REQUEST_ACCENT_COLOR || "#111111"
  }
};

function validateConfig() {
  if (!config.token) {
    throw new Error("DISCORD_TOKEN is missing. Add it to your .env file.");
  }
}

module.exports = {
  config,
  validateConfig
};
