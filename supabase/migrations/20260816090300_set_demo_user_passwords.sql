-- Set valid encrypted password for demo users using extensions.pgcrypto bcrypt hash

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

UPDATE auth.users
SET 
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  role = 'authenticated',
  aud = 'authenticated',
  updated_at = now()
WHERE email IN ('admin@example.com', 'guru@example.com');
