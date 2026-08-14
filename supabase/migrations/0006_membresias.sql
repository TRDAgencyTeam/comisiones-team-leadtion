-- =============================================================================
-- Migración 0006 — Módulo Clientes / Membresías (campos maestros)
--
-- Extiende la tabla `clientes` (fuente madre) con lo que necesita el módulo de
-- membresías. Comisiones CS sigue leyendo de la misma tabla.
-- =============================================================================

-- Tercer plan de entrada: Level Up ($497).
alter table public.clientes drop constraint if exists clientes_plan_tipo_check;
alter table public.clientes
  add constraint clientes_plan_tipo_check
  check (plan_tipo is null or plan_tipo in ('agente_ai','reactivacion','level_up'));

-- API de WhatsApp: 'incluida' (costo $10) / 'vendida' ($12, ganancia $2) / 'ninguna'.
alter table public.clientes add column if not exists api_estado text
  check (api_estado is null or api_estado in ('ninguna','incluida','vendida'));
alter table public.clientes add column if not exists api_valor numeric(12,2);

-- Bono de billetera para reactivación ($50/$100, costo, una sola vez).
alter table public.clientes add column if not exists bono_reactivacion numeric(12,2);

-- Reserva (protección de precio): se crea ya, inicia al pagar el excedente.
alter table public.clientes add column if not exists reserva boolean not null default false;
alter table public.clientes add column if not exists fecha_inicio_real date;

comment on column public.clientes.api_estado is 'API WhatsApp: incluida ($10 costo) / vendida ($12, gana $2) / ninguna.';
comment on column public.clientes.bono_reactivacion is 'Bono de billetera de reactivación (costo): 50 o 100.';
comment on column public.clientes.reserva is 'Reserva de precio: cliente creado pero inicia al pagar el excedente.';
