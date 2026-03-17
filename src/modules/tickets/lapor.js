const { createTemplateCommand } = require("./templateUtils");

module.exports = createTemplateCommand({
  name: "lapor",
  description: "Kirim template layanan untuk laporan dan keluh kesah member.",
  title: "Layanan Laporan dan Keluh Kesah",
  introLines: [
    "Halo, terima kasih sudah menghubungi kami lewat tiket ini.",
    "Agar kami bisa memahami situasinya dengan jelas, mohon kirim:"
  ],
  formLines: [
    "1. Jenis laporan atau keluhan",
    "2. Kronologi singkat dan jelas",
    "3. Nama user terkait jika ada",
    "4. Bukti berupa screenshot, link, atau lampiran lain"
  ],
  closingLines: [
    "Mohon hanya kirim laporan yang valid. Jika laporannya sudah lengkap, tim akan segera menindaklanjuti."
  ]
});
