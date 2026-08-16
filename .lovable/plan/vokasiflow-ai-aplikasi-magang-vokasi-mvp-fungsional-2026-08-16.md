# VokasiFlow AI — Aplikasi Magang Vokasi (MVP Fungsional)

Landing page yang sudah ada tetap utuh di `/`. Yang ditambahkan adalah aplikasi terautentikasi di `/app/*` dengan database sungguhan, login email+password, RBAC Admin/Guru, workflow magang end-to-end, dan dua modul analitik yang menghitung dari data nyata.

## 1. Backend & Database
Mengaktifkan Lovable Cloud (database + auth + fungsi server). Tabel:

- `profiles` (id, nama, email, school_id, status) — dibuat otomatis saat signup
- `user_roles` (user_id, role: ADMIN | GURU) — tabel terpisah, dicek lewat fungsi `has_role`
- `schools`, `students`, `companies`, `company_quotas` (quota, used_quota, kompetensi, periode)
- `internships` (status: DRAFT/SUBMITTED/APPROVED/REJECTED/ACTIVE/COMPLETED/CANCELLED, catatan approval/rejection)
- `internship_reports`, `attendance` (PRESENT/LATE/ABSENT/EXCUSED), `evaluations`
- `competency_demand` (historis permintaan per kompetensi/lokasi/periode)
- `audit_logs` (user, action, entity, entity_id, waktu)

Keamanan: RLS di semua tabel. Admin akses penuh; Guru dibatasi `school_id = profil miliknya` untuk siswa, pengajuan, laporan, absensi, dan nilai. Isolasi ditegakkan di database, bukan hanya di UI.

## 2. Autentikasi
- Halaman `/auth` (login + form guru dibuat oleh Admin), pesan gagal generik "Email atau password salah."
- Route `/app/*` terproteksi; belum login diarahkan ke `/auth`.
- Setelah login: ADMIN → `/app/admin/dashboard`, GURU → `/app/guru/dashboard`.
- Tombol "Masuk" dan "Mulai Sekarang" di navbar landing diarahkan ke `/auth` (tanpa mengubah desain).
- Logout membersihkan sesi dan cache.

## 3. Layout Aplikasi
Shell konsisten dengan bahasa visual landing (monokrom + aksen biru): sidebar kiri, topbar dengan pencarian global dan menu akun, konten utama. Sidebar collapsible di tablet, drawer di mobile. Menu mengikuti role.

## 4. Modul Admin
Dashboard (KPI dari query: total sekolah/siswa/perusahaan aktif, siswa magang aktif, pengajuan menunggu, tingkat keberhasilan) + chart status magang, tren penempatan, ranking sekolah, demand kompetensi.

Halaman: Pengajuan Magang (list + detail + Approve/Reject dengan catatan), Siswa, Sekolah, Perusahaan (+kuota), Program Magang, Performa Sekolah, Forecasting, Users (buat/aktifkan/nonaktifkan guru, tetapkan sekolah & role).

Approval dijalankan lewat satu fungsi database transaksional: cek status → cek & kunci kuota → update internship → naikkan `used_quota` → catat audit. Gagal di tengah = rollback penuh.

## 5. Modul Guru
Dashboard KPI (total siswa, belum ditempatkan, sedang magang, selesai, menunggu approval, rata-rata nilai). Halaman: Siswa (CRUD + detail riwayat), Pengajuan Magang (pilih siswa → kompetensi → perusahaan → periode, kuota tersedia tampil real-time, submit ditolak server bila penuh), Monitoring, Laporan Kegiatan (form mobile-friendly), Penilaian.

Evaluasi: skor teknis/non-teknis/disiplin diinput, skor kehadiran dihitung otomatis dari absensi, nilai akhir = 40/25/20/15 dengan rincian ditampilkan.

## 6. AI 1 — School Performance Score
Dihitung di server dari data aktual: Industry (rata-rata nilai akhir) 50%, Success Rate (completed/total) 30%, Discipline (kehadiran + ketepatan laporan) 20%. Tabel ranking + halaman detail berisi breakdown, tren, dan penjelasan pembentuk skor. Skor berubah otomatis begitu data evaluasi berubah.

## 7. AI 2 — Workforce Forecasting
Regresi linier time-series atas `competency_demand` per kompetensi/lokasi, memproyeksikan 4–8 periode berikutnya dengan growth % dan label confidence (Low/Medium/High berdasarkan jumlah titik data). Bila data kurang, tampil pesan "Data historis belum mencukupi…" — tanpa angka palsu. Rekomendasi kompetensi bertumbuh, lokasi prioritas, dan perusahaan (match kompetensi + kuota tersedia + demand).

## 8. Kualitas UI
Semua tabel: search, filter, sort, pagination, status badge. Empty state dengan CTA, skeleton loading, tombol submit disabled saat proses, pesan error ramah pengguna (tanpa detail teknis). Responsif desktop/tablet/mobile.

## 9. Seed Demo
Migrasi berisi data nyata: 3 sekolah, ~18 siswa, 5 perusahaan + kuota, beberapa pengajuan di berbagai status, absensi, evaluasi, dan 3 tahun historical demand. Akun demo `admin@example.com / Admin123!` dan `guru@example.com / Guru123!` dibuat di sistem auth (email auto-confirm) dan dipetakan ke role serta sekolahnya.

## 10. Pengujian
Setelah implementasi: uji end-to-end via browser — login kedua role, CRUD siswa, submit pengajuan, validasi kuota penuh, approve/reject + perubahan kuota, input absensi/laporan/nilai, angka dashboard, perubahan skor sekolah, dan percobaan akses lintas sekolah oleh Guru (harus ditolak).

## Catatan Teknis
Query dan mutasi berjalan lewat server function TanStack Start dengan middleware auth (RLS aktif sebagai user), route terproteksi di bawah layout `_authenticated`, validasi input dengan Zod di server dan klien, dan transaksi kuota sebagai fungsi Postgres agar aman dari race condition.
