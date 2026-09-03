-- =============================================================================
-- Migración 0034 — Ítems de factura (varios servicios por cliente y mes).
-- Una factura puede tener N servicios (líneas). El total (facturado) y el texto
-- (servicios) de la factura se recalculan como suma/lista de sus ítems.
-- Las facturas existentes SIN ítems se muestran como una sola línea (sintética);
-- al guardar desde el editor, se crean los ítems reales.
-- =============================================================================
create table if not exists public.factura_item (
  id             bigserial primary key,
  factura_id     bigint not null references public.factura_mensual(id) on delete cascade,
  servicio_clave text,
  concepto       text not null,
  monto          numeric(14,2) not null default 0,
  orden          integer not null default 0,
  creado_en      timestamptz not null default now()
);
create index if not exists idx_factura_item on public.factura_item (factura_id);
comment on table public.factura_item is 'Líneas de servicio de una factura mensual (varios servicios por cliente/mes).';
