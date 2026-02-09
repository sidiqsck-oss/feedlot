-- Fix induksi table columns
-- Run this in Supabase SQL editor (Query) to ensure client upserts succeed.

-- 1) Add camelCase columns expected by client (if missing)
ALTER TABLE public.induksi
  ADD COLUMN IF NOT EXISTS "shipmentId" integer,
  ADD COLUMN IF NOT EXISTS rfid text,
  ADD COLUMN IF NOT EXISTS "tanggalInduksi" date,
  ADD COLUMN IF NOT EXISTS eartag text,
  ADD COLUMN IF NOT EXISTS "beratInduksi" numeric,
  ADD COLUMN IF NOT EXISTS pen text,
  ADD COLUMN IF NOT EXISTS gigi text,
  ADD COLUMN IF NOT EXISTS "frameId" integer,
  ADD COLUMN IF NOT EXISTS "propertyId" integer,
  ADD COLUMN IF NOT EXISTS vitamin integer,
  ADD COLUMN IF NOT EXISTS "cattleTypeId" integer;

-- 2) Add snake_case equivalents (optional) so fallback in client can write here
ALTER TABLE public.induksi
  ADD COLUMN IF NOT EXISTS shipment_id integer,
  ADD COLUMN IF NOT EXISTS tanggal_induksi date,
  ADD COLUMN IF NOT EXISTS berat_induksi numeric,
  ADD COLUMN IF NOT EXISTS frame_id integer,
  ADD COLUMN IF NOT EXISTS property_id integer,
  ADD COLUMN IF NOT EXISTS cattle_type_id integer;

-- 3) Backfill snake_case from camelCase when empty
UPDATE public.induksi
SET shipment_id = COALESCE(shipment_id, "shipmentId")::integer,
    tanggal_induksi = COALESCE(tanggal_induksi, "tanggalInduksi")::date,
    berat_induksi = COALESCE(berat_induksi, "beratInduksi")::numeric,
    frame_id = COALESCE(frame_id, "frameId")::integer,
    property_id = COALESCE(property_id, "propertyId")::integer,
    cattle_type_id = COALESCE(cattle_type_id, "cattleTypeId")::integer
WHERE (shipment_id IS NULL OR tanggal_induksi IS NULL OR berat_induksi IS NULL OR frame_id IS NULL OR property_id IS NULL OR cattle_type_id IS NULL)
  AND ("shipmentId" IS NOT NULL OR "tanggalInduksi" IS NOT NULL OR "beratInduksi" IS NOT NULL OR "frameId" IS NOT NULL OR "propertyId" IS NOT NULL OR "cattleTypeId" IS NOT NULL);

-- 4) Backfill camelCase from snake_case when empty
UPDATE public.induksi
SET "shipmentId" = COALESCE("shipmentId", shipment_id)::integer,
    "tanggalInduksi" = COALESCE("tanggalInduksi", tanggal_induksi)::date,
    "beratInduksi" = COALESCE("beratInduksi", berat_induksi)::numeric,
    "frameId" = COALESCE("frameId", frame_id)::integer,
    "propertyId" = COALESCE("propertyId", property_id)::integer,
    "cattleTypeId" = COALESCE("cattleTypeId", cattle_type_id)::integer
WHERE ("shipmentId" IS NULL OR "tanggalInduksi" IS NULL OR "beratInduksi" IS NULL OR "frameId" IS NULL OR "propertyId" IS NULL OR "cattleTypeId" IS NULL)
  AND (shipment_id IS NOT NULL OR tanggal_induksi IS NOT NULL OR berat_induksi IS NOT NULL OR frame_id IS NOT NULL OR property_id IS NOT NULL OR cattle_type_id IS NOT NULL);

-- 5) (Optional) Grant insert/update on table to anon/public role used by PostgREST
-- Uncomment and run if necessary for your Supabase project's REST role settings
-- GRANT INSERT, SELECT, UPDATE ON public.induksi TO anon;

-- Notes:
-- - This script is defensive: it creates both naming styles and tries to copy existing data between them.
-- - After running, either the camelCase columns or snake_case columns will be present with data so client upserts should succeed.
-- - If you prefer to keep only snake_case, consider dropping camelCase columns after verifying data.
