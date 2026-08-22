-- Add mentor (Pendamping) and partnership_type (Kepesertaan Sekolah) to public.schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS mentor text,
  ADD COLUMN IF NOT EXISTS partnership_type text;
