const { createTemplateCommand } = require("./templateUtils");

module.exports = createTemplateCommand({
  name: "verifikasi",
  description: "Kirim template layanan untuk verifikasi girl.",
  title: "Layanan Verifikasi Girl",
  introLines: [
    "Halo, terima kasih sudah membuka tiket verifikasi.",
    "Sebelum proses dimulai, mohon pastikan kamu sudah siap untuk ditemani admin perempuan.",
    "Silakan kirim beberapa hal berikut ya:"
  ],
  formLines: [
    "1. Nama panggilan kamu",
    "2. Konfirmasi bahwa kamu siap mengikuti proses verifikasi",
    "3. Hal lain yang perlu diketahui admin, jika ada"
  ],
  closingLines: [
    "Setelah itu, mohon tunggu admin yang bertugas. Jangan spam chat selama proses verifikasi berjalan."
  ]
});
