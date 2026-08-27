# VokasiFlow AI — Developer & Architecture Guide

Dokumentasi teknis resmi bagi **Programmer / Maintainer / AI Agent** yang mengelola dan mengembangkan platform VokasiFlow AI.

---

## 1. Ikhtisar & Tech Stack

VokasiFlow AI adalah sistem manajemen program magang vokasi berbasis web full-stack yang mengutamakan keamanan *multi-tenant* dan efisiensi olah data geospasial serta analitik AI.

- **Frontend & SSR Framework:** [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev) + [Vite 8](https://vitejs.dev) + [Nitro Engine](https://nitro.unjs.io)
- **Styling & Design System:** [Tailwind CSS v4](https://tailwindcss.com) + [Radix UI Primitives](https://www.radix-ui.com) + [Lucide Icons](https://lucide.dev)
- **Database & Auth:** [Supabase](https://supabase.com) (PostgreSQL 15+ dengan Row Level Security / RLS aktif)
- **Geospasial & Maps:** Google Maps JavaScript API + Geocoding API + Fallback Geocoder
- **AI & Forecasting:** `@google/genai` (Google Gemini 2.5 Flash API)
- **Data Ingestion:** `xlsx` (SheetJS) untuk parsing in-browser spreadsheet data siswa & sekolah

---

## 2. Struktur Proyek & Direktori

```
vokasiflow-ai/
├── src/
│   ├── components/
│   │   ├── app/                 # Komponen utama domain aplikasi
│   │   │   ├── google-maps-view.tsx           # Peta interaktif & clustering rute
│   │   │   ├── student-excel-import-modal.tsx # Parser & validasi import Excel siswa
│   │   │   ├── school-excel-import-modal.tsx  # Importer data sekolah & jurusan
│   │   │   ├── internship-excel-import-modal.tsx # Importer batch penempatan magang
│   │   │   └── shell.tsx                      # Layout navigasi & role-based sidebar
│   │   └── ui/                  # Komponen UI primitif (Button, Dialog, Toast, Table)
│   ├── hooks/                   # Custom React Hooks
│   ├── integrations/supabase/   # Client Supabase & auto-generated Types
│   ├── lib/                     # Utilitas pendukung (Error capture, geocoding, utils)
│   ├── routes/                  # File-based routing TanStack Start
│   │   ├── __root.tsx           # HTML root wrapper, Head metadata, & Global Providers
│   │   ├── auth.tsx             # Login, Register, Password Recovery
│   │   ├── index.tsx            # Landing page publik
│   │   └── _authenticated/      # Rute yang dilindungi session login
│   │       ├── app.admin.*.tsx  # Modul Admin (Dashboard, Sekolah, Siswa, AI Forecast)
│   │       └── app.guru.*.tsx   # Modul Guru (Internships, Monitoring, Evaluasi)
│   ├── server.ts                # Server handler dengan security headers
│   └── styles.css               # Import Tailwind CSS v4 & custom variables
├── supabase/
│   └── migrations/              # SQL migrasi, RLS policies, trigger & function
└── public/
    └── documentation.html       # Portal dokumentasi interaktif HTML
```

---

## 3. Skema Basis Data & Keamanan (RLS)

### Tabel Utama:
1. **`profiles`**: Identitas user, NIP/NIK, nama, avatar, dan role (`admin`, `guru`, `view_only`).
2. **`schools`**: Data SMK, NPSN, akreditasi, alamat, dan titik koordinat (`latitude`, `longitude`).
3. **`companies`**: Mitra industri / PKT, bidang industri, kuota magang, dan kontak HRD.
4. **`students`**: Siswa SMK, NISN, jurusan, kelas, dan status penempatan magang.
5. **`internships`**: Transaksi penempatan siswa di mitra industri beserta tanggal mulai/selesai.
6. **`evaluations`**: Rubrik penilaian berkala, nilai teknis, non-teknis, dan absensi.

### Prinsip Row Level Security (RLS):
- **Isolasi Sekolah:** Guru hanya dapat membaca dan menulis data siswa yang terdaftar di sekolah yang sama dengan guru tersebut.
- **Proteksi Admin:** Pengguna dengan role `admin` memiliki wewenang untuk melihat seluruh entitas secara global dan melakukan persetujuan.
- **View Only Demo:** Role `view_only` dilindungi agar tidak dapat melakukan mutasi data penting pada mode demonstrasi.

---

## 4. Panduan Menjalankan Proyek Secara Lokal

1. **Clone repository:**
   ```bash
   git clone <repo-url>
   cd vokasiflow-ai
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Konfigurasi Environment (`.env`):**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GEMINI_API_KEY=your-gemini-api-key
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
   ```
4. **Jalankan Server Development:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`.

---

## 5. Architecture Decision Records (ADR)

- **ADR-001: TanStack Start SSR**: Memungkinkan rendering server-side yang cepat untuk dataset analitik dan grafik performa vokasi.
- **ADR-002: Supabase PostgreSQL**: Menyediakan relasi ACID yang handal dengan RLS tingkat enterprise untuk data siswa & sekolah.
- **ADR-003: Client-side Excel Parser (SheetJS)**: Memproses ribuan data siswa di browser sebelum dikirim ke database untuk efisiensi transfer data.
