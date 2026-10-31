# User management — Supabase migration order (hosted)

Apply in the SQL editor in this order:

| Step | File | Purpose |
|------|------|---------|
| 1 | `00031_user_management_security_hardening.sql` | Phase 1: platform admins, membership RPCs, org creation, RLS |
| 2 | `00032_unified_identity_authorization.sql` | Phase 2: staff_tier, legacy backfill, **5-column** `get_my_auth_capabilities` |
| 3 | `00034_role_definitions_safe_rebuild.sql` | Legacy-safe `role_definitions` |
| 4 | `00035_fix_get_my_auth_capabilities_signature.sql` | Optional repair if you applied an old 00031/00032 out of order |

Skip `00033` (no-op placeholder).

## If you already ran 00034 and 00035

1. Pull **latest** `00031` and `00032` from `main`.
2. Run **full** `00031` (it does **not** recreate `get_my_auth_capabilities`).
3. Run **full** `00032` (uses `DROP FUNCTION` before the 5-column RPC).
4. Re-run `00035` only if `get_my_auth_capabilities` is still missing or wrong.

Verify:

```sql
SELECT proname, pg_get_function_result(oid)
FROM pg_proc
WHERE proname = 'get_my_auth_capabilities';
```

Expected result type includes `platform_staff_tier`.

## Bootstrap (once)

Service role / SQL editor **without** end-user JWT:

```sql
SELECT public.bootstrap_first_platform_admin('<auth.users uuid>'::uuid);
```
