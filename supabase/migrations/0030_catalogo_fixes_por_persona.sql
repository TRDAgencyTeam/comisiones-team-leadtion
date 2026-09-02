-- =============================================================================
-- Migración 0030 — Correcciones del catálogo + servicios "por persona".
--   - Precios base correctos por servicio (el bug de $1500 era del front, pero
--     igual dejamos los valores base bien en la BD).
--   - Servicios por participante: Campaña 90/10 ($100/persona) y Evento
--     presencial ($150/persona) — el front pregunta la cantidad y multiplica.
-- =============================================================================

alter table public.servicio_catalogo add column if not exists por_persona    boolean not null default false;
alter table public.servicio_catalogo add column if not exists precio_persona numeric(12,2);
comment on column public.servicio_catalogo.por_persona is 'Precio por participante: el total = precio_persona × cantidad.';

-- Precios base correctos ------------------------------------------------------
update public.servicio_catalogo set precio_variable=false, precio_mes1=797, precio_resto=797 where clave='ads_pro_business';
update public.servicio_catalogo set recurrente=true, precio_mes1=697, precio_resto=697 where clave='marketing_eventos';
update public.servicio_catalogo set precio_mes1=400, precio_resto=null where clave='grabacion_contenido';
-- hosting/dominio/renovaciones quedan variable (precio vacío):
update public.servicio_catalogo set precio_variable=true, precio_mes1=null, precio_resto=null
  where clave in ('hosting_cloud_12','dominio_web_12','renov_hosting','renov_dominio','seo_web','mantenimiento_web');

-- Servicios por persona -------------------------------------------------------
insert into public.servicio_catalogo
  (clave, nombre, categoria, recurrente, precio_variable, precio_mes1, precio_resto,
   min_meses, aplica_cs, aplica_referido, aplica_reserva, por_persona, precio_persona, orden)
values
  ('camp_90_10',   'Campaña 90/10 (por persona)',    'agencia', true,  false, null, null, 1, true, false, false, true, 100, 25),
  ('evento_persona','Evento presencial (por persona)','puntual', false, false, null, null, 1, true, false, false, true, 150, 118)
on conflict (clave) do nothing;
