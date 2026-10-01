-- Liquidación mensual USA → Colombia: cuánto hay que bajar de TRD Investment (LLC)
-- a Ebenezer para cubrir lo pagado en pesos (nómina completa REG, operativos fijos,
-- cuota del crédito, gastos pagados con medios de Colombia) + adicional, y el giro
-- real (USD enviados, tasa del banco, COP recibidos). NO es un egreso: es mover
-- plata propia entre cuentas; no toca la utilidad.

-- Medios de pago: país (los de USA no se liquidan: esa plata no salió de Colombia).
alter table public.medio_pago add column if not exists pais text not null default 'CO';
alter table public.medio_pago drop constraint if exists medio_pago_pais_chk;
alter table public.medio_pago add constraint medio_pago_pais_chk check (pais in ('CO','US'));
update public.medio_pago set pais = 'US' where nombre ilike 'bank of america%';

create table if not exists public.liquidacion (
  id            serial primary key,
  mes           date not null unique,                    -- primer día del mes liquidado
  estado        text not null default 'borrador' check (estado in ('borrador','cerrada')),
  tasa_calculo  numeric,                                 -- tasa con que se calcula cuánto bajar
  ajustes       jsonb not null default '{}'::jsonb,      -- partidas incluidas/excluidas a mano {clave: bool}
  -- Giro real (al cerrar)
  fecha_giro    date,
  usd_enviado   numeric,
  tasa_banco    numeric,                                 -- la que da el banco en Colombia (definitiva)
  cop_recibido  numeric,                                 -- normalmente usd_enviado × tasa_banco
  comision_usd  numeric,                                 -- costo del giro, si lo hubo
  -- Totales congelados al cerrar (para el historial)
  cop_necesario numeric,                                 -- partidas a cubrir
  cop_adicional numeric,                                 -- plata extra (no es gasto)
  notas         text,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.liquidacion is 'Liquidación mensual USA→COL: partidas a cubrir en COP y giro real con tasa del banco.';

create table if not exists public.liquidacion_item (
  id              bigserial primary key,
  liquidacion_id  int not null references public.liquidacion(id) on delete cascade,
  origen          text not null check (origen in ('auto','manual','adicional')),
  clave           text,          -- origen auto: "reg:12" / "eg:345"
  grupo           text not null,
  concepto        text not null,
  cop             numeric not null default 0,
  orden           int not null default 100
);
create index if not exists liquidacion_item_liq_idx on public.liquidacion_item (liquidacion_id);
comment on table public.liquidacion_item is 'Líneas de la liquidación: manuales/adicionales siempre; las automáticas se congelan al cerrar.';
