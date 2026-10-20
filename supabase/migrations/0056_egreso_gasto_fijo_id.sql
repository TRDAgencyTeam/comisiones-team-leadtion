-- Enlaza cada snapshot de egreso fijo (herramienta/hosting/operativo) con el
-- gasto_fijo que lo originó, para poder mostrar el historial de cobros por mes de
-- una herramienta aunque se le haya cambiado el nombre. Nulo para nómina/crédito.
alter table public.egreso_mensual
  add column if not exists gasto_fijo_id bigint references public.gasto_fijo(id) on delete set null;

create index if not exists egreso_mensual_gasto_fijo_id_idx
  on public.egreso_mensual (gasto_fijo_id);

-- Backfill: emparejar los snapshots existentes con su gasto por nombre + categoría.
update public.egreso_mensual em
   set gasto_fijo_id = g.id
  from public.gasto_fijo g
 where em.categoria = 'fijo'
   and em.gasto_fijo_id is null
   and em.subcategoria = g.categoria
   and em.concepto = g.nombre;
