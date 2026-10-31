# User management — Supabase migration order (hosted)

Apply in this order when using the SQL editor manually:

| Step | Migration | Notes |
|------|-----------|--------|
| 1 | `00031_user_management_security_hardening.sql` | Phase 1 security. **Does not** redefine `get_my_auth_capabilities` (see 00035). |
| 2 | `00032_unified_identity_authorization.sql` | Phase 2 functions + staff_tier column. |
| 3 | `00034_role_definitions_safe_rebuild.sql` | Legacy-safe `role_definitions`. |
| 4 | `00035_fix_get_my_auth_capabilities_signature.sql` | **Authoritative** `get_my_auth_capabilities` (5 columns). |

If **00035 was applied before 00031** (common when fixing errors):

- **Do not** run an old copy of 00031 that still contains `CREATE OR REPLACE FUNCTION public.get_my_auth_capabilities` (4 columns). That causes `42P13: cannot change return type of existing function`.
- Pull **latest** `00031_user_management_security_hardening.sql` from `main` (it only **grants** on `get_my_auth_capabilities` if 00035 already created it) and run the **entire** file again — it is idempotent.
- Quick check in your SQL file: search for `get_my_auth_capabilities`. You should see comments + a `DO $$ … GRANT` block, **not** a `CREATE OR REPLACE FUNCTION`.

Skip `00033` (no-op).

After migrations: `bootstrap_first_platform_admin(uuid)` once (service role).
