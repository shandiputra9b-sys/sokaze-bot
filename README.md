# Sokaze Bot

Bot Discord berbasis JavaScript dengan sistem command prefix `sk`.

## Setup

1. Install dependency: `npm install`
2. Copy `.env.example` menjadi `.env`
3. Isi `DISCORD_TOKEN`
4. Jalankan bot: `npm start`

## Command awal

- `skping`
- `skhelp`
- `skquote [teks]`
- `sksetwelcome #channel`
- `sksetrules #channel`
- `sksetintro #channel`
- `sksetaccent #111111`
- `sktestwelcome`
- `sksetpublicchat #channel`
- `sktestpublicwelcome`
- `sksetticketcategory <category_id>`
- `sksetpartnershipcategory <category_id>`
- `sksetticketsupport @role`
- `sksetticketlog #channel`
- `sksendticketpanel #channel`
- `sksendpartnershippanel #channel`
- `sktogglepartnership <on|off>`
- `sksendticketcommands #channel`
- `sksetconfessionchannel #channel`
- `sksetconfessionlog #channel`
- `sksendconfessionpanel #channel`
- `sksetnamepanel #channel`
- `sksetnamereview #channel`
- `sksetnamelog #channel`
- `sksetnameroles @role [@role2]`
- `sksendnamepanel #channel`
- `sksetcounting #channel [start_number]`
- `skresetcounting`
- `skcountingstatus`
- `sksupport`
- `skiklan`
- `skverifikasi`
- `sklapor`
- `skmedia`
- `skpartnership`
- `skpartnershiphelp`
- `sktickethelp`

## Welcome Theme

Bot sudah punya event welcome bertema dark untuk member baru.

Isi `.env` dengan:

- `WELCOME_CHANNEL_ID`: channel teks untuk welcome
- `PUBLIC_CHAT_CHANNEL_ID`: channel teks public chat untuk sapaan member baru
- `WELCOME_ACCENT_COLOR`: warna embed dark, default `#111111`
- `RULES_CHANNEL_ID`: channel rules yang akan disebut di embed
- `INTRO_CHANNEL_ID`: channel perkenalan yang akan disebut di embed
- `TICKET_CATEGORY_ID`: category untuk channel ticket
- `PARTNERSHIP_TICKET_CATEGORY_ID`: category khusus untuk channel partnership ticket
- `TICKET_LOG_CHANNEL_ID`: channel log ticket
- `TICKET_SUPPORT_ROLE_ID`: role tim support
- `TICKET_PANEL_CHANNEL_ID`: channel panel ticket
- `PARTNERSHIP_TICKET_PANEL_CHANNEL_ID`: channel panel khusus partnership
- `TICKET_COMMAND_LIST_CHANNEL_ID`: channel daftar command pelayanan ticket
- `PARTNERSHIP_TICKET_ENABLED`: status awal tombol partnership
- `TICKET_PANEL_ACCENT_COLOR`: warna panel ticket
- `CONFESSION_CHANNEL_ID`: channel publish confession
- `CONFESSION_LOG_CHANNEL_ID`: channel log admin confession
- `CONFESSION_PANEL_CHANNEL_ID`: channel panel confession
- `CONFESSION_ACCENT_COLOR`: warna panel/embed confession
- `COUNTING_CHANNEL_ID`: channel counting
- `COUNTING_START_NUMBER`: angka awal counting
- `NAME_REQUEST_PANEL_CHANNEL_ID`: channel panel request name
- `NAME_REQUEST_REVIEW_CHANNEL_ID`: channel review request name
- `NAME_REQUEST_LOG_CHANNEL_ID`: channel log request name
- `NAME_REQUEST_PROTECTED_ROLE_IDS`: daftar role yang dilindungi dari peniruan nama
- `NAME_REQUEST_ACCENT_COLOR`: warna panel request name

Atau atur langsung dari Discord dengan command admin:

