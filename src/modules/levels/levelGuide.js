const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const path = require("node:path");

const INFOGRAPHIC_NAME = "infographic.png";
const INFOGRAPHIC_PATH = path.join(__dirname, "..", "..", "..", "assets", INFOGRAPHIC_NAME);

function createLevelGuideAttachment() {
  return new AttachmentBuilder(INFOGRAPHIC_PATH).setName(INFOGRAPHIC_NAME);
}

function buildLevelGuideEmbed() {
  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Sokaze Level Guide")
    .setDescription([
      "Naik level, buka benefit, dan bangun identitasmu di Sokaze.",
      "",
      "Cek progresmu kapan saja dengan `sk exp` dan `sk profile`."
    ].join("\n"))
    .setImage(`attachment://${INFOGRAPHIC_NAME}`)
    .setFooter({
      text: "Veil • Shroud • Obscura • Noctis • Eclipse"
    });
}

function createLevelGuidePayload() {
  return {
    embeds: [buildLevelGuideEmbed()],
    files: [createLevelGuideAttachment()]
  };
}

module.exports = {
  createLevelGuidePayload
};
