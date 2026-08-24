-- =============================================================================
-- Migración 0023 — Histórico de gastos fijos (snapshot mensual)
--
-- Guarda el total de gastos fijos de cada mes para verlo en el tiempo. Se puede
-- guardar un snapshot del mes actual desde el Resumen.
-- =============================================================================

create table if not exists public.gasto_fijo_snapshot (
  mes        date primary key,          -- primer día del mes
  total_cop  numeric(16,2) not null default 0,
  total_usd  numeric(16,2) not null default 0,
  tasa       numeric(12,2) not null default 0,
  creado_en  timestamptz not null default now()
);

comment on table public.gasto_fijo_snapshot is 'Total de gastos fijos por mes (histórico).';
