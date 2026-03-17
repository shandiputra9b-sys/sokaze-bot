const { createTemplateCommand } = require("./templateUtils");

module.exports = createTemplateCommand({
  name: "support",
  description: "Kirim template layanan untuk tiket role.",
  title: "Layanan Role Support",
  introLines: [
    "Halo, terima kasih sudah menghubungi tim kami.",
    "Supaya kami bisa bantu lebih cepat, mohon kirim detail berikut ya:"
  ],
  formLines: [
    "1. Username / nickname Discord kamu",
    "2. Keperluannya: ambil role atau hapus role",
    "3. Nama role yang dimaksud",
    "4. Keterangan singkat jika memang perlu dijelaskan"
  ],
  closingLines: [
    "Setelah itu, silakan tunggu balasan dari tim support. Mohon jangan spam chat agar tiket tetap rapi dan mudah kami tangani."
  ]
});
