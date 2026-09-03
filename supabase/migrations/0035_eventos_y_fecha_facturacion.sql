-- =============================================================================
-- Migración 0035 — "Marketing para eventos" NO recurrente + día de facturación.
-- Cada cliente recurrente factura el mismo día cada mes; se propaga del mes previo.
-- =============================================================================

-- 1) Marketing para eventos: costo de un solo mes (no recurrente).
update public.servicio_catalogo set recurrente = false, precio_resto = null where clave = 'marketing_eventos';

-- 2) Elite Agent Club factura el 20 (agosto venía sin fecha).
update public.factura_mensual
   set fecha_factura = '2026-08-20'
 where mes = '2026-08-01' and lower(cliente_nombre) like 'elite agent%' and fecha_factura is null;

-- 3) Propaga el día de facturación de agosto a septiembre (recurrentes ya generados).
update public.factura_mensual s
   set fecha_factura = make_date(2026, 9, least(extract(day from a.fecha_factura)::int, 28))
  from public.factura_mensual a
 where s.mes = '2026-09-01' and a.mes = '2026-08-01'
   and lower(trim(s.cliente_nombre)) = lower(trim(a.cliente_nombre))
   and a.fecha_factura is not null and s.fecha_factura is null and s.recurrente = true;
