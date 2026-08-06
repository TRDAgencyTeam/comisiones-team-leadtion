-- =============================================================================
-- Migración 0002 — Tablas de operación del motor de comisiones (Fase 2)
-- Plataforma de Comisiones CS (LEADTION)
--
-- El motor de reglas (engine/src/rules.ts) es puro y se valida contra la
-- Sección 6 sin persistencia. Para operar en producción necesita dos cosas
-- persistidas, que estas tablas cubren:
--   1) chs_evaluaciones  -> el CHS que el admin aprueba por (cliente, hito).
--   2) comision_hitos    -> liquidación: qué hito de qué cliente ya se pagó a
--                           qué colaborador, para no pagarlo dos veces.
-- =============================================================================

-- --- Evaluación de CHS por hito (aprobada por el admin) -----------------------
-- El CHS real aún es una encuesta manual; su metodología no está definida. Aquí
-- se guarda el puntaje editado por el admin y su decisión. El motor lo consulta
-- vía OpcionesCalculo.chs; mientras no exista fila, se trata como 'pendiente'.
create table if not exists public.chs_evaluaciones (
    id              bigint generated always as identity primary key,
    cliente_id      bigint not null references public.clientes(id) on delete cascade,
    hito            text not null check (hito in ('T1','T2','T3')),
    puntaje         numeric(5,2),                                  -- CHS editado por el admin (aún no auto-calculable)
    estado          text not null default 'pendiente'
                        check (estado in ('pendiente','aprobado','rechazado')),
    aprobado_por    bigint references public.colaboradores(id),    -- admin que aprobó
    aprobado_en     timestamptz,
    notas           text,
    unique (cliente_id, hito)
);

comment on table public.chs_evaluaciones is
    'CHS por (cliente, hito) aprobado por el admin. T1/T2 exigen > 70; T3 > 80. Sin fila = pendiente.';

-- --- Liquidación de hitos pagados ---------------------------------------------
-- Un hito se paga una sola vez por colaborador elegible (cada uno cobra el 100%
-- de forma independiente). Esta tabla registra la liquidación efectiva.
create table if not exists public.comision_hitos (
    id                bigint generated always as identity primary key,
    colaborador_id    bigint not null references public.colaboradores(id) on delete cascade,
    cliente_id        bigint not null references public.clientes(id) on delete cascade,
    hito              text not null check (hito in ('T1','T2','T3')),
    base              numeric(12,2) not null,                      -- 67 o 69 según activación
    tasa              numeric(5,4) not null,                       -- 0.05 / 0.05 / 0.10
    meses_base        integer not null,                            -- 3 / 3 / 12
    monto             numeric(12,2) not null,                      -- base * tasa * meses_base
    fecha_corte       date not null,                               -- corte con que se calculó
    liquidado_en      timestamptz not null default now(),
    unique (colaborador_id, cliente_id, hito)                      -- un hito, un pago por colaborador
);

comment on table public.comision_hitos is
    'Hitos ya liquidados por colaborador. El motor puede excluir estos vía hitosAConsiderar para evitar doble pago.';

create index if not exists idx_comision_hitos_colaborador on public.comision_hitos (colaborador_id, fecha_corte);
