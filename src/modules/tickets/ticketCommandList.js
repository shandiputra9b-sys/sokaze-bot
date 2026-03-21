const { EmbedBuilder } = require("discord.js");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");

function buildTicketCommandList(client, guildId) {
  const { tickets } = getEffectiveGuildSettings(guildId, client);
  const supportRoleLine = tickets.supportRoleId ? `<@&${tickets.supportRoleId}>` : "`support role belum diatur`";

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(tickets.panelAccentColor)
        .setTitle("Daftar Command Pelayanan Tiket")
        .setDescription(
          [
            "Daftar ini dipakai tim pelayanan untuk mengirim template sesuai kebutuhan tiket member.",
            `Role yang bisa memakai command ini: ${supportRoleLine}`,
            "",
            `\`${client.config.prefix}support\``,
            "Dipakai untuk tiket **Minta Role** dan **Hapus Role**.",
            "Isi template: identitas user, nama role, kebutuhan role, dan arahan agar tidak spam.",
            "",
            `\`${client.config.prefix}iklan\``,
            "Dipakai untuk tiket **Pasang Iklan**.",
            "Isi template: nama server/produk, tujuan promosi, isi iklan, link, dan data tambahan.",
            "",
            `\`${client.config.prefix}verifikasi\``,
            "Dipakai untuk tiket **Verifikasi Girl**.",
            "Isi template: konfirmasi kesiapan verifikasi dan arahan menunggu admin perempuan.",
            "",
            `\`${client.config.prefix}lapor\``,
            "Dipakai untuk tiket **Laporan** dan keluh kesah member.",
            "Isi template: jenis laporan, kronologi, user terkait, dan bukti.",
            "",
            `\`${client.config.prefix}media\``,
            "Dipakai untuk tiket **Media Partner**.",
            "Isi template: nama komunitas/brand, bentuk kerja sama, platform, link, dan tujuan.",
            "",
            `\`${client.config.prefix}partnership\``,
            "Dipakai untuk tiket **Partnership server** terpisah bila dibutuhkan.",
            "Isi template: nama server, jumlah member, tema komunitas, invite, dan tujuan partnership.",
            "",
            `\`${client.config.prefix}partnershiphelp\``,
            "Dipakai untuk memberi bantuan singkat soal syarat dan alur ticket partnership.",
            "Isi template: syarat utama partnership dan data yang harus disiapkan member.",
            "",
            `\`${client.config.prefix}thanks\``,
            "Dipakai untuk mengirim ucapan terima kasih dan tombol rating pelayanan staff/admin.",
            "Isi template: ajakan memberi penilaian jika member puas dengan pelayanan loket.",
            "",
            `\`${client.config.prefix}tickethelp\``,
            "Dipakai untuk menampilkan daftar command pelayanan tiket khusus staff.",
            "",
            "Gunakan command sesuai jenis tiket agar balasan ke member tetap rapi, konsisten, dan cepat dipahami."
          ].join("\n")
        )
    ]
  };
}

module.exports = {
  buildTicketCommandList
};