- `sksetwelcome #channel`
- `sksetrules #channel`
- `sksetintro #channel`
- `sksetaccent #111111`
- `sktestwelcome [#channel]`
- `sksetpublicchat #channel`
- `sktestpublicwelcome [#channel]`
- `sksetticketcategory <category_id>`
- `sksetpartnershipcategory <category_id>`
- `sksetticketsupport @role`
- `sksetticketlog #channel`
- `sksendticketpanel #channel`
- `sksendpartnershippanel #channel`
- `sktogglepartnership <on|off>`
- `sksendticketcommands #channel`
- `sksetconfessionchannel #channel`
- `sksetconfessionlog #channel`
- `sksendconfessionpanel #channel`
- `sksetnamepanel #channel`
- `sksetnamereview #channel`
- `sksetnamelog #channel`
- `sksetnameroles @role [@role2]`
- `sksendnamepanel #channel`
- `sksetcounting #channel [start_number]`
- `skresetcounting`
- `skcountingstatus`
- `sksupport`
- `skiklan`
- `skverifikasi`
- `sklapor`
- `skmedia`
- `skpartnership`
- `skpartnershiphelp`
- `sktickethelp`

## Ticket Flow

1. Set category ticket dengan `sksetticketcategory`
2. Jika partnership dipisah, set category khusus dengan `sksetpartnershipcategory`
3. Set role support dengan `sksetticketsupport`
4. Opsional set log channel dengan `sksetticketlog`
5. Kirim panel umum dengan `sksendticketpanel #channel`
6. Kirim panel partnership dengan `sksendpartnershippanel #channel`
7. Kirim daftar command staff dengan `sksendticketcommands #channel`
8. User pilih tombol kategori ticket untuk membuat channel ticket pribadi

## Confession Flow

1. Set channel confession dengan `sksetconfessionchannel`
2. Set channel log admin dengan `sksetconfessionlog`
3. Kirim panel confession dengan `sksendconfessionpanel #channel`
4. User klik tombol untuk kirim confession via modal
5. Bot publish confession anonim, buat thread, dan sediakan tombol balas anonim
6. Semua confession dan reply anonim dicatat ke channel log admin

## Counting Flow

1. Set channel counting dengan `sksetcounting #channel [start_number]`
2. Member harus kirim angka murni sesuai urutan
3. User yang sama tidak boleh dua kali berturut-turut
4. Jika salah, pesan akan dihapus dan counting direset ke angka awal
5. Cek status dengan `skcountingstatus`

## Name Request Flow

1. Set panel channel dengan `sksetnamepanel`
2. Set review channel dengan `sksetnamereview`
3. Set log channel dengan `sksetnamelog`
4. Set protected role dengan `sksetnameroles`
5. Kirim panel dengan `sksendnamepanel #channel`
6. User submit nama via modal
7. Bot validasi nama agar tidak NSFW dan tidak menyerupai admin/staff
8. Staff approve/reject dari review channel
9. Jika approve, nickname user akan langsung diubah

## Quote Flow

1. Gunakan `skquote [teks]` untuk membuat quote dari teks sendiri
2. Atau reply pesan seseorang lalu ketik `skquote`
3. Bot akan membuat quote image dengan background abstrak dari avatar user yang dikutip

Setting per server disimpan di `data/guild-config.json`.

## Struktur modular

- `src/index.js`: bootstrap aplikasi
- `src/config`: konfigurasi environment
- `src/core`: factory dan state client
- `src/loaders`: loader command dan event
- `src/modules`: command per domain/fitur
- `src/events`: event Discord
- `src/utils`: utilitas parsing dan helper

Struktur ini sengaja dipisah supaya pengembangan per phase lebih aman. Fitur berikutnya bisa ditambah sebagai modul baru seperti `moderation`, `welcome`, `tickets`, atau `levels` tanpa mengubah entry point utama secara besar.
