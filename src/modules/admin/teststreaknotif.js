const { PermissionFlagsBits } = require("discord.js");
const {
  getStreakSettings,
  resolveMemberFromId,
  sendStreakNotificationToChannel
} = require("../streak/streakSystem");

function extractMentionId(value) {
  return value?.replace(/[<@!>]/g, "") || "";
}

module.exports = {
  name: "teststreaknotif",
  description: "Kirim notifikasi streak test ke channel streak.",
  aliases: ["teststreaknotification", "streaknotiftest"],
  category: "admin",
  usage: "teststreaknotif @user1 @user2 [value]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const userAId = extractMentionId(args[0]);
    const userBId = extractMentionId(args[1]);
    const streakValue = Number.parseInt(args[2] || "1", 10);

    if (!userAId || !userBId || userAId === userBId) {
      await message.reply("Masukkan dua mention user yang valid dan berbeda.");
      return;
    }

    if (!Number.isInteger(streakValue) || streakValue < 1) {
      await message.reply("Nilai streak test harus angka bulat minimal 1.");
      return;
    }

    const [memberA, memberB] = await Promise.all([
      resolveMemberFromId(message.guild, userAId),
      resolveMemberFromId(message.guild, userBId)
    ]);

    if (!memberA || !memberB) {
      await message.reply("Salah satu member tidak ditemukan di server.");
      return;
    }

    const settings = getStreakSettings(message.guild.id, client);
    const targetChannel = settings.channelId
      ? await message.guild.channels.fetch(settings.channelId).catch(() => null)
      : message.channel;

    if (!targetChannel?.send) {
      await message.reply("Channel streak belum valid. Set dulu pakai `sksetstreakchannel #channel`.");
      return;
    }

    await sendStreakNotificationToChannel(targetChannel, {
      userIds: [userAId, userBId],
      currentStreak: streakValue
    });

    await message.reply(
      `Notifikasi streak test untuk ${memberA} x ${memberB} dikirim ke ${targetChannel}.`
    );
  }
};
