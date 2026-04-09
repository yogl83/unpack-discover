---
name: Partner Profiles Module
description: Structured company profiles with versioning, file uploads, workflow (draft→review→approved→archived), LLM-ready fields
type: feature
---

## Tables
- `partner_profiles` — 30+ fields: 13 content sections, status/versioning, authorship, LLM-ready fields
- `partner_profile_files` — metadata for uploaded source documents (.docx, .pdf, .txt, .md)
- Storage bucket: `partner-profile-files` (private)

## Content Sections
summary_short, company_overview, business_scale, technology_focus, strategic_priorities, talent_needs, collaboration_opportunities, current_relationship_with_miem, relationship_with_other_universities, recent_news_and_plans, key_events_and_touchpoints, risks_and_constraints, recommended_next_steps

## Workflow
- draft → review (analyst sends) → approved (admin approves) → archived
- One current approved profile per partner (partial unique index)
- Old versions preserved, version_number increments

## UI Components
- `src/components/partner/PartnerProfileTab.tsx` — main profile tab with view/edit/workflow
- `src/components/partner/ProfileFileUpload.tsx` — file upload/download/delete
- `src/components/partner/ProfileFreshnessBadge.tsx` — status indicator (green/orange/yellow/gray)

## Data Migration
- Existing partners with company_profile/technology_profile/strategic_priorities got initial approved profiles
- Legacy fields remain in `partners` table for backward compatibility

## LLM-Ready (Phase 2)
- Fields: generation_status, generated_from_prompt, generated_from_sources_json, needs_human_review, last_generated_at
- profile_type supports 'llm_draft', source_type supports 'llm'
- based_on_profile_id for version chains
