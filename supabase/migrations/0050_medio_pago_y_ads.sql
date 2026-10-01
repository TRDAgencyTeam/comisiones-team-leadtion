-- 1) Medio de pago de los egresos (con qué cuenta/tarjeta se pagó) para poder
--    rastrearlo después. Catálogo editable + columna en egreso_mensual (se guarda
--    el nombre, así el histórico no cambia si un medio se renombra/desactiva).
create table if not exists public.medio_pago (
  id      serial primary key,
  nombre  text not null unique,
  activo  boolean not null default true,
  orden   int not null default 100
);
comment on table public.medio_pago is 'Medios con que se pagan los egresos (tarjetas/cuentas). Se eligen al agregar un egreso.';

insert into public.medio_pago (nombre, orden) values
  ('Bank of America', 10),
  ('TC Bancolombia · Mauricio', 20),
  ('TC Nu · Mauricio', 30),
  ('Ahorros Bancolombia · Ebenezer', 40),
  ('TC Bancolombia · María Vargas', 50)
on conflict (nombre) do nothing;

alter table public.egreso_mensual add column if not exists medio_pago text;
comment on column public.egreso_mensual.medio_pago is 'Con qué se pagó (nombre de medio_pago).';

-- 2) Meta Ads y Google Ads como servicios sueltos (clientes USA y Colombia). Precio
--    variable: se escribe en la moneda del cliente (USD o COP antes de IVA).
insert into public.servicio_catalogo
  (clave, nombre, categoria, recurrente, precio_variable, aplica_cs, aplica_referido, aplica_reserva, orden, activo, comisiona_comercial)
select v.clave, v.nombre, 'agencia', true, true, a.aplica_cs, a.aplica_referido, false, v.orden, true, a.comisiona_comercial
  from (values ('meta_ads', 'Meta Ads', 15), ('google_ads', 'Google Ads', 16)) as v(clave, nombre, orden)
  cross join (select aplica_cs, aplica_referido, comisiona_comercial from public.servicio_catalogo where clave = 'ads_pro_business') a
 where not exists (select 1 from public.servicio_catalogo s where s.clave = v.clave);
