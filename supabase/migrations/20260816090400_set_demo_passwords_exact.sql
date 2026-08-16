-- Sync exact passwords matching frontend demo buttons in auth.tsx (Admin123! and Guru123!)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

UPDATE auth.users
SET 
  encrypted_password = extensions.crypt('Admin123!', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  role = 'authenticated',
  aud = 'authenticated',
  updated_at = now()
WHERE email = 'admin@example.com';

UPDATE auth.users
SET 
  encrypted_password = extensions.crypt('Guru123!', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  role = 'authenticated',
  aud = 'authenticated',
  updated_at = now()
WHERE email = 'guru@example.com';
