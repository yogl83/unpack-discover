

# Root Cause and Fix Plan

## Problem
The previous security hardening migration revoked `EXECUTE` on `public.has_role()` from the `authenticated` role. This broke **every RLS policy** in the system that calls `has_role()` — which is nearly all of them. As a result:

1. **Partners page shows "Загрузка..."** — the query to `partner_overview` (view) triggers RLS on underlying tables, which call `has_role()`, which now returns "permission denied"
2. **Admin panel is inaccessible** — the sidebar hides "Администрирование" because `useAuth` fails to read from `user_roles` (also gated by `has_role()`)
3. **All write operations fail** — INSERT/UPDATE/DELETE policies all use `has_role()`

The DB logs confirm: **"permission denied for function has_role"** repeated hundreds of times.

## Fix

One migration to restore `EXECUTE` permission on `has_role` to the `authenticated` role:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
```

This is safe because:
- `has_role()` is `SECURITY DEFINER` — it runs as the function owner (superuser), bypassing RLS on `user_roles`
- A user can only check roles, not modify them
- The original concern about "role enumeration" is not a real risk here — users can only check their own role via RLS on `user_roles` anyway, and the function is needed for RLS to work at all

No other files need changes. The frontend code is correct — it's just getting errors from the database.

## Files Changed
- 1 new migration: `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated`

