const { createTemplateCommand } = require("./templateUtils");

module.exports = createTemplateCommand({
  name: "partnership",
  description: "Kirim template layanan untuk partnership server.",
  title: "Layanan Partnership Server",
  introLines: [
    "Halo, terima kasih sudah membuka tiket partnership.",
    "Silakan kirim data berikut agar tim bisa meninjau pengajuan partnership dengan baik:"
  ],
  formLines: [
    "1. Nama server",
    "2. Jumlah member aktif",
    "3. Tema atau fokus komunitas",
    "4. Link invite server",
    "5. Tujuan partnership"
  ],
  closingLines: [
    "Kalau datanya lengkap, proses peninjauan akan jauh lebih cepat."
  ]
});
