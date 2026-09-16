-- Módulo Comercial (equipo interno): comisión del 10% por cliente NUEVO que trae
-- el comercial, calculada sobre la venta neta (facturado − comisión de pasarela).
-- MVP: un solo comercial (Mauro / Mauricio Ovalle, id=4). Extensible con es_comercial.

-- 1) Marca de quién es "comercial" (puede haber varios en el futuro).
alter table public.colaboradores add column if not exists es_comercial boolean not null default false;

-- El comercial actual es el registro "Mauro" (id=4). Si no existe, no pasa nada.
update public.colaboradores set es_comercial = true where id = 4;

-- 2) Comisiones comerciales: una por factura de alta de cliente nuevo.
create table if not exists public.comision_comercial (
  id             bigserial primary key,
  cliente_id     bigint references public.clientes(id) on delete set null,
  factura_id     bigint references public.factura_mensual(id) on delete set null,
  colaborador_id bigint not null references public.colaboradores(id) on delete cascade,
  mes            date not null,                 -- primer día del mes de la venta
  base_facturado numeric(12,2) not null default 0,
  pasarela       numeric(12,2) not null default 0,
  base_neta      numeric(12,2) not null default 0,
  pct            numeric(6,2)  not null default 10,
  monto_usd      numeric(12,2) not null default 0,
  estado         text not null default 'pendiente' check (estado in ('pendiente','pagado')),
  fecha_pago     date,
  tasa           numeric(12,4),
  nota           text,
  creado_en      timestamptz not null default now(),
  unique (factura_id)                            -- una comisión por alta
);
create index if not exists idx_comision_comercial_mes on public.comision_comercial (mes);
create index if not exists idx_comision_comercial_col on public.comision_comercial (colaborador_id);

comment on table public.comision_comercial is 'Comisión del equipo comercial: 10% de la venta neta por cliente NUEVO (una vez).';
