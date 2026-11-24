-- Vincula un egreso con la factura que lo originó (ej. el costo de tercerización de
-- grabación de contenido). Con borrado en CASCADA: si se borra la factura, su egreso
-- de tercerización se borra solo. Al anular o editar la factura, el código re-sincroniza.

alter table public.egreso_mensual
  add column if not exists factura_origen_id bigint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'egreso_mensual_factura_origen_fkey') then
    alter table public.egreso_mensual
      add constraint egreso_mensual_factura_origen_fkey
      foreign key (factura_origen_id) references public.factura_mensual(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_egreso_factura_origen on public.egreso_mensual (factura_origen_id);
