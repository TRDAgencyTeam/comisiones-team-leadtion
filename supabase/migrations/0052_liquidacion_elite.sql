-- Liquidación: pago de Elite Agent a Mauricio Ovalle. Se digita en USD y se
-- convierte a COP con la tasa de cálculo (en vivo); al cerrar se congela el COP.
alter table public.liquidacion add column if not exists elite_usd numeric;
alter table public.liquidacion add column if not exists elite_cop numeric;
comment on column public.liquidacion.elite_usd is 'Ingreso Elite Agent que se le paga a Mauricio Ovalle (USD).';
comment on column public.liquidacion.elite_cop is 'elite_usd × tasa de cálculo, congelado al cerrar la liquidación.';
