-- =============================================================================
-- Migración 0017 — REG: valor de nómina (base) por colaborador
--
-- El "valor base" que pre-llena la cuenta de cobro cada mes. Se aprende de lo
-- último pagado (o se fija en el perfil de nómina, fase 2). Tarifa de ICA ya no
-- se captura por persona: es única (8.66‰) — ver retenciones.ts.
-- =============================================================================

alter table public.colaboradores add column if not exists valor_nomina numeric(14,2);

comment on column public.colaboradores.valor_nomina is 'Valor base de nómina (COP); pre-llena la cuenta de cobro en REG.';
