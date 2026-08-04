-- Multi-select gadget interest (owner decision, 2026-08-04 — supersedes
-- README key decision #3 "single-select").
--
-- Rollout-safe: `gadgets` stays NULLABLE and the legacy `gadget` column keeps
-- working, so the currently deployed code (which writes only `gadget`) never
-- breaks. New code writes BOTH (gadget = first selection) and readers fall
-- back to array[gadget] when gadgets is null. Tightening (NOT NULL, dropping
-- `gadget`) is a post-event cleanup migration.

alter table leads add column gadgets text[];

update leads set gadgets = array[gadget] where gadgets is null;

alter table leads add constraint leads_gadgets_valid check (
  gadgets is null
  or (
    array_length(gadgets, 1) >= 1
    and gadgets <@ array['iphone','samsung','laptop','audio','watch','gaming','other']::text[]
  )
);

-- Segment queries filter "who wants an iphone" — GIN answers gadgets @> '{iphone}'.
create index leads_org_gadgets_idx on leads using gin (gadgets);
