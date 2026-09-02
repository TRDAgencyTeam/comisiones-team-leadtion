-- =============================================================================
-- Migración 0027 — Rediseño Clientes de la madre:
--   1) servicio_catalogo  → catálogo de servicios con precios base EDITABLES.
--   2) egreso_mensual      → egresos del mes con flag afecta_utilidad / sale de caja.
--   3) ingreso_mensual     → "otros ingresos" que no son factura por cliente
--                            (reselling, WhatsApp API, mantenimientos, reservas…).
--   4) factura_mensual     → mes_contrato, servicio_clave y estado 'por_confirmar'
--                            (aviso "¿Continúa?" al terminar el contrato mínimo).
-- Todo aditivo e idempotente.
-- =============================================================================

-- 1) Catálogo de servicios ----------------------------------------------------
create table if not exists public.servicio_catalogo (
  id               bigserial primary key,
  clave            text unique not null,     -- 'plan_ads_ia_crm'
  nombre           text not null,            -- 'Plan Marketing Ads + IA + CRM'
  categoria        text not null check (categoria in ('agencia','leadtion','puntual')),
  recurrente       boolean not null default false,
  precio_variable  boolean not null default false,  -- el precio se define por cliente
  precio_mes1      numeric(12,2),            -- precio base mes 1 (editable al crear)
  precio_resto     numeric(12,2),            -- precio base mes 2+ (recurrente)
  min_meses        integer not null default 1,      -- contrato mínimo (4 = plan marketing)
  aplica_cs        boolean not null default true,   -- comisiona CS (todos menos social media)
  aplica_referido  boolean not null default false,  -- referido por afiliado (solo Leadtion)
  aplica_reserva   boolean not null default false,  -- "vino con reserva" (solo Leadtion)
  orden            integer not null default 100,
  activo           boolean not null default true,
  notas            text,
  creado_en        timestamptz not null default now()
);
comment on table public.servicio_catalogo is 'Catálogo de servicios (agencia/Leadtion/puntual) con precios base editables.';

-- 2) Egresos del mes ----------------------------------------------------------
create table if not exists public.egreso_mensual (
  id               bigserial primary key,
  mes              date not null,            -- primer día del mes
  concepto         text not null,
  marca            text,                     -- TRD / Ebenezer / Leadtion
  fecha            date,
  valor_usd        numeric(14,2) not null default 0,
  valor_cop        numeric(16,2),
  afecta_utilidad  boolean not null default true,  -- true = gasto del mes; false = sale de caja
  categoria        text,                     -- fijo/variable/bono/referido/comision_banco/publicidad/herramienta/diezmo/otro
  automatico       boolean not null default false, -- el diezmo se genera solo
  notas            text,
  creado_en        timestamptz not null default now()
);
create index if not exists idx_egreso_mes on public.egreso_mensual (mes);
comment on table public.egreso_mensual is 'Egresos del mes: afecta_utilidad=true (gasto del mes) vs false (sale de caja).';

-- 3) Otros ingresos del mes (no-factura) -------------------------------------
create table if not exists public.ingreso_mensual (
  id               bigserial primary key,
  mes              date not null,            -- primer día del mes
  concepto         text not null,
  fecha            date,
  valor_usd        numeric(14,2) not null default 0,
  categoria        text,                     -- reselling/whatsapp_api/mantenimiento/reserva/afiliacion/hosting/otro
  notas            text,
  creado_en        timestamptz not null default now()
);
create index if not exists idx_ingreso_mes on public.ingreso_mensual (mes);
comment on table public.ingreso_mensual is 'Otros ingresos del mes que no son factura por cliente.';

-- 4) factura_mensual: contrato + enlace a catálogo + estado por_confirmar -----
alter table public.factura_mensual add column if not exists mes_contrato   integer;
alter table public.factura_mensual add column if not exists servicio_clave text;
alter table public.factura_mensual add column if not exists tasa           numeric(12,4);
comment on column public.factura_mensual.tasa is 'Tasa USD/COP usada ese mes (COL). Si es null, usa la tasa viva.';

alter table public.factura_mensual drop constraint if exists factura_mensual_estado_check;
alter table public.factura_mensual add constraint factura_mensual_estado_check
  check (estado in ('pagado','facturado','anulado','por_facturar','programado','por_confirmar'));

comment on column public.factura_mensual.mes_contrato is 'Nº de mes dentro del contrato (1,2,3…). Al superar el mínimo → estado por_confirmar.';
comment on column public.factura_mensual.servicio_clave is 'Clave del servicio_catalogo principal (opcional).';
