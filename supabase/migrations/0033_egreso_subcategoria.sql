-- =============================================================================
-- Migración 0033 — Subcategoría del egreso, para el desglose por grupos.
-- Los "fijos" del mes se snapshotean desde Nómina (colaboradores) y Gastos Fijos
-- (gasto_fijo); subcategoria = nomina / servicio_publico / herramienta / hosting / otro.
-- Los meses históricos con un "fijo" agregado se dejan como están.
-- =============================================================================
alter table public.egreso_mensual add column if not exists subcategoria text;
comment on column public.egreso_mensual.subcategoria is 'Sub-tipo del egreso fijo: nomina/servicio_publico/herramienta/hosting/otro.';
