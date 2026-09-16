-- Qué servicios comisionan al equipo comercial. Por defecto TODO comisiona; se
-- excluyen (regla de Mauro): Hosting, Dominio, plan de grabación y Campañas 90/10.
alter table public.servicio_catalogo
  add column if not exists comisiona_comercial boolean not null default true;

update public.servicio_catalogo set comisiona_comercial = false
 where clave in ('hosting_cloud_12','renov_hosting','dominio_web_12','renov_dominio','grabacion_contenido','camp_90_10');

comment on column public.servicio_catalogo.comisiona_comercial is
  'true = la venta de este servicio genera comisión del equipo comercial (10%). Excluidos: hosting, dominio, grabación, campañas 90/10.';
