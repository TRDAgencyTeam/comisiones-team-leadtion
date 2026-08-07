-- =============================================================================
-- Migración 0004 — Estados de cliente (pausado) + planes y soporte
-- Plataforma de Comisiones CS (LEADTION)
--
-- 1) Estado "pausado/congelado" con motivo + historial de cambios de estado
--    (para saber en el futuro por qué se pausó o canceló una cuenta).
-- 2) Campos comerciales del cliente: tipo de plan (agente AI / reactivación) y
--    plan de soporte activo ($87 / $119 / $157).
-- =============================================================================

-- --- 1) Estado pausado + motivo -----------------------------------------------
alter table public.clientes drop constraint if exists clientes_estado_actual_check;
alter table public.clientes
  add constraint clientes_estado_actual_check
  check (estado_actual in ('activo','cancelado','pausado'));

alter table public.clientes add column if not exists motivo_estado text;
alter table public.clientes add column if not exists estado_actualizado_en timestamptz;

-- Historial de estados: cada cambio (activo/cancelado/pausado) con su motivo.
create table if not exists public.cliente_estado_historial (
  id           bigint generated always as identity primary key,
  cliente_id   bigint not null references public.clientes(id) on delete cascade,
  estado       text not null check (estado in ('activo','cancelado','pausado')),
  motivo       text,
  cambiado_en  timestamptz not null default now()
);
create index if not exists idx_estado_hist_cliente on public.cliente_estado_historial (cliente_id, cambiado_en);

comment on table public.cliente_estado_historial is
  'Auditoría de cambios de estado del cliente (por qué se pausó/canceló/reactivó).';

-- --- 2) Planes y soporte ------------------------------------------------------
-- Tipo de plan con que entró el cliente (los dos actuales).
alter table public.clientes add column if not exists plan_tipo text;
alter table public.clientes drop constraint if exists clientes_plan_tipo_check;
alter table public.clientes
  add constraint clientes_plan_tipo_check
  check (plan_tipo is null or plan_tipo in ('agente_ai','reactivacion'));

-- Plan de soporte activo (valor mensual). NULL = sin soporte.
alter table public.clientes add column if not exists soporte_valor numeric(12,2);

comment on column public.clientes.plan_tipo is 'Plan con que entró: agente_ai | reactivacion.';
comment on column public.clientes.soporte_valor is 'Plan de soporte activo: 87 / 119 / 157. NULL = sin soporte.';
