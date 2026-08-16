
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_school_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.internship_in_scope(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.attendance_rate(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.submit_internship(uuid, uuid, text, text, date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_internship(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_internship(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.school_performance() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.internship_in_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_rate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_internship(uuid, uuid, text, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_internship(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_internship(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_performance() TO authenticated;

INSERT INTO public.schools (id, name, school_code, address, city, province, contact_name, contact_phone) VALUES
 ('11111111-1111-4111-8111-111111111111','SMK Negeri 1 Bandung','SMKN1BDG','Jl. Wastukancana 3','Bandung','Jawa Barat','Dedi Supriadi','081234567001'),
 ('22222222-2222-4222-8222-222222222222','SMK Negeri 2 Surabaya','SMKN2SBY','Jl. Basuki Rahmat 12','Surabaya','Jawa Timur','Ratna Wulandari','081234567002'),
 ('33333333-3333-4333-8333-333333333333','SMK Telkom Jakarta','SMKTLKMJKT','Jl. Daan Mogot 11','Jakarta','DKI Jakarta','Budi Hartono','081234567003');

INSERT INTO public.companies (id, name, company_code, industry, address, city, province, contact_name, contact_email, contact_phone) VALUES
 ('aaaaaaa1-0000-4000-8000-000000000001','PT Nusantara Digital','NUSDIG','Teknologi Informasi','Jl. Sudirman 21','Jakarta','DKI Jakarta','Sari Puspita','sari@nusdig.id','0218001001'),
 ('aaaaaaa1-0000-4000-8000-000000000002','PT Bandung Manufaktur','BDGMAN','Manufaktur','Jl. Soekarno Hatta 88','Bandung','Jawa Barat','Andi Rahman','andi@bdgman.id','0228001002'),
 ('aaaaaaa1-0000-4000-8000-000000000003','PT Surya Jaringan','SURJAR','Telekomunikasi','Jl. Ahmad Yani 44','Surabaya','Jawa Timur','Lina Kartika','lina@surjar.id','0318001003'),
 ('aaaaaaa1-0000-4000-8000-000000000004','PT Mitra Akuntansi','MITAKU','Jasa Keuangan','Jl. Gatot Subroto 9','Jakarta','DKI Jakarta','Hendra Wijaya','hendra@mitaku.id','0218001004'),
 ('aaaaaaa1-0000-4000-8000-000000000005','PT Kreatif Media','KREMED','Digital Marketing','Jl. Diponegoro 5','Bandung','Jawa Barat','Nadia Putri','nadia@kremed.id','0228001005');

INSERT INTO public.company_quotas (company_id, competency, quota, used_quota, period) VALUES
 ('aaaaaaa1-0000-4000-8000-000000000001','Software Development',8,3,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000001','Digital Marketing',4,0,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000002','Teknik Mesin',6,2,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000002','Teknik Elektro',5,1,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000003','Networking',6,2,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000003','Software Development',3,3,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000004','Akuntansi',5,2,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000005','Digital Marketing',6,2,'2026-S1'),
 ('aaaaaaa1-0000-4000-8000-000000000005','Software Development',4,0,'2026-S1');

INSERT INTO public.students (id, school_id, student_number, name, gender, birth_date, phone, email, competency, status) VALUES
 ('bbbbbbb1-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','2026001','Ahmad Fauzan','L','2008-02-11','081300000001','fauzan@smkn1bdg.sch.id','Software Development','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','2026002','Siti Nurhaliza','P','2008-05-21','081300000002','siti@smkn1bdg.sch.id','Software Development','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','2026003','Rizky Ramadhan','L','2008-07-02','081300000003','rizky@smkn1bdg.sch.id','Teknik Mesin','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','2026004','Dewi Anggraini','P','2008-09-14','081300000004','dewi@smkn1bdg.sch.id','Digital Marketing','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','2026005','Bagas Prasetyo','L','2008-01-30','081300000005','bagas@smkn1bdg.sch.id','Teknik Elektro','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111','2026006','Intan Permata','P','2008-11-09','081300000006','intan@smkn1bdg.sch.id','Akuntansi','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111','2026007','Yoga Saputra','L','2008-03-18','081300000007','yoga@smkn1bdg.sch.id','Networking','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000008','22222222-2222-4222-8222-222222222222','2026101','Fajar Nugroho','L','2008-04-04','081300000008','fajar@smkn2sby.sch.id','Networking','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000009','22222222-2222-4222-8222-222222222222','2026102','Ayu Lestari','P','2008-06-25','081300000009','ayu@smkn2sby.sch.id','Akuntansi','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000010','22222222-2222-4222-8222-222222222222','2026103','Dimas Aditya','L','2008-08-15','081300000010','dimas@smkn2sby.sch.id','Teknik Mesin','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000011','22222222-2222-4222-8222-222222222222','2026104','Nabila Rahma','P','2008-10-06','081300000011','nabila@smkn2sby.sch.id','Software Development','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000012','22222222-2222-4222-8222-222222222222','2026105','Reza Maulana','L','2008-12-19','081300000012','reza@smkn2sby.sch.id','Digital Marketing','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000013','33333333-3333-4333-8333-333333333333','2026201','Kevin Wijaya','L','2008-02-28','081300000013','kevin@smktelkom.sch.id','Software Development','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000014','33333333-3333-4333-8333-333333333333','2026202','Melati Sari','P','2008-05-05','081300000014','melati@smktelkom.sch.id','Networking','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000015','33333333-3333-4333-8333-333333333333','2026203','Arif Setiawan','L','2008-07-23','081300000015','arif@smktelkom.sch.id','Software Development','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000016','33333333-3333-4333-8333-333333333333','2026204','Putri Amelia','P','2008-09-01','081300000016','putri@smktelkom.sch.id','Digital Marketing','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000017','33333333-3333-4333-8333-333333333333','2026205','Galih Pratama','L','2008-11-27','081300000017','galih@smktelkom.sch.id','Akuntansi','ACTIVE'),
 ('bbbbbbb1-0000-4000-8000-000000000018','33333333-3333-4333-8333-333333333333','2026206','Salsa Ramadhani','P','2009-01-12','081300000018','salsa@smktelkom.sch.id','Networking','ACTIVE');

INSERT INTO public.internships (id, student_id, school_id, company_id, competency, period, start_date, end_date, status) VALUES
 ('ccccccc1-0000-4000-8000-000000000001','bbbbbbb1-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','aaaaaaa1-0000-4000-8000-000000000001','Software Development','2026-S1','2026-01-05','2026-06-30','COMPLETED'),
 ('ccccccc1-0000-4000-8000-000000000002','bbbbbbb1-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','aaaaaaa1-0000-4000-8000-000000000001','Software Development','2026-S1','2026-01-05','2026-06-30','ACTIVE'),
 ('ccccccc1-0000-4000-8000-000000000003','bbbbbbb1-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','aaaaaaa1-0000-4000-8000-000000000002','Teknik Mesin','2026-S1','2026-01-12','2026-06-30','ACTIVE'),
 ('ccccccc1-0000-4000-8000-000000000004','bbbbbbb1-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','aaaaaaa1-0000-4000-8000-000000000005','Digital Marketing','2026-S1','2026-02-02','2026-07-31','SUBMITTED'),
 ('ccccccc1-0000-4000-8000-000000000005','bbbbbbb1-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','aaaaaaa1-0000-4000-8000-000000000002','Teknik Elektro','2026-S1','2026-02-02','2026-07-31','SUBMITTED'),
 ('ccccccc1-0000-4000-8000-000000000006','bbbbbbb1-0000-4000-8000-000000000008','22222222-2222-4222-8222-222222222222','aaaaaaa1-0000-4000-8000-000000000003','Networking','2026-S1','2026-01-05','2026-06-30','COMPLETED'),
 ('ccccccc1-0000-4000-8000-000000000007','bbbbbbb1-0000-4000-8000-000000000009','22222222-2222-4222-8222-222222222222','aaaaaaa1-0000-4000-8000-000000000004','Akuntansi','2026-S1','2026-01-05','2026-06-30','COMPLETED'),
 ('ccccccc1-0000-4000-8000-000000000008','bbbbbbb1-0000-4000-8000-000000000010','22222222-2222-4222-8222-222222222222','aaaaaaa1-0000-4000-8000-000000000002','Teknik Mesin','2026-S1','2026-01-12','2026-06-30','ACTIVE'),
 ('ccccccc1-0000-4000-8000-000000000009','bbbbbbb1-0000-4000-8000-000000000011','22222222-2222-4222-8222-222222222222','aaaaaaa1-0000-4000-8000-000000000003','Software Development','2026-S1','2026-01-12','2026-06-30','SUBMITTED'),
 ('ccccccc1-0000-4000-8000-000000000010','bbbbbbb1-0000-4000-8000-000000000013','33333333-3333-4333-8333-333333333333','aaaaaaa1-0000-4000-8000-000000000003','Software Development','2026-S1','2026-01-05','2026-06-30','COMPLETED'),
 ('ccccccc1-0000-4000-8000-000000000011','bbbbbbb1-0000-4000-8000-000000000014','33333333-3333-4333-8333-333333333333','aaaaaaa1-0000-4000-8000-000000000003','Networking','2026-S1','2026-01-05','2026-06-30','ACTIVE'),
 ('ccccccc1-0000-4000-8000-000000000012','bbbbbbb1-0000-4000-8000-000000000015','33333333-3333-4333-8333-333333333333','aaaaaaa1-0000-4000-8000-000000000003','Software Development','2026-S1','2026-01-05','2026-06-30','COMPLETED'),
 ('ccccccc1-0000-4000-8000-000000000013','bbbbbbb1-0000-4000-8000-000000000016','33333333-3333-4333-8333-333333333333','aaaaaaa1-0000-4000-8000-000000000005','Digital Marketing','2026-S1','2026-02-02','2026-07-31','SUBMITTED'),
 ('ccccccc1-0000-4000-8000-000000000014','bbbbbbb1-0000-4000-8000-000000000017','33333333-3333-4333-8333-333333333333','aaaaaaa1-0000-4000-8000-000000000004','Akuntansi','2026-S1','2026-01-12','2026-06-30','ACTIVE'),
 ('ccccccc1-0000-4000-8000-000000000015','bbbbbbb1-0000-4000-8000-000000000012','22222222-2222-4222-8222-222222222222','aaaaaaa1-0000-4000-8000-000000000005','Digital Marketing','2026-S1','2026-01-12','2026-06-30','REJECTED');

INSERT INTO public.attendance (internship_id, date, status)
SELECT i.id, d::date,
  CASE WHEN (extract(day from d)::int + abs(hashtext(i.id::text)) % 7) % 11 = 0 THEN 'ABSENT'
       WHEN (extract(day from d)::int + abs(hashtext(i.id::text)) % 5) % 7 = 0 THEN 'LATE'
       WHEN (extract(day from d)::int + abs(hashtext(i.id::text)) % 3) % 13 = 0 THEN 'EXCUSED'
       ELSE 'PRESENT' END
FROM public.internships i
CROSS JOIN LATERAL generate_series(i.start_date, i.start_date + 39, interval '1 day') d
WHERE i.status IN ('ACTIVE','COMPLETED') AND extract(isodow from d) < 6;

INSERT INTO public.internship_reports (internship_id, report_date, activity, achievement, obstacles, notes)
SELECT i.id, d::date,
  'Mengerjakan tugas harian sesuai arahan pembimbing industri.',
  'Menyelesaikan target modul mingguan.',
  CASE WHEN random() < 0.25 THEN 'Perlu adaptasi dengan tools baru.' ELSE NULL END,
  'Laporan mingguan.'
FROM public.internships i
CROSS JOIN LATERAL generate_series(i.start_date, i.start_date + 34, interval '7 day') d
WHERE i.status IN ('ACTIVE','COMPLETED');

INSERT INTO public.evaluations (internship_id, technical_score, non_technical_score, discipline_score, evaluator_name, notes) VALUES
 ('ccccccc1-0000-4000-8000-000000000001',88,85,90,'Sari Puspita','Sangat baik dalam pengembangan aplikasi.'),
 ('ccccccc1-0000-4000-8000-000000000002',82,80,84,'Sari Puspita','Progres bagus.'),
 ('ccccccc1-0000-4000-8000-000000000003',79,83,80,'Andi Rahman','Teliti dalam pekerjaan mesin.'),
 ('ccccccc1-0000-4000-8000-000000000006',86,84,88,'Lina Kartika','Menguasai konfigurasi jaringan.'),
 ('ccccccc1-0000-4000-8000-000000000007',80,86,85,'Hendra Wijaya','Rapi dalam pembukuan.'),
 ('ccccccc1-0000-4000-8000-000000000008',76,78,75,'Andi Rahman','Perlu peningkatan kedisiplinan.'),
 ('ccccccc1-0000-4000-8000-000000000010',92,89,93,'Lina Kartika','Kandidat rekrutmen.'),
 ('ccccccc1-0000-4000-8000-000000000011',85,87,86,'Lina Kartika','Konsisten.'),
 ('ccccccc1-0000-4000-8000-000000000012',90,88,91,'Lina Kartika','Sangat baik.'),
 ('ccccccc1-0000-4000-8000-000000000014',81,84,82,'Hendra Wijaya','Baik.');

INSERT INTO public.competency_demand (competency, company_id, location, period, requested_quota) VALUES
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000001','Jakarta','2024-S1',12),
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000001','Jakarta','2024-S2',15),
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000001','Jakarta','2025-S1',19),
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000001','Jakarta','2025-S2',24),
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2024-S1',6),
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2024-S2',8),
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2025-S1',11),
 ('Software Development','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2025-S2',13),
 ('Networking','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2024-S1',9),
 ('Networking','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2024-S2',10),
 ('Networking','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2025-S1',13),
 ('Networking','aaaaaaa1-0000-4000-8000-000000000003','Surabaya','2025-S2',15),
 ('Digital Marketing','aaaaaaa1-0000-4000-8000-000000000005','Bandung','2024-S1',5),
 ('Digital Marketing','aaaaaaa1-0000-4000-8000-000000000005','Bandung','2024-S2',7),
 ('Digital Marketing','aaaaaaa1-0000-4000-8000-000000000005','Bandung','2025-S1',10),
 ('Digital Marketing','aaaaaaa1-0000-4000-8000-000000000005','Bandung','2025-S2',14),
 ('Akuntansi','aaaaaaa1-0000-4000-8000-000000000004','Jakarta','2024-S1',8),
 ('Akuntansi','aaaaaaa1-0000-4000-8000-000000000004','Jakarta','2024-S2',8),
 ('Akuntansi','aaaaaaa1-0000-4000-8000-000000000004','Jakarta','2025-S1',7),
 ('Akuntansi','aaaaaaa1-0000-4000-8000-000000000004','Jakarta','2025-S2',7),
 ('Teknik Mesin','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2024-S1',10),
 ('Teknik Mesin','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2024-S2',9),
 ('Teknik Mesin','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2025-S1',9),
 ('Teknik Mesin','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2025-S2',8),
 ('Teknik Elektro','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2024-S1',4),
 ('Teknik Elektro','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2024-S2',5),
 ('Teknik Elektro','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2025-S1',6),
 ('Teknik Elektro','aaaaaaa1-0000-4000-8000-000000000002','Bandung','2025-S2',7);
