-- =============================================================================
-- Migración 0020 — REG: componentes del pago (fijo + adicional + comisión)
--
-- La cuenta de cobro (valor_cuenta_cobro) pasa a ser el TOTAL, desglosado en:
--   pago_fijo + adicional (con descripción) + comision (CS, sincronizada, en COP).
-- Sobre el total se calculan ICA y renta. La comisión que se paga aquí registra
-- el pago en comision_hitos (se deja de pagar desde el módulo de comisiones).
-- =============================================================================

alter table public.reg_pago add column if not exists pago_fijo      numeric(14,2) not null default 0;
alter table public.reg_pago add column if not exists adicional      numeric(14,2) not null default 0;
alter table public.reg_pago add column if not exists adicional_desc text;
alter table public.reg_pago add column if not exists comision       numeric(14,2) not null default 0;

comment on column public.reg_pago.pago_fijo is 'Pago fijo del contrato (COP).';
comment on column public.reg_pago.adicional is 'Valor adicional del mes (bono, videos extra…) en COP.';
comment on column public.reg_pago.adicional_desc is 'Concepto del adicional (sale en el correo).';
comment on column public.reg_pago.comision is 'Comisión CS del mes convertida a COP (sincronizada; entra al total).';
