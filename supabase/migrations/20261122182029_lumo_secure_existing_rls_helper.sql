-- Supabase security advisor: existing public.rls_auto_enable must not be callable over REST.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
