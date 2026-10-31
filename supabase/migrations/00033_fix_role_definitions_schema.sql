-- Repair `role_definitions` when a legacy table existed before 00032 (missing role_key column).
-- Safe to run even if 00032 already succeeded on greenfield databases.

DO $$
BEGIN
  IF to_regclass('public.role_definitions') IS NULL THEN
    CREATE TABLE public.role_definitions (
      role_key TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      description TEXT,
      domain TEXT,
      is_org_admin BOOLEAN NOT NULL DEFAULT FALSE,
      is_approver BOOLEAN NOT NULL DEFAULT FALSE,
      legacy_aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    ALTER TABLE public.role_definitions
      ADD COLUMN IF NOT EXISTS role_key TEXT,
      ADD COLUMN IF NOT EXISTS display_name TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS domain TEXT,
      ADD COLUMN IF NOT EXISTS is_org_admin BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_approver BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS legacy_aliases JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'role_definitions' AND column_name = 'code'
    ) THEN
      EXECUTE $sql$
        UPDATE public.role_definitions
        SET role_key = code
        WHERE role_key IS NULL AND code IS NOT NULL
      $sql$;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'role_definitions' AND column_name = 'name_en'
    ) THEN
      EXECUTE $sql$
        UPDATE public.role_definitions
        SET display_name = COALESCE(display_name, name_en)
        WHERE display_name IS NULL AND name_en IS NOT NULL
      $sql$;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'role_definitions' AND column_name = 'name'
    ) THEN
      EXECUTE $sql$
        UPDATE public.role_definitions
        SET display_name = COALESCE(display_name, name)
        WHERE display_name IS NULL AND name IS NOT NULL
      $sql$;
    END IF;

    UPDATE public.role_definitions
    SET is_org_admin = COALESCE(is_org_admin, FALSE),
        is_approver = COALESCE(is_approver, FALSE),
        legacy_aliases = COALESCE(legacy_aliases, '[]'::jsonb),
        created_at = COALESCE(created_at, NOW());
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS role_definitions_role_key_uidx
  ON public.role_definitions (role_key)
  WHERE role_key IS NOT NULL;

ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_definitions_read ON public.role_definitions;
CREATE POLICY role_definitions_read
  ON public.role_definitions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

INSERT INTO public.role_definitions (role_key, display_name, domain, is_org_admin, is_approver, legacy_aliases)
SELECT v.role_key, v.display_name, v.domain, v.is_org_admin, v.is_approver, v.legacy_aliases
FROM (
  VALUES
    ('owner', 'Owner', 'organization', TRUE, FALSE, '["owner"]'::jsonb),
    ('admin', 'Administrator', 'organization', TRUE, FALSE, '["admin"]'::jsonb),
    ('ministry_admin', 'Ministry administrator', 'government', TRUE, TRUE, '["ministry_admin","ministry_super_admin"]'::jsonb),
    ('ministry_officer', 'Ministry officer', 'government', FALSE, FALSE, '["ministry_officer"]'::jsonb),
    ('ministry_inspector', 'Inspector', 'government', FALSE, FALSE, '["ministry_inspector","inspector"]'::jsonb),
    ('sourcing_manager', 'Supply manager', 'supply', FALSE, FALSE, '["sourcing_manager","supply_chain_officer","hassad_admin"]'::jsonb),
    ('finance_officer', 'Finance officer', 'finance', FALSE, FALSE, '["finance_officer","credit_analyst","qdb_admin"]'::jsonb),
    ('farm_company_admin', 'Farm company administrator', 'farm', TRUE, FALSE, '["farm_company_admin"]'::jsonb),
    ('farm_manager', 'Farm manager', 'farm', FALSE, FALSE, '["farm_manager"]'::jsonb),
    ('agronomist', 'Agronomist', 'farm', FALSE, FALSE, '["agronomist"]'::jsonb),
    ('analyst', 'Analyst', 'intelligence', FALSE, FALSE, '["analyst"]'::jsonb),
    ('operator', 'Operator', 'operations', FALSE, FALSE, '["operator","editor"]'::jsonb),
    ('viewer', 'Viewer', 'organization', FALSE, FALSE, '["viewer","member"]'::jsonb)
) AS v(role_key, display_name, domain, is_org_admin, is_approver, legacy_aliases)
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'role_definitions' AND column_name = 'role_key'
)
  AND NOT EXISTS (
    SELECT 1 FROM public.role_definitions rd WHERE rd.role_key = v.role_key
  );
