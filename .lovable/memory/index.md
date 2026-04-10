# Project Memory

## Core
MIEM HSE Partnership Management System. Russian UI, English DB schema.
Supabase backend with RBAC: admin/analyst/viewer via user_roles + has_role().
HSE blue primary (#1a5fb4). Professional compact business UI.
All field labels from 04_UI_MAPPING_RU_EN.md mapping file.
Sources and Evidence entities removed — data model simplified.

## Memories
- [DB Schema](mem://features/db-schema) — 10 tables (no sources/evidence), 2 views
- [UI Labels](mem://features/ui-labels) — Russian labels for all fields per entity from uploaded mapping
- [Roles](mem://features/roles) — 3 roles: admin (full), analyst (CRUD), viewer (read-only)
