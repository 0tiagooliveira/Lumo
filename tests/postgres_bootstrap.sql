-- Minimal local Supabase-compatible fixture for GitHub Actions ONLY.
-- This is NOT a replacement for the real Supabase Auth schema.
-- Never use this fixture in a hosted database with real users.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $lumo_auth$
 SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid;
$lumo_auth$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
