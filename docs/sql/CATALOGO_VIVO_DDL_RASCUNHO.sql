-- DRAFT ONLY: Lumo shared product catalog (never apply without final security review).
-- Supabase CLI will generate the timestamped migration when this contract is approved.
-- No shopper-owned list, receipt, token, or user profile belongs in this catalog.
CREATE TABLE public.catalog_products (
  gtin text PRIMARY KEY CHECK (gtin ~ '^[0-9]{8,14}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  brand text CHECK (brand IS NULL OR char_length(brand)<=120),
  package_label text CHECK (package_label IS NULL OR char_length(package_label)<=80),
  category text CHECK (category IS NULL OR char_length(category)<=80),
  image_url text CHECK (image_url IS NULL OR image_url LIKE 'https://%'),
  image_source_url text CHECK (image_source_url IS NULL OR image_source_url LIKE 'https://%'),
  source text NOT NULL CHECK (source IN ('open_food_facts','licensed_retailer','human_verified')),
  source_url text NOT NULL CHECK (source_url LIKE 'https://%'),
  source_license text NOT NULL,
  image_license text,
  quality_score smallint NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'review' CHECK (status IN ('review','verified','rejected')),
  verified_at timestamptz,
  refresh_after timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_verified_at_required CHECK (status <> 'verified' OR verified_at IS NOT NULL),
  CONSTRAINT catalog_image_license_required CHECK (image_url IS NULL OR image_license IS NOT NULL)
);
CREATE INDEX catalog_products_due_idx ON public.catalog_products(refresh_after)
  WHERE status='verified';

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.catalog_products FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.catalog_products TO anon, authenticated;
GRANT ALL ON TABLE public.catalog_products TO service_role;
CREATE POLICY catalog_only_verified_read ON public.catalog_products
 FOR SELECT TO anon, authenticated USING (status='verified');

-- Private worker-only queue. Not exposed through PostgREST.
CREATE TABLE private.catalog_refresh_jobs (
 gtin text PRIMARY KEY CHECK (gtin ~ '^[0-9]{8,14}$'),
 requested_at timestamptz NOT NULL DEFAULT now(),
 due_at timestamptz NOT NULL DEFAULT now(),
 last_attempt_at timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 1000),
 state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','retry','done','rejected')),
 last_error_class text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_refresh_due_idx ON private.catalog_refresh_jobs(due_at)
 WHERE state IN ('queued','retry');
ALTER TABLE private.catalog_refresh_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.catalog_refresh_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.catalog_refresh_jobs TO service_role;

-- Candidate evidence must be reviewed before the public verified view accepts it.
CREATE TABLE private.catalog_candidates (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 gtin text NOT NULL CHECK (gtin ~ '^[0-9]{8,14}$'),
 source text NOT NULL,
 source_url text NOT NULL CHECK (source_url LIKE 'https://%'),
 name text,
 image_url text,
 problem text,
 checked_at timestamptz NOT NULL DEFAULT now(),
 review_status text NOT NULL DEFAULT 'queued'
 CHECK (review_status IN ('queued','accepted','rejected'))
);
CREATE INDEX catalog_candidates_gtin_idx ON private.catalog_candidates(gtin,checked_at DESC);
ALTER TABLE private.catalog_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.catalog_candidates FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.catalog_candidates TO service_role;

COMMENT ON TABLE public.catalog_products IS 'Read-only verified GTIN catalog, no personal shopper data. Writes only by trusted service.';
COMMENT ON TABLE private.catalog_refresh_jobs IS 'Internal rate-limited, retryable public-data verification queue.';
COMMENT ON TABLE private.catalog_candidates IS 'Untrusted source candidates awaiting verification. Never exposed to browser.';
