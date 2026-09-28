-- Cobertura por unidad de negocio: repartir nómina y herramientas entre Agencia y Leadtion.

-- % de la nómina de cada persona que corresponde a LEADTION (el resto va a Agencia).
alter table public.colaboradores add column if not exists dedicacion_leadtion numeric not null default 0;
comment on column public.colaboradores.dedicacion_leadtion is
  '% de la nómina que corresponde a Leadtion (0-100). El resto es Agencia.';
-- Semillas (del mockup aprobado): Alejandro 100% Leadtion, Andrés 60% Leadtion.
update public.colaboradores set dedicacion_leadtion = 100 where lower(nombre) like 'alejandro%';
update public.colaboradores set dedicacion_leadtion = 60 where lower(nombre) like 'andr%rodr%';

-- A qué negocio pertenece cada herramienta / gasto fijo.
alter table public.gasto_fijo add column if not exists negocio text not null default 'agencia'
  check (negocio in ('agencia','leadtion'));
comment on column public.gasto_fijo.negocio is 'Negocio al que pertenece el gasto: agencia | leadtion.';
update public.gasto_fijo set negocio = 'leadtion' where lower(nombre) like '%ghl%' or lower(nombre) like '%gohigh%';
