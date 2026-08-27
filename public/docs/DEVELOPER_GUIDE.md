# Panduan Pengembang VokasiFlow AI (Developer Guide)

> **Versi Dokumen:** 1.0.0  
> **Terakhir Diperbarui:** 27 Agustus 2026  
> **Target Audiens:** Software Engineer, Frontend/Backend Developer, DevOps, System Architect  
> **Format Interaktif:** Buka file [developer-guide.html](file:///c:/Users/SANTO/Vibecoding/vokasiflow-ai/docs/developer-guide.html) di browser untuk tampilan visual lengkap dengan diagram Mermaid & pencarian instan.

---

## 1. Ikhtisar Arsitektur Proyek (System Overview)

VokasiFlow AI adalah platform SaaS B2B terintegrasi untuk pengelolaan program magang vokasi (SMK/Politeknik) dan kemitraan industri (DUDI). Platform ini dirancang dengan arsitektur modern berbasis TypeScript penuh:

```mermaid
graph TD
    Client[Browser / SPA Client] -->|Vite + React 18 + TS| Router[TanStack Router (File-Based)]
    Router --> Shell[App Layout & Role Guard]
    Shell --> AdminRoutes[Admin Dashboard & AI Analytics]
    Shell --> GuruRoutes[Guru Monitoring & Evaluations]
    Client -->|REST & Realtime| Supabase[Supabase Backend]
    Client -->|Maps JS API| GMaps[Google Maps Platform]
    Supabase --> PG[(PostgreSQL 15 Database)]
    Supabase --> Auth[Supabase GoTrue Auth]
    Supabase --> RLS[Row Level Security Engine]
    Supabase --> RPC[Stored Procedures / Custom RPC]
```

### Core Tech Stack
- **Frontend Framework:** React 18 + Vite + TypeScript (Strict Mode)
- **Routing & State:** TanStack Router (File-based routing di `src/routes/`), TanStack Query
- **Styling & UI:** Tailwind CSS, Radix UI primitives, Lucide Icons, Framer Motion
- **Backend & Database:** Supabase (PostgreSQL 15, Row Level Security, Custom RPC Functions, Realtime subscriptions)
- **Maps & Geolocation:** Google Maps JavaScript API (Marker Clustering, Directions Service, Distance Matrix)
- **Data Ingestion:** Client-side Excel parsing & validation via SheetJS (`xlsx`)

---

## 2. Struktur Direktori Proyek

```
vokasiflow-ai/
├── .agents/                    # Agent Skills & automations
├── docs/                       # Dokumentasi resmi
│   ├── developer-guide.html    # Panduan Programmer interaktif
│   ├── user-manual.html        # Panduan Pengguna interaktif
│   ├── DEVELOPER_GUIDE.md      # Panduan Teknis Markdown
│   └── USER_MANUAL.md          # Panduan Pengguna Markdown
├── public/                     # Static assets, favicon, icon
├── src/
│   ├── assets/                 # Logo, ilustrasi, media internal
│   ├── components/
│   │   ├── app/                # Komponen domain spesifik (Google Maps, Excel Modals, Layout Shell)
│   │   └── ui/                 # Komponen UI primitif (Button, Modal, Input, Badge, Table, dll.)
│   ├── hooks/                  # Custom React Hooks (useAuth, useMobile, useToast, dll.)
│   ├── integrations/
│   │   └── supabase/           # Supabase Client configuration & Database Type Definitions
│   ├── lib/                    # Helper utilities (cn, formatters, excel parsers, validators)
│   ├── routes/
│   │   ├── _authenticated/     # Rute terproteksi (Admin & Guru)
│   │   │   ├── app.admin.*.tsx # Modul Admin: Sekolah, Industri, Siswa, Magang, Forecasting, Rekomendasi
│   │   │   └── app.guru.*.tsx  # Modul Guru: Monitoring, Evaluasi, Magang, Siswa
│   │   ├── auth.tsx            # Login, Registrasi, Forgot Password, Role Switcher
│   │   ├── __root.tsx          # Root Layout & Global Context Providers
│   │   └── index.tsx           # Public Landing Page VokasiFlow AI
│   ├── router.tsx              # Konfigurasi router TanStack
│   └── styles.css              # Global styles, variables, font setup
└── supabase/
    └── migrations/             # Migrasi SQL, skema tabel, RLS, dan RPC
```

---

## 3. Skema Basis Data & Keamanan (Supabase & PostgreSQL)

### Entitas Utama
1. **`profiles`**
   - Menyimpan profil pengguna (`id`, `email`, `role`, `full_name`, `school_id`, `nip`, `phone`, `avatar_url`).
   - Role yang didukung: `'admin'`, `'guru'`, `'siswa'`, `'industri'`.
2. **`schools`**
   - Data SMK/Politeknik (`id`, `name`, `npsn`, `address`, `latitude`, `longitude`, `accreditation`, `mentor_count`, `partnership_type`).
3. **`companies` & `company_branches`**
   - Data mitra industri DUDI dan cabang lokasi PKT (`id`, `company_name`, `sector`, `address`, `latitude`, `longitude`, `quota`, `contact_person`).
4. **`students`**
   - Data siswa magang (`id`, `nisn`, `full_name`, `school_id`, `major`, `class_name`, `gpa`, `skills`, `status`).
5. **`internship_placements`**
   - Penempatan magang (`id`, `student_id`, `company_id`, `branch_id`, `teacher_id`, `start_date`, `end_date`, `status`, `score_technical`, `score_softskill`).
6. **`internship_activities`**
   - Log harian & presensi siswa (`id`, `placement_id`, `date`, `activity_description`, `attendance_status`, `verified_by_teacher`).

### Keamanan: Row Level Security (RLS) & RPC
- **RLS Aktif:** Semua tabel memiliki RLS aktif untuk memastikan keamanan data multitenant.
- **Admin RPC (`admin_create_user_with_metadata`):** Stored procedure aman dengan flag `SECURITY DEFINER` untuk memfasilitasi pembuatan akun pengguna baru langsung dari panel admin tanpa merusak sesi autentikasi yang sedang aktif.

---

## 4. Architecture Decision Records (ADRs)

### ADR-001: Pemilihan TanStack Router Berbasis File
- **Status:** Diterima (Accepted)
- **Konteks:** Diperlukan sistem routing yang sangat fleksibel dengan type-safety ketat untuk menangani rute modular antara Admin dan Guru.
- **Keputusan:** Menggunakan TanStack Router dengan layout `_authenticated` dan pemisahan eksplisit prefix `app.admin.*` dan `app.guru.*`.
- **Konsekuensi:** Type error pada URL navigasi dapat terdeteksi langsung saat proses kompilasi TypeScript.

### ADR-002: Integrasi PostgreSQL + RLS Supabase
- **Status:** Diterima (Accepted)
- **Konteks:** Platform menangani data siswa dan institusi pendidikan yang membutuhkan isolasi data antarsekolah dan auditabilitas.
- **Keputusan:** Menerapkan Supabase dengan PostgreSQL 15, GoTrue authentication, dan Row Level Security (RLS) di level database.
- **Konsekuensi:** Keamanan data terjamin bahkan jika query dilakukan langsung dari frontend client.

### ADR-003: Visualisasi Spasial dengan Google Maps Platform
- **Status:** Diterima (Accepted)
- **Konteks:** Admin dan guru membutuhkan visualisasi rute, jarak tempuh, dan analisis lokasi industri optimal untuk penempatan PKT.
- **Keputusan:** Mengintegrasikan Google Maps JavaScript API dengan marker kustom, clustering, dan kalkulasi jarak geospasial.

### ADR-004: Ingesti Data Massal Client-Side via SheetJS
- **Status:** Diterima (Accepted)
- **Konteks:** Sekolah memiliki ribuan baris data siswa dan mitra dalam format Excel (.xlsx/.xls/.csv).
- **Keputusan:** Melakukan parsing, validasi tipe, deteksi duplikasi NISN/NPSN, dan preview data langsung di browser sebelum batch commit ke Supabase.
- **Konsekuensi:** Mengurangi beban server dan memberikan validasi instan kepada pengguna secara interaktif.

---

## 5. Panduan Instalasi & Pengembangan Lokal

### Prasyarat
- Node.js >= 18.0.0 atau Bun >= 1.0.0
- Akun Supabase (atau Local Supabase CLI)
- Google Maps API Key dengan library `maps`, `places`, `geometry` aktif

### Langkah Instalasi
```bash
# 1. Clone repositori
git clone https://github.com/vokasiflow/vokasiflow-ai.git
cd vokasiflow-ai

# 2. Instal dependensi
npm install
# atau menggunakan bun
bun install

# 3. Salin environment variables
cp .env.example .env

# 4. Jalankan development server
npm run dev
```

### Environment Variables (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 6. Build, Testing & Deployment

```bash
# Type check & linting
npm run lint

# Build untuk produksi
npm run build

# Preview hasil build produksi
npm run preview
```

Platform dapat di-deploy secara langsung ke Vercel, Netlify, atau Cloudflare Pages dengan konfigurasi SPA rewrite yang mengarahkan semua rute ke `index.html`.
