-- Pago único para planes recurrentes (ej. Marketing Ads+IA+CRM vendido en un solo
-- pago). El cliente cuenta como USUARIO Leadtion pero NO genera cobro mensual; el
-- ingreso entra una sola vez (la factura). El costo de API ($10/mes) SÍ sigue
-- contando mientras la licencia esté activa (api_estado='incluida'). Se guarda la
-- ventana de servicio (vigencia_meses) y su fecha de vencimiento para avisar la
-- renovación un mes antes.

alter table public.clientes
  add column if not exists pago_unico boolean not null default false,
  add column if not exists vigencia_meses int,
  add column if not exists vence_el date;

alter table public.factura_mensual
  add column if not exists pago_unico boolean not null default false,
  add column if not exists vence_el date;

create index if not exists idx_clientes_pago_unico_vence
  on public.clientes (vence_el) where pago_unico and estado_actual = 'activo';
