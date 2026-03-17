const { createTemplateCommand } = require("./templateUtils");

module.exports = createTemplateCommand({
  name: "media",
  description: "Kirim template layanan untuk media partner.",
  title: "Layanan Media Partner",
  introLines: [
    "Halo, terima kasih sudah membuka tiket media partner.",
    "Supaya pengajuanmu bisa kami tinjau dengan baik, mohon kirim informasi berikut:"
  ],
  formLines: [
    "1. Nama komunitas / server / brand",
    "2. Bentuk kerja sama media yang diajukan",
    "3. Platform yang digunakan",
    "4. Link yang relevan",
    "5. Penjelasan singkat tujuan kerja sama"
  ],
  closingLines: [
    "Kalau semuanya sudah lengkap, tim akan meninjau pengajuanmu secepat mungkin."
  ]
});
