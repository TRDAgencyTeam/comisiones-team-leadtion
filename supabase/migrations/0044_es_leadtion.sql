-- 0044: Distingue qué clientes son realmente de Leadtion/Membresías.
-- Problema: la creación en cascada desde la madre marcaba como "agencia" (y metía
-- al maestro Leadtion) a TODO servicio de categoría 'agencia', incluidos los que
-- NO llevan Leadtion (social media, SEO, Canva, hosting…). Ej.: Norly Cabrera.

-- 1) Marca en el catálogo qué servicios SÍ implican cuenta Leadtion.
alter table public.servicio_catalogo add column if not exists incluye_leadtion boolean not null default false;
update public.servicio_catalogo set incluye_leadtion = true
 where categoria = 'leadtion' or clave = 'plan_ads_ia_crm';

-- 2) Marca en clientes quién es miembro Leadtion. Por defecto true (los creados en
--    el módulo Membresías lo son); se apaga solo para los que NO tienen ninguna
--    señal de membresía (ni plan, ni API, ni licencia, ni cobros, ni servicio Leadtion).
alter table public.clientes add column if not exists es_leadtion boolean not null default true;

update public.clientes c set es_leadtion = false
 where not (
   c.plan_tipo is not null
   or coalesce(c.api_estado,'ninguna') <> 'ninguna'
   or coalesce(c.valor_licencia_general,0) > 0
   or exists (select 1 from public.pagos_mensuales p where p.cliente_id = c.id)
   or exists (
     select 1 from public.factura_mensual f
     join public.servicio_catalogo s on s.clave = f.servicio_clave and s.incluye_leadtion
     where f.cliente_id = c.id
        or translate(lower(trim(f.cliente_nombre)),'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')
         = translate(lower(trim(c.nombre)),'áéíóúüñÁÉÍÓÚÜÑ','aeiouunAEIOUUN')
   )
 );
