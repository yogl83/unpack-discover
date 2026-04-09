# Project Memory

## Core
MIEM HSE Partnership Management System. Russian UI, English DB schema.
Supabase backend with RBAC: admin/analyst/viewer via user_roles + has_role().
HSE blue primary (#1a5fb4). Professional compact business UI.
All field labels from 04_UI_MAPPING_RU_EN.md mapping file.

## Memories
- [DB Schema](mem://features/db-schema) — 12 tables, 2 views, full SQL in 03_SUPABASE_SCHEMA.sql
- [UI Labels](mem://features/ui-labels) — Russian labels for all fields per entity from uploaded mapping
- [Roles](mem://features/roles) — 3 roles: admin (full), analyst (CRUD), viewer (read-only)
- [Partner Profiles](mem://features/partner-profiles) — Structured company profiles with versioning, file storage, LLM-ready
