-- =============================================================================
-- Migración 0014 — Fecha exacta de compra del servicio
--
-- Además del mes (que define la ventana de cobros), guardamos el DÍA exacto en
-- que el cliente compró el servicio, para saber el momento preciso. La ventana
-- de cobros (mes 1/2/3) se sigue calculando por el MES de esa fecha.
-- =============================================================================

alter table public.cliente_servicios add column if not exists fecha_compra date;

-- Backfill: para servicios ya registrados, usamos el primer día de su mes de inicio
-- (no se conoce el día exacto; el admin puede corregirlo editando el servicio).
update public.cliente_servicios set fecha_compra = mes_inicio where fecha_compra is null;

comment on column public.cliente_servicios.fecha_compra is 'Día exacto de compra del servicio. El mes de esta fecha define la ventana de cobros (mes_inicio).';
