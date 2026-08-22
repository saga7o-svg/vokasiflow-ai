// Dynamic XLSX export & template utilities for Students Data

export interface StudentExcelExportItem {
  id?: string;
  student_number: string;
  name: string;
  school_name?: string | null;
  mentor?: string | null;
  city?: string | null;
  competency?: string | null;
  program_status?: string | null;
  talent_pool_year?: string | number | null;
  email?: string | null;
  phone?: string | null;
  driving_r4?: string | null;
  sim_a?: string | null;
  sim_c?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  theory_score?: string | number | null;
  interview_score?: string | number | null;
  graduation_status?: string | null;
  batch_id?: string | null;
  status?: string | null;
}

export const STUDENT_EXCEL_HEADERS = [
  "Batch ID",
  "Asal Sekolah",
  "Nama Peserta",
  "Pendamping",
  "Kabupaten/Kota Domisili",
  "Status Pendidikan",
  "Status Program",
  "Tahun Talent Pool",
  "Kode BMI",
  "Email Address",
  "Nomor Telepon/WA Terapan",
  "Kemampuan Mengemudi R4",
  "Apakah memiliki SIM A",
  "Apakah memiliki SIM C",
  "Tgl Lahir",
  "Jenis Kelamin",
  "Nilai Teori",
  "Nilai Interview",
  "Kelulusan",
];

export async function downloadStudentExcelTemplate() {
  const XLSX = await import("xlsx");

  const sampleRows = [
    [
      "Batch 01",
      "BLK Don Bosco",
      "FADIL ANWAR",
      "Hani",
      "Kabupaten Sumba Barat",
      "Kelas XII",
      "TalentPool",
      "2024",
      "BMI-001",
      "fadil.anwar@gmail.com",
      "081234567890",
      "Bisa Mengemudi",
      "Tidak Memiliki",
      "Memiliki",
      "21/03/2007",
      "L",
      "85%",
      "90%",
      "Lulus",
    ],
    [
      "Batch 01",
      "SMK Negeri 1 Tengaran",
      "MOHAMAD ARDIYANTO",
      "Aldi",
      "Kabupaten Semarang",
      "Kelas XII",
      "TalentPool",
      "2024",
      "BMI-002",
      "m.ardiyanto@gmail.com",
      "081225364647",
      "Tidak Bisa",
      "Tidak Memiliki",
      "Memiliki",
      "15/08/2006",
      "L",
      "88%",
      "92%",
      "Lulus",
    ],
    [
      "Batch 01",
      "SMK Al-Mufti Subang",
      "SITI NURHALIZA",
      "Hani",
      "Kabupaten Subang",
      "Kelas XI",
      "TalentPool",
      "2025",
      "BMI-003",
      "siti.nurhaliza@gmail.com",
      "081394335281",
      "Tidak Bisa",
      "Tidak Memiliki",
      "Tidak Memiliki",
      "04/11/2007",
      "P",
      "90%",
      "95%",
      "Lulus",
    ],
    [
      "Batch 02",
      "SMK Antartika 2 Sidoarjo",
      "BAGAS PRASETYO",
      "Aldi",
      "Kabupaten Sidoarjo",
      "Kelas XII",
      "TalentPool",
      "2024",
      "BMI-004",
      "bagas.p@gmail.com",
      "081235987255",
      "Bisa Mengemudi",
      "Memiliki",
      "Memiliki",
      "10/02/2006",
      "L",
      "82%",
      "87%",
      "Lulus",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([STUDENT_EXCEL_HEADERS, ...sampleRows]);

  ws["!cols"] = [
    { wch: 12 }, // Batch ID
    { wch: 28 }, // Asal Sekolah
    { wch: 28 }, // Nama Peserta
    { wch: 16 }, // Pendamping
    { wch: 24 }, // Kota Domisili
    { wch: 18 }, // Status Pendidikan
    { wch: 16 }, // Status Program
    { wch: 18 }, // Tahun Talent Pool
    { wch: 14 }, // Kode BMI
    { wch: 28 }, // Email Address
    { wch: 20 }, // Nomor Telepon/WA
    { wch: 24 }, // Kemampuan Mengemudi R4
    { wch: 22 }, // Apakah memiliki SIM A
    { wch: 22 }, // Apakah memiliki SIM C
    { wch: 14 }, // Tgl Lahir
    { wch: 14 }, // Jenis Kelamin
    { wch: 14 }, // Nilai Teori
    { wch: 16 }, // Nilai Interview
    { wch: 14 }, // Kelulusan
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, "template_data_siswa_vokasiflow.xlsx");
}

export async function exportStudentsToExcel(
  students: StudentExcelExportItem[],
  filename = "data_siswa_vokasiflow.xlsx",
) {
  const XLSX = await import("xlsx");

  const rows = students.map((s) => [
    s.batch_id || "Batch 01",
    s.school_name || "-",
    s.name,
    s.mentor || "-",
    s.city || "-",
    s.competency || "Kelas XII",
    s.program_status || "TalentPool",
    s.talent_pool_year || "2024",
    s.student_number,
    s.email || "-",
    s.phone || "-",
    s.driving_r4 || "Tidak Bisa",
    s.sim_a || "Tidak Memiliki",
    s.sim_c || "Tidak Memiliki",
    s.birth_date || "-",
    s.gender || "L",
    s.theory_score ? `${s.theory_score}%` : "-",
    s.interview_score ? `${s.interview_score}%` : "-",
    s.graduation_status || (s.status === "ACTIVE" ? "Lulus" : "Tidak Lulus"),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([STUDENT_EXCEL_HEADERS, ...rows]);

  ws["!cols"] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, filename);
}
