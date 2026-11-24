-- Disposable CI only: attaches real PostgREST to a minimal fake Supabase identity table.
-- Never execute in a connected user database.
CREATE ROLE lumo_rest_authenticator LOGIN PASSWORD 'local_disposable_ci_password';
GRANT anon, authenticated TO lumo_rest_authenticator;
INSERT INTO auth.users(id) VALUES
 ('00000000-0000-4000-8000-000000000951'),
 ('00000000-0000-4000-8000-000000000952'),
 ('00000000-0000-4000-8000-000000000953');
