const { ensureProfileAccess, buildProfileCatalogEmbed, buildProfileSnapshot, updateProfileTheme, updateProfileTitle } = require("./profileSystem");
const { createProfileCard } = require("./profileCard");
const { resolveGuildMember } = require("../../utils/memberResolver");

module.exports = {
  name: "profile",
  aliases: ["pf", "profil"],
  category: "levels",
  description: "Lihat dan atur profile card Sokaze.",
  usage: "profile [@member] | profile catalog | profile theme <key> | profile title <key>",
  async execute(message, args) {
    const firstArg = (args[0] || "").toLowerCase();
    const action = ["catalog", "theme", "title", "view"].includes(firstArg) ? firstArg : "view";
    const access = ensureProfileAccess(message.guild.id, message.author.id, message.member);

    if (!access.ok) {
      await message.reply(access.reason);
      return;
    }

    if (action === "catalog") {
      const snapshot = await buildProfileSnapshot(message.guild, message.member);
      await message.reply({
        embeds: [buildProfileCatalogEmbed(snapshot.levelInfo)]
      });
      return;
    }

    if (action === "theme") {
      const themeKey = String(args[1] || "").trim().toLowerCase();

      if (!themeKey) {
        await message.reply("Gunakan `sk profile theme <key>`.");
        return;
      }

      const snapshot = await buildProfileSnapshot(message.guild, message.member);
      const result = updateProfileTheme(message.guild.id, message.author.id, snapshot.levelInfo.level, themeKey);
      await message.reply(result.ok ? `Theme profile kamu diganti ke **${result.theme.label}**.` : result.reason);
      return;
    }

    if (action === "title") {
      const titleKey = String(args[1] || "").trim().toLowerCase();

      if (!titleKey) {
        await message.reply("Gunakan `sk profile title <key>`.");
        return;
      }

      const snapshot = await buildProfileSnapshot(message.guild, message.member);
      const result = updateProfileTitle(message.guild.id, message.author.id, snapshot.levelInfo.level, titleKey);
      await message.reply(result.ok ? `Title profile kamu diganti ke **${result.title.label}**.` : result.reason);
      return;
    }

    const targetToken = action === "view" && firstArg && firstArg !== "view"
      ? args[0]
      : action === "view" && args[1]
        ? args[1]
        : "";
    const targetMember = targetToken ? await resolveGuildMember(message.guild, targetToken) : message.member;

    const member = targetMember || message.member;
    const snapshot = await buildProfileSnapshot(message.guild, member);

    if (!access.adminBypass && snapshot.levelInfo.level < 3) {
      await message.reply("Member itu belum membuka benefit profile card karena masih di bawah Level 3.");
      return;
    }

    const card = await createProfileCard(snapshot);
    await message.reply({ files: [card] });
  }
};
