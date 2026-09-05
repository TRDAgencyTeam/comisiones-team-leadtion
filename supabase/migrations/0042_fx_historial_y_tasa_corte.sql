-- 0042: Tasa USD→COP con historial y tasa pactada por corte (módulo REG).
--
-- Problema: las comisiones nacen en USD y REG las convierte a COP con la tasa del
-- día. Si se pacta pagar con la tasa de OTRO día (ej. la de ayer), hay que poder
-- fijar esa tasa antes de marcar Pagado para que el COP quede exacto.

-- Historial diario de la tasa (para verlo en vivo y ver la fluctuación).
create table if not exists public.fx_diario (
  fecha date primary key,
  cop numeric(12,4) not null,
  fuente text,
  creado_en timestamptz not null default now()
);

-- Tasa "de trabajo" por mes de REG: si hay fila, es la que se usa para convertir
-- las comisiones NO pagadas y para congelar el COP al marcar Pagado. Si no hay
-- fila, se usa la tasa en vivo del día.
create table if not exists public.reg_tasa_mes (
  mes date primary key,
  cop numeric(12,4) not null,
  actualizado_en timestamptz not null default now()
);

-- Tasa con la que quedó congelada la comisión de cada pago (auditoría).
alter table public.reg_pago add column if not exists tasa_comision numeric(12,4);

-- Seed del historial con valores reales recientes (fawaz currency-api).
insert into public.fx_diario (fecha, cop, fuente) values
  ('2026-09-01', 3222.6563, 'seed'),
  ('2026-09-02', 3166.1390, 'seed'),
  ('2026-09-03', 3161.4980, 'seed'),
  ('2026-09-04', 3146.4108, 'seed')
on conflict (fecha) do nothing;
