-- Phase 2: unified identity, organization, and permission model (compatibility layer).

-- Platform staff tiers (separate from organization administration).
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS staff_tier TEXT NOT NULL DEFAULT 'super_admin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_admins_staff_tier_check'
      AND conrelid = 'public.platform_admins'::regclass
  ) THEN
    ALTER TABLE public.platform_admins
      ADD CONSTRAINT platform_admins_staff_tier_check
      CHECK (staff_tier IN ('super_admin', 'support'));
  END IF;
END
$$;

-- Canonical role registry (documentation + validation; permissions enforced in app layer).
-- Some environments already had a legacy `role_definitions` table with different columns.
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

-- Map legacy role_templates.code → canonical role (conservative; never escalates).
CREATE OR REPLACE FUNCTION public.map_legacy_role_template_to_canonical(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(trim(coalesce(p_code, '')))
    WHEN 'super_admin' THEN 'super_admin'
    WHEN 'admin' THEN 'admin'
    WHEN 'ministry_super_admin' THEN 'ministry_admin'
    WHEN 'ministry_admin' THEN 'ministry_admin'
    WHEN 'ministry_officer' THEN 'ministry_officer'
    WHEN 'inspector' THEN 'ministry_inspector'
    WHEN 'hassad_admin' THEN 'sourcing_manager'
    WHEN 'supply_chain_officer' THEN 'sourcing_manager'
    WHEN 'sourcing_manager' THEN 'sourcing_manager'
    WHEN 'finance_officer' THEN 'finance_officer'
    WHEN 'credit_analyst' THEN 'finance_officer'
    WHEN 'qdb_admin' THEN 'finance_officer'
    WHEN 'farm_company_admin' THEN 'farm_company_admin'
    WHEN 'farm_manager' THEN 'farm_manager'
    WHEN 'agronomist' THEN 'agronomist'
    WHEN 'operator' THEN 'operator'
    WHEN 'editor' THEN 'operator'
    WHEN 'viewer' THEN 'viewer'
    WHEN 'member' THEN 'viewer'
    WHEN 'owner' THEN 'owner'
    ELSE 'viewer'
  END;
$$;

CREATE OR REPLACE FUNCTION public.list_legacy_memberships_for_user(p_user_id UUID)
RETURNS TABLE (organization_id UUID, role TEXT, status TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RETURN;
  END IF;

  IF to_regclass('public.memberships') IS NULL OR to_regclass('public.role_templates') IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.organization_id,
    public.map_legacy_role_template_to_canonical(rt.code)::TEXT AS role,
    CASE WHEN m.status::TEXT = 'active' THEN 'active' ELSE 'inactive' END AS status
  FROM public.memberships m
  JOIN public.role_templates rt ON rt.id = m.role_template_id
  WHERE m.profile_id = p_user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_organization_members uom
      WHERE uom.user_id = p_user_id
        AND uom.organization_id = m.organization_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.list_legacy_memberships_for_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_legacy_memberships_for_user(UUID) TO authenticated;

-- Idempotent backfill: copy legacy memberships into canonical table without overwriting.
DO $$
BEGIN
  IF to_regclass('public.memberships') IS NOT NULL AND to_regclass('public.role_templates') IS NOT NULL THEN
    INSERT INTO public.user_organization_members (user_id, organization_id, role, status)
    SELECT
      m.profile_id,
      m.organization_id,
      public.map_legacy_role_template_to_canonical(rt.code),
      CASE WHEN m.status::TEXT = 'active' THEN 'active' ELSE 'inactive' END
    FROM public.memberships m
    JOIN public.role_templates rt ON rt.id = m.role_template_id
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END IF;
END
$$;

-- Extend auth capabilities RPC with platform staff tier.
CREATE OR REPLACE FUNCTION public.get_my_auth_capabilities()
RETURNS TABLE (
  is_platform_admin BOOLEAN,
  platform_staff_tier TEXT,
  role_preview_active BOOLEAN,
  preview_role TEXT,
  preview_org_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_preview RECORD;
  v_tier TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT s.role_name, s.org_id, s.is_impersonating
  INTO v_preview
  FROM public.user_impersonation_state s
  WHERE s.user_id = v_uid
  LIMIT 1;

  SELECT pa.staff_tier INTO v_tier
  FROM public.platform_admins pa
  WHERE pa.user_id = v_uid
  LIMIT 1;

  RETURN QUERY
  SELECT
    public.is_platform_admin(v_uid),
    COALESCE(v_tier, CASE WHEN public.is_platform_admin(v_uid) THEN 'super_admin' ELSE NULL END),
    COALESCE(v_preview.is_impersonating, FALSE) AND public.is_platform_admin(v_uid),
    CASE WHEN COALESCE(v_preview.is_impersonating, FALSE) THEN v_preview.role_name ELSE NULL END,
    CASE WHEN COALESCE(v_preview.is_impersonating, FALSE) THEN v_preview.org_id ELSE NULL END;
END;
$$;

-- Organization type consolidation helper (read path prefers organization_type).
CREATE OR REPLACE FUNCTION public.organization_type_value(p_org public.organizations)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(trim(p_org.organization_type), ''), NULLIF(trim(p_org.type), ''), 'private');
$$;
