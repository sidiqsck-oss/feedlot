-- Initial schema for Feedlot app
-- Run this in Supabase SQL editor (Query) to create required tables

-- Shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id serial PRIMARY KEY,
  name text UNIQUE
);

-- Frames
CREATE TABLE IF NOT EXISTS public.frames (
  id serial PRIMARY KEY,
  name text UNIQUE
);

-- Properties
CREATE TABLE IF NOT EXISTS public.properties (
  id serial PRIMARY KEY,
  name text UNIQUE
);

-- Cattle Types (note camelCase table name to match client storeName)
CREATE TABLE IF NOT EXISTS public."cattleTypes" (
  id serial PRIMARY KEY,
  "name" text UNIQUE
);

-- Buyers
CREATE TABLE IF NOT EXISTS public.buyers (
  id serial PRIMARY KEY,
  name text UNIQUE
);

-- Induksi (match client field names exactly with quoted identifiers)
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

-- Print settings store
CREATE TABLE IF NOT EXISTS public."printSettings" (
  id text PRIMARY KEY,
  header text,
  address text,
  logo text,
  "pageSize" text
);

-- Basic foreign key hints (optional, uncomment to enforce)
-- ALTER TABLE public.induksi ADD CONSTRAINT fk_induksi_shipment FOREIGN KEY ("shipmentId") REFERENCES public.shipments(id);
-- ALTER TABLE public.induksi ADD CONSTRAINT fk_induksi_frame FOREIGN KEY ("frameId") REFERENCES public.frames(id);
-- ALTER TABLE public.induksi ADD CONSTRAINT fk_induksi_property FOREIGN KEY ("propertyId") REFERENCES public.properties(id);
-- ALTER TABLE public.induksi ADD CONSTRAINT fk_induksi_cattletype FOREIGN KEY ("cattleTypeId") REFERENCES public."cattleTypes"(id);
-- ALTER TABLE public.reweight ADD CONSTRAINT fk_reweight_induksi FOREIGN KEY ("induksiId") REFERENCES public.induksi(id);
-- ALTER TABLE public.sales ADD CONSTRAINT fk_sales_induksi FOREIGN KEY ("induksiId") REFERENCES public.induksi(id);
-- ALTER TABLE public.sales ADD CONSTRAINT fk_sales_buyer FOREIGN KEY ("buyerId") REFERENCES public.buyers(id);

-- Notes:
-- 1) Supabase / PostgREST is sensitive to identifier casing when names are quoted.
-- 2) This migration intentionally creates a quoted table name "cattleTypes" and
--    quoted column names that match the app's payload keys so upserts from the client succeed.
