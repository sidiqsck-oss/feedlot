-- Full Supabase setup for Feedlot app
-- Paste & run this in Supabase -> SQL Editor (Query)
-- Notes:
--  - This script creates tables matching the client payload (camelCase) and
--    also adds snake_case columns and syncing shown below. It also enables
--    Row Level Security (RLS) and creates permissive policies for demo purposes.
--  - Review and tighten policies before using in production.

BEGIN;

-- Create helper extension (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create reference tables
CREATE TABLE IF NOT EXISTS public.shipments (
  id serial PRIMARY KEY,
  name text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.frames (
  id serial PRIMARY KEY,
  name text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.properties (
  id serial PRIMARY KEY,
  name text UNIQUE
);

CREATE TABLE IF NOT EXISTS public.buyers (
  id serial PRIMARY KEY,
  name text UNIQUE
);

-- Keep cattleTypes as quoted camelCase to match client storeName
CREATE TABLE IF NOT EXISTS public."cattleTypes" (
  id serial PRIMARY KEY,
  "name" text UNIQUE
);

-- Induksi table (create camelCase columns to match client payload)
CREATE TABLE IF NOT EXISTS public.induksi (
  id serial PRIMARY KEY,
  "shipmentId" integer,
  rfid text,
  "tanggalInduksi" date,
  eartag text,
  "beratInduksi" numeric,
  pen text,
  gigi text,
  "frameId" integer,
  "propertyId" integer,
  vitamin integer,
  "cattleTypeId" integer
);

-- Reweight
CREATE TABLE IF NOT EXISTS public.reweight (
  id serial PRIMARY KEY,
  "induksiId" integer,
  "tanggalReweight" date,
  "beratReweight" numeric,
  "penAwal" text,
  "penAkhir" text,
  dof integer,
  adg numeric,
  vitamin integer
);

-- Sales
CREATE TABLE IF NOT EXISTS public.sales (
  id serial PRIMARY KEY,
  "induksiId" integer,
  "buyerId" integer,
  "tanggalJual" date,
  "beratJual" numeric
);

-- Print settings
CREATE TABLE IF NOT EXISTS public."printSettings" (
  id text PRIMARY KEY,
  header text,
  address text,
  logo text,
  "pageSize" text
);

-- Add snake_case helper columns for compatibility (optional)
ALTER TABLE public.induksi
  ADD COLUMN IF NOT EXISTS shipment_id integer,
  ADD COLUMN IF NOT EXISTS tanggal_induksi date,
  ADD COLUMN IF NOT EXISTS berat_induksi numeric,
  ADD COLUMN IF NOT EXISTS frame_id integer,
  ADD COLUMN IF NOT EXISTS property_id integer,
  ADD COLUMN IF NOT EXISTS cattle_type_id integer;

-- Sync values between camelCase and snake_case if present
-- (these updates are idempotent and safe to run once)
UPDATE public.induksi
SET shipment_id = COALESCE(shipment_id, "shipmentId")::integer,
    tanggal_induksi = COALESCE(tanggal_induksi, "tanggalInduksi")::date,
    berat_induksi = COALESCE(berat_induksi, "beratInduksi")::numeric,
    frame_id = COALESCE(frame_id, "frameId")::integer,
    property_id = COALESCE(property_id, "propertyId")::integer,
    cattle_type_id = COALESCE(cattle_type_id, "cattleTypeId")::integer
WHERE (shipment_id IS NULL OR tanggal_induksi IS NULL OR berat_induksi IS NULL OR frame_id IS NULL OR property_id IS NULL OR cattle_type_id IS NULL)
  AND ("shipmentId" IS NOT NULL OR "tanggalInduksi" IS NOT NULL OR "beratInduksi" IS NOT NULL OR "frameId" IS NOT NULL OR "propertyId" IS NOT NULL OR "cattleTypeId" IS NOT NULL);

UPDATE public.induksi
SET "shipmentId" = COALESCE("shipmentId", shipment_id)::integer,
    "tanggalInduksi" = COALESCE("tanggalInduksi", tanggal_induksi)::date,
    "beratInduksi" = COALESCE("beratInduksi", berat_induksi)::numeric,
    "frameId" = COALESCE("frameId", frame_id)::integer,
    "propertyId" = COALESCE("propertyId", property_id)::integer,
    "cattleTypeId" = COALESCE("cattleTypeId", cattle_type_id)::integer
WHERE ("shipmentId" IS NULL OR "tanggalInduksi" IS NULL OR "beratInduksi" IS NULL OR "frameId" IS NULL OR "propertyId" IS NULL OR "cattleTypeId" IS NULL)
  AND (shipment_id IS NOT NULL OR tanggal_induksi IS NOT NULL OR berat_induksi IS NOT NULL OR frame_id IS NOT NULL OR property_id IS NOT NULL OR cattle_type_id IS NOT NULL);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_induksi_rfid ON public.induksi (rfid);
CREATE INDEX IF NOT EXISTS idx_reweight_induksiId ON public.reweight ("induksiId");

-- Enable Row Level Security and add permissive policies for demo
-- WARNING: These policies are permissive. Tighten them for production.
ALTER TABLE public.induksi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "induksi_all" ON public.induksi
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.reweight ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reweight_all" ON public.reweight
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_all" ON public.sales
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipments_all" ON public.shipments
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frames_all" ON public.frames
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_all" ON public.properties
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers_all" ON public.buyers
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public."cattleTypes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cattletype_all" ON public."cattleTypes"
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE public."printSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "printsettings_all" ON public."printSettings"
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMIT;

-- Final note:
-- After executing this script, allow a minute for PostgREST schema cache to update.
-- Then retry client-side push. If you prefer stricter policies, replace the
-- policy bodies to enforce authenticated access only.
