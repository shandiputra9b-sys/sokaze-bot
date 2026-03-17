const { createTemplateCommand } = require("./templateUtils");

module.exports = createTemplateCommand({
  name: "iklan",
  description: "Kirim template layanan untuk pasang iklan.",
  title: "Layanan Pasang Iklan",
  introLines: [
    "Halo, terima kasih sudah membuka tiket pemasangan iklan.",
    "Sebelum kami proses, mohon kirim data berikut terlebih dahulu:"
  ],
  formLines: [
    "1. Nama server / komunitas / produk yang ingin dipromosikan",
    "2. Tujuan promosi secara singkat",
    "3. Isi iklan yang ingin dipasang",
    "4. Link yang ingin dicantumkan",
    "5. Informasi tambahan bila ada"
  ],
  closingLines: [
    "Kalau datanya sudah lengkap dan rapi, tim akan lebih mudah bantu proses pengajuanmu."
  ]
});
