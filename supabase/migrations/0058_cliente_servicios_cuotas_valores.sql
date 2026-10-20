-- Valores EXACTOS de cada cuota (CSV, ej. "500,400,400") cuando un servicio se paga
-- en cuotas distintas (p. ej. Reactivación $1300 = 500+400+400). Permite que el
-- calendario de Membresías refleje el pago real por mes aunque las cuotas no sean
-- iguales. NULL / vacío = usar precio_mes1 por cuota (cuotas iguales) o el esquema normal.
alter table public.cliente_servicios
  add column if not exists cuotas_valores text;
