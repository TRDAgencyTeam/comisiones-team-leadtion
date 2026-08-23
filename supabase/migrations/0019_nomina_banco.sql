-- =============================================================================
-- Migración 0019 — Nómina: banco del colaborador (para costo de transferencia)
--
-- Según el banco se calcula el costo de transferencia + IVA (métrica contable en
-- REG, NO se le descuenta al colaborador). Bancolombia y Nequi = sin costo.
-- =============================================================================

alter table public.colaboradores add column if not exists banco text;

comment on column public.colaboradores.banco is 'Banco del colaborador (para calcular costo de transferencia + IVA en REG).';
