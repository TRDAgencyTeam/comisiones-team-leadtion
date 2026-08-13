-- =============================================================================
-- Migración 0005 — Módulo Comisiones Afiliados (LEADTION)
--
-- Migra el modelo de la plataforma de afiliados (que vivía en localStorage del
-- navegador) a Supabase. Afiliados que recomiendan el CRM (agencia/partner),
-- sus clientes referidos, los servicios adquiridos y los pagos por mes.
--
-- Se conservan los IDs originales como `ref` (texto) para preservar relaciones.
-- Tablas con sufijo `_afiliados` para no confundir con las de CS.
-- =============================================================================

create table if not exists public.afiliados (
  id                bigint generated always as identity primary key,
  ref               text unique not null,               -- id original ("afl-1", "afl-178...")
  nombre            text not null,
  email             text,
  tipo              text not null check (tipo in ('agencia','partner')),
  ingreso           date,
  notas             text,
  comision_agencia  numeric,                             -- % para agencia; -1/null para partner
  creado_en         timestamptz
);

create table if not exists public.clientes_afiliados (
  id                bigint generated always as identity primary key,
  ref               text unique not null,
  nombre            text not null,
  email             text,
  afiliado_ref      text,                                -- referencia lógica a afiliados.ref
  fecha_inicio      text,                                -- "octubre 2025" (texto original)
  precio_licencia   numeric,
  creado_en         timestamptz
);

create table if not exists public.servicios_afiliados (
  id                bigint generated always as identity primary key,
  ref               text unique not null,
  cliente_ref       text,                                -- referencia lógica a clientes_afiliados.ref
  tipo              text,                                -- text_ai / voz_ai / agente_ai / reactivacion
  nombre_personalizado text,
  precio            numeric
);

create table if not exists public.pagos_afiliados (
  id                bigint generated always as identity primary key,
  ref               text unique,
  cliente_ref       text,
  mes_num           integer,                             -- 0, 1, 2 (ciclo de 3 meses)
  fecha_pago        date,
  monto             numeric,
  notas             text,
  comprobante_nombre text
);

create index if not exists idx_cl_af_afiliado on public.clientes_afiliados (afiliado_ref);
create index if not exists idx_srv_af_cliente on public.servicios_afiliados (cliente_ref);
create index if not exists idx_pago_af_cliente on public.pagos_afiliados (cliente_ref);

comment on table public.afiliados is 'Afiliados que recomiendan el CRM: agencia (% fijo) o partner (% por nivel).';
comment on table public.clientes_afiliados is 'Clientes referidos por un afiliado.';
