# Changelog — Fleffy (Eksperimen A: PRD Only)

Semua perubahan pada repositori ini dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/).

**Kondisi eksperimen**
- **Input dokumentasi:** hanya `README.md` (PRD v1.0). Tidak memakai UX-SPEC, DESIGN-SYSTEM, INTERACTION-SPEC, ACCEPTANCE-CRITERIA, atau AGENTS.md.
- **AI coding agent:** Claude Code (model Claude Opus 5.5).
- **Stack:** React 19 + TypeScript + Vite di `apps/web`, data disimpan di `localStorage`, deploy ke GitHub Pages lewat GitHub Actions.

---

## [0.1.0] — 2026-11-23

Build awal aplikasi dari PRD.

### Ditambahkan
- **FR-07 Pencatatan pesanan:** form Buat/Ubah Pesanan berisi pelanggan, WhatsApp, layanan, jumlah pasang, nominal, metode (Bank Transfer/Tunai), catatan, dan bukti transfer (nominal, waktu, pengirim, keterangan). Validasi field wajib dilengkapi pesan per field dan fokus ke field pertama yang salah. Kode pesanan dibuat otomatis dengan format `FLF-YYMMDD-NNN`.
- **FR-01 Catatan ≠ dana dipastikan:** halaman detail menampilkan dua informasi terpisah, yaitu *Catatan pembayaran (oleh kasir)* dan *Penerimaan dana (oleh pemeriksa)*. Badge "Dicatat · dana belum dipastikan" baru berubah menjadi "✓ Dana dipastikan" setelah ada hasil **Sesuai**.
- **FR-02 Keterhubungan informasi:** kode pesanan dan nominal selalu tampil di kepala halaman detail. Bukti pelanggan ditampilkan beserta tanda bila nominalnya berbeda dari tagihan. Pencarian bisa memakai kode, nama, atau nomor WA.
- **FR-03 Permintaan pemeriksaan:** admin memilih pemeriksa (Owner/Finance). Keadaan permintaan: *Belum diminta → Menunggu hasil → Hasil tersedia*. Antrean Pemeriksaan bisa disaring menurut keadaan (Semua, Belum diminta, Menunggu, Hasil tersedia, Siap diteruskan, Sudah diteruskan) dan mempertahankan filter saat kembali dari detail.
- **US-07 / NFR-05 Input hasil oleh Pemeriksa:** peran Owner/Finance dapat memasukkan hasil *Sesuai / Tidak sesuai / Perlu klarifikasi*. Catatan wajib diisi untuk hasil selain Sesuai. Admin tidak bisa memasukkan hasil.
- **FR-04 Tindak lanjut saat menunggu:** menampilkan lama menunggu, prosedur usaha, tombol hubungi pemeriksa utama dan pengganti, serta contoh pesan ke pelanggan (bisa disalin) yang tidak menjanjikan dana masuk atau waktu selesai.
- **FR-05 Keputusan Teruskan/Tahan:** tombol *Teruskan ke teknisi* hanya aktif bila hasil terakhir **Sesuai**, dan aturan yang sama juga dicek di logika. *Tahan* wajib disertai alasan. Setiap keputusan menyimpan rujukan permintaan, petugas, dan waktu.
- **FR-06 Pemanfaatan ulang konteks:** permintaan pemeriksaan otomatis menyalin kode, pelanggan, dan nominal pesanan tanpa input ulang.
- **FR-08 Beranda:** kartu ringkasan Belum diminta, Menunggu hasil, Hasil tersedia, dan Siap diteruskan yang dapat diklik, serta daftar "Perlu tindakan".
- **Aturan bisnis 4:** satu permintaan aktif per pesanan. Permintaan ulang hanya diizinkan setelah hasil Tidak sesuai atau Perlu klarifikasi.
- **Aturan bisnis 9:** mengubah nominal, metode, pelanggan, atau bukti setelah permintaan dikirim membatalkan permintaan dan keputusan sebelumnya. Peringatan tampil di form sebelum disimpan.
- **Bantuan Pemeriksaan:** halaman Arti status pembayaran, Panduan saat menunggu, dan Kontak pemeriksa (dapat diubah oleh Admin).
- **Riwayat pesanan (NFR-04):** semua perubahan, permintaan, hasil, dan keputusan tercatat. Tidak ada fitur hapus.
- **Pemilih peran** di header (Admin / Owner / Finance) sebagai simulasi multi-pengguna, sesuai asumsi PRD bagian 11.
- **Data contoh fiktif** yang ditandai "Contoh", termasuk dua pesanan bernominal sama Rp150.000 untuk skenario V2, dan tombol untuk memuat ulang data contoh.
- **Responsif:** navigasi bawah di mobile dan navigasi atas di desktop. Target sentuh minimal 44px.
- **Pengujian:** 19 unit test (Vitest) untuk aturan bisnis di `src/logic.test.ts`.
- **Deploy:** workflow `.github/workflows/deploy.yml` yang menjalankan test, build, lalu deploy ke GitHub Pages.

### Diperbaiki selama build (iterasi internal agent, sebelum commit pertama)
1. Pencarian pesanan awalnya menulis ke URL di setiap ketikan sehingga riwayat browser menumpuk. Diganti dengan `history.replaceState`.
2. Item antrean pemeriksaan awalnya membungkus `<li>` dengan `<div>` (markup daftar tidak valid). Info pemeriksa dipindah menjadi properti `meta` pada baris pesanan.
3. Konfigurasi `launch.json` preview awalnya ditaruh di folder yang salah, lalu dipindah ke folder kerja (di luar repo).
4. Peringatan lint `set-state-in-effect` pada penyimpanan diperbaiki.

### Hasil pengujian (Product Acceptance Criteria PRD bagian 13)

| ID | Skenario | Status | Bukti |
|---|---|---|---|
| V1 | Transfer tercatat, hasil belum ada | **Pass** | UI: badge "Dicatat · dana belum dipastikan", "Menunggu hasil", panduan tindak lanjut tampil. Unit test. |
| V2 | Dua pesanan bernominal sama | **Pass** | Data contoh FLF-…-001 dan FLF-…-002 (Rp150.000) dibedakan dari kode, pelanggan, dan waktu. Pencarian nama/kode. Unit test. |
| V3 | Hasil Sesuai → Teruskan | **Pass** | UI: Owner menyimpan Sesuai, Admin klik Teruskan, badge menjadi "Diteruskan ke teknisi". Unit test. |
| V4 | Hasil belum ada / tidak sesuai / klarifikasi | **Pass** | UI: tombol Teruskan nonaktif dengan alasan. Logika menolak. Unit test. |
| V5 | Permintaan dari pesanan tercatat | **Pass** | UI: "Data pesanan dipakai otomatis: kode · pelanggan · nominal", snapshot sama. Unit test. |
| V6 | Pemeriksa memasukkan hasil | **Pass** | UI: toast "Hasil pemeriksaan disimpan.", keadaan menjadi Hasil tersedia. Admin ditolak (unit test). |
| V7 | Muat ulang halaman | **Pass** | UI: pesanan baru tetap ada setelah reload. |
| V8 | Smartphone & desktop | **Pass** | Diperiksa pada 375×812 dan 1280×800, tanpa overflow horizontal. |

### Batasan yang diketahui
- Tidak ada login sungguhan. Peran dipilih dari header (asumsi PRD).
- Data hanya tersimpan di browser yang sama dan tidak tersinkron antarperangkat.
- Bukti transfer dicatat sebagai teks (nominal, waktu, pengirim), bukan unggahan gambar.
- Belum ada uji dengan pengguna nyata.
