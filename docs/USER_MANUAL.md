# VokasiFlow AI — Panduan Pengguna (User Manual)

Panduan operasional resmi untuk **Admin Pengelola Vokasi** dan **Guru Pembimbing SMK**.

---

## 1. Pengenalan VokasiFlow AI

**VokasiFlow AI** adalah platform terpadu untuk mempermudah tata kelola program magang/PKL siswa SMK. Platform ini mengotomatiskan administrasi, memetakan rute penempatan industri dengan Google Maps, serta memberikan rekomendasi penempatan dan proyeksi kebutuhan industri menggunakan AI.

---

## 2. Alur Penggunaan Utama (5 Langkah Praktis)

1. **Masuk ke Akun (Login):** Buka aplikasi di browser, masukkan email dan kata sandi yang telah didaftarkan.
2. **Kelola Data Siswa:** Unggah data siswa kelas XI / XII menggunakan fitur import Excel.
3. **Pengajuan Penempatan Magang:** Guru memilih siswa dan mitra industri (DUDI / PKT) yang sesuai dengan jurusan.
4. **Monitoring & Evaluasi:** Pantau kehadiran dan logbook harian siswa melalui peta interaktif.
5. **Penilaian & Laporan:** Masukkan nilai akhir aspek teknis & non-teknis, lalu unduh laporan rekapitulasi.

---

## 3. Panduan Fitur Berdasarkan Peran Pengguna

### A. Portal Admin Pengelola Program Vokasi
- **Dashboard Eksekutif:** Memantau ringkasan total siswa aktif, keterserapan kuota mitra, dan status persetujuan.
- **Manajemen Sekolah & Industri:** Menambahkan mitra industri baru, kuota magang per jurusan, dan verifikasi sekolah.
- **AI Forecasting & Recommendations:** Menghasilkan analisis proyeksi kebutuhan tenaga kerja industri untuk perencanaan kurikulum.
- **Manajemen User:** Mengelola akun guru pembimbing dan pengaturan hak akses.

---

### B. Portal Guru Pembimbing Lapangan
- **Manajemen Siswa:** Melihat profil dan status penempatan siswa asuhan.
- **Import Data via Excel:** Unggah daftar siswa secara massal menggunakan file `.xlsx` / `.xls`.
- **Pengajuan Penempatan:** Mengirim permohonan magang siswa ke perusahaan mitra untuk disetujui admin.
- **Monitoring Geospasial:** Memeriksa posisi penempatan siswa dan rute perjalanan dari sekolah.
- **Input Evaluasi:** Memberi nilai kompetensi keahlian dan soft skill peserta magang.

---

## 4. Panduan Langkah Demi Langkah: Import Excel Siswa

1. Klik menu **"Siswa"** di portal Guru atau Admin.
2. Klik tombol **"Import Excel"** di kanan atas tabel.
3. Klik tautan **"Unduh Template Contoh"** jika belum memiliki format standar.
4. Masukkan data siswa ke dalam template (Nama, NISN, Jurusan, Kelas, Kontak, Alamat).
5. Drag-and-drop file spreadsheet Anda ke area unggah modal.
6. Periksa pratinjau data pada layar, lalu klik **"Simpan ke Database"**.

---

## 5. Tanya Jawab (FAQ)

- **T: Bagaimana jika alamat mitra industri tidak muncul di peta?**  
  *J: Pastikan penulisan alamat mencantumkan nama jalan, kelurahan, dan kota/kabupaten dengan jelas agar sistem geocoding otomatis dapat menentukan titik koordinat.*

- **T: Format file apa saja yang diterima untuk import data?**  
  *J: Format `.xlsx`, `.xls`, dan `.csv`.*

- **T: Apakah data siswa sekolah saya bisa dilihat oleh guru sekolah lain?**  
  *J: Tidak. Sistem VokasiFlow AI menerapkan isolasi data ketat berbasis Row Level Security.*
