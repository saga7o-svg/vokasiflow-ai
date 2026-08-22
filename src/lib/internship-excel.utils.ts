// Dynamic XLSX export & template utilities for Internship Participants (Data Peserta Magang)

export interface InternshipExcelExportItem {
  id?: string;
  batch_no?: string | null;
  training_center?: string | null;
  student_name: string;
  mentor?: string | null;
  city?: string | null;
  driving_skill?: string | null;
  student_status?: string | null;
  target_pkt?: string | null;
  jobdesk?: string | null;
  placement_month?: string | null;
  email?: string | null;
  phone?: string | null;
  internship_status?: string | null;
}

export const INTERNSHIP_EXCEL_HEADERS = [
  "Batch No",
  "Training Center",
  "Nama Peserta",
  "Pendamping",
  "Kabupaten/Kota Domisili",
  "Kemampuan Mengemudi",
  "Status Siswa",
  "Target PKT",
  "Jobdesk",
  "Bulan Penempatan",
  "Email",
  "Nomor WA",
  "Status Magang",
];

export async function downloadInternshipExcelTemplate() {
  const XLSX = await import("xlsx");

  const sampleRows = [
    [
      "Intra 3",
      "SMK Negeri 1 Gorontalo",
      "Muh. Firaaz Liputo",
      "Aldi",
      "Kota Gorontalo",
      "Siswa Aktif",
      "Kelas XII",
      "SSI - Palu",
      "CPC",
      "02 Januari 2025",
      "firaazliputo0@gmail.com",
      "081354720059",
      "Peserta Baru",
    ],
    [
      "Intra 3",
      "SMK Negeri 1 Gorontalo",
      "Moh. Rizky Kasim",
      "Aldi",
      "Gorontalo",
      "Aktif",
      "Kelas XII",
      "AND - Bali",
      "CPC",
      "02 Januari 2025",
      "ikikasim0707@gmail.com",
      "085824301896",
      "Peserta Baru",
    ],
    [
      "Intra 3",
      "SMK Negeri 1 Tengaran",
      "Valencia Yuliana",
      "Aldi",
      "Kabupaten Semarang",
      "Aktif",
      "Kelas XII",
      "AND - Bali",
      "CPC",
      "02 Januari 2025",
      "valencia.j23103@satamail.my.id",
      "085646481874",
      "Peserta Baru",
    ],
    [
      "Intra 3",
      "SMK Negeri 1 Tengaran",
      "Ananda Risky",
      "Aldi",
      "Kabupaten Semarang",
      "XI",
      "Kelas XI",
      "ACS - Sidoarjo",
      "CPC",
      "13 Januari 2025",
      "ananda.j23010@satamail.my.id",
      "085725969554",
      "Peserta Pengganti",
    ],
    [
      "Intra 4",
      "SMK YPKP Jayapura",
      "George Heben",
      "Aldi",
      "Kabupaten Jayapura",
      "Siswa Aktif",
      "Kelas XII",
      "SSI - Jayapura",
      "CPC",
      "21 Januari 2025",
      "hebenmenanti7@gmail.com",
      "082198921318",
      "Peserta Baru",
    ],
    [
      "Batch 47",
      "SMK Budi Perkasa",
      "Enggar Alif Nansyah",
      "Richie",
      "Kabupaten Bekasi",
      "Bisa R4",
      "Kelas XI",
      "KJA - Jakarta",
      "CPC",
      "25 Januari 2025",
      "enggaralifnansyah@gmail.com",
      "085711115440",
      "Peserta Baru",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([INTERNSHIP_EXCEL_HEADERS, ...sampleRows]);

  ws["!cols"] = [
    { wch: 12 }, // Batch No
    { wch: 28 }, // Training Center
    { wch: 26 }, // Nama Peserta
    { wch: 16 }, // Pendamping
    { wch: 24 }, // Kabupaten/Kota Domisili
    { wch: 20 }, // Kemampuan Mengemudi
    { wch: 16 }, // Status Siswa
    { wch: 20 }, // Target PKT
    { wch: 14 }, // Jobdesk
    { wch: 20 }, // Bulan Penempatan
    { wch: 30 }, // Email
    { wch: 18 }, // Nomor WA
    { wch: 18 }, // Status Magang
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Peserta Magang");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Template_Data_Peserta_Magang_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportInternshipsToExcel(
  items: InternshipExcelExportItem[],
  customFilename?: string,
) {
  const XLSX = await import("xlsx");

  const rows = items.map((item) => [
    item.batch_no || "-",
    item.training_center || "-",
    item.student_name || "-",
    item.mentor || "-",
    item.city || "-",
    item.driving_skill || "-",
    item.student_status || "-",
    item.target_pkt || "-",
    item.jobdesk || "-",
    item.placement_month || "-",
    item.email || "-",
    item.phone || "-",
    item.internship_status || "Peserta Baru",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([INTERNSHIP_EXCEL_HEADERS, ...rows]);

  ws["!cols"] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 26 },
    { wch: 16 },
    { wch: 24 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Peserta Magang");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    customFilename || `Data_Peserta_Magang_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
