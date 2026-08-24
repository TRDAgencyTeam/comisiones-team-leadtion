-- =============================================================================
-- Migración 0022 — Gastos Fijos (servicios públicos, otros, herramientas,
-- hosting, "paso de dinero") + Crédito (amortización).
--
-- La nómina ya vive en `colaboradores`. Aquí van los demás gastos fijos, con
-- doble moneda, recurrencia, % de reparto y amortización. El crédito Bancolombia
-- es un mini-módulo aparte.
-- =============================================================================

create table if not exists public.gasto_fijo (
  id                  bigserial primary key,
  categoria           text not null check (categoria in
                        ('servicio_publico','otro','herramienta','hosting','paso_dinero')),
  nombre              text not null,
  moneda              text not null default 'COP' check (moneda in ('COP','USD')),
  valor               numeric(14,2) not null default 0,
  recurrencia         text not null default 'mensual' check (recurrencia in ('mensual','anual','diario')),
  dia_cobro           integer,                 -- día del mes (herramientas)
  metodo_pago         text,                    -- BOA, Bancolombia, etc.
  porcentaje_reparto  numeric(5,2) not null default 100,   -- % que asume la empresa
  amortizar           boolean not null default false,       -- anual → se prorratea al mes
  afecta_utilidad     boolean not null default true,        -- paso de dinero = false
  activo              boolean not null default true,
  notas               text,
  creado_en           timestamptz not null default now()
);
create index if not exists idx_gasto_fijo_cat on public.gasto_fijo (categoria, activo);

comment on table public.gasto_fijo is 'Gastos fijos no-nómina: servicios públicos, otros, herramientas, hosting, paso de dinero.';

-- Crédito (amortización). Se siembra el crédito de Libre Inversión Bancolombia.
create table if not exists public.credito (
  id                bigserial primary key,
  nombre            text not null,
  monto_inicial     numeric(16,2) not null default 0,
  saldo             numeric(16,2) not null default 0,
  tasa_ea           numeric(6,3) not null default 0,     -- % efectivo anual
  cuota             numeric(14,2) not null default 0,
  plazo_meses       integer,
  fecha_desembolso  date,
  dia_pago          text,                                 -- "3 y 4 de cada mes"
  interes_corriente numeric(14,2) not null default 0,     -- interés de la última cuota
  activo            boolean not null default true,
  notas             text,
  actualizado_en    timestamptz not null default now()
);

insert into public.credito
  (nombre, monto_inicial, saldo, tasa_ea, cuota, plazo_meses, fecha_desembolso, dia_pago, interes_corriente)
select 'Libre Inversión Bancolombia', 110000000, 87615572, 19.42, 2930000, 60, '2025-01-29', '3 y 4 de cada mes', 647384
where not exists (select 1 from public.credito);
