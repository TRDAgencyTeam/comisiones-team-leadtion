-- =============================================================================
-- Migración 0032 — Grabación por hora + unidad del "por persona" + COL real julio.
-- =============================================================================

-- Unidad para servicios por cantidad (persona / hora) --------------------------
alter table public.servicio_catalogo add column if not exists unidad text;
update public.servicio_catalogo set unidad = 'persona' where clave in ('camp_90_10','evento_persona');

-- Grabación de contenido → por HORA (≈ $133,33/h, 3h ≈ $400). Editable.
update public.servicio_catalogo
   set por_persona = true, precio_persona = 133.33, precio_variable = false,
       precio_mes1 = null, precio_resto = null, unidad = 'hora'
 where clave = 'grabacion_contenido';

-- COL real de julio (reemplaza el agregado; cuadra el COL = $1.012 del resumen) --
delete from public.factura_mensual where mes = '2026-07-01' and entidad = 'COL';
insert into public.factura_mensual
  (mes, entidad, cliente_nombre, servicios, precio_desglose, facturado, medio, iva_pct, estado,
   recurrente, reserva, tasa, fecha_factura, fecha_pago)
values
  ('2026-07-01','COL','Lord And Lady','Meta Ads + Google Ads','$345.000 + $590.000',935000,'bancolombia',19,'facturado',true,false,3219,'2026-07-22',null),
  ('2026-07-01','COL','Lord By David','Meta Ads','$690.000',690000,'bancolombia',19,'facturado',true,false,3219,'2026-07-22',null),
  ('2026-07-01','COL','Bio Salud','Renovación Hosting Cloud + Dominio (Kur Hotel + BioSpa)','neto $508',1635252,'bancolombia',0,'pagado',false,false,3219,'2026-07-16','2026-07-30');
