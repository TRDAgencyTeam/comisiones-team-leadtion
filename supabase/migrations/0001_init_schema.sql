-- =============================================================================
-- Migración 0001 — Esquema base (Fase 1) para Supabase / PostgreSQL
-- Plataforma de Comisiones CS (LEADTION)
--
-- Traducción fiel del schema SQLite de la Fase 1 a Postgres estándar:
--   · AUTOINCREMENT  -> GENERATED ALWAYS AS IDENTITY
--   · INTEGER 0/1 (booleanos)  -> BOOLEAN
--   · CHECK / UNIQUE / FK  -> idénticos
--   · DATE  -> DATE
-- Idempotente por tabla (IF NOT EXISTS). Ejecutar en el SQL Editor de Supabase
-- o vía `supabase db push` (ver README).
-- =============================================================================

-- --- Clientes -----------------------------------------------------------------
create table if not exists public.clientes (
    id                          bigint generated always as identity primary key,
    nombre                      text not null,
    plan                        text,                              -- plan tal como aparece en la fuente original
    fecha_activacion            date,                              -- puede ser NULL si la fuente no la registró
    estado_actual               text not null
                                    check (estado_actual in ('activo','cancelado')),
    fecha_cancelacion           date,                              -- NULL si sigue activo
    valor_licencia_general      numeric(12,2),                     -- columna "General" (referencia, NO base de comisión)
    incluye_crm_en_marketing    boolean not null default false,    -- histórico celeste (CRM incluido en plan de marketing)
    servicios_adicionales       text,                              -- tags: REACTIVACION, AGENTE_IA, SOPORTE, ...
    adquirio_level_up           text,                              -- valor original "¿Adquirió Plan Level Up?"
    ltv_acumulado               numeric(12,2),                     -- suma de pagos mensuales registrados
    notas                       text,                              -- observaciones de migración
    creado_por_rol              text not null default 'admin'
                                    check (creado_por_rol in ('admin','comercial')),
    fuente_fila_original        integer                            -- fila del Excel origen (trazabilidad)
);

-- --- Colaboradores ------------------------------------------------------------
create table if not exists public.colaboradores (
    id                          bigint generated always as identity primary key,
    nombre                      text not null,
    rol                         text not null
                                    check (rol in ('admin','cs','comercial')),
    categoria                   text
                                    check (categoria in ('fundador','nuevo')),   -- NULL para admin/comercial
    fecha_ingreso               date,                              -- define la ventana de elegibilidad
    fecha_fin_prueba            date,                              -- fecha_ingreso + 3 meses (NULL para fundadores)
    activo                      boolean not null default true
);

-- --- Pagos mensuales ----------------------------------------------------------
create table if not exists public.pagos_mensuales (
    id                          bigint generated always as identity primary key,
    cliente_id                  bigint not null references public.clientes(id) on delete cascade,
    mes                         date not null,                     -- primer día del mes calendario
    valor                       numeric(12,2),                     -- valor registrado ese mes (puede incluir servicios)
    estado_mes                  text not null
                                    check (estado_mes in (
                                        'activo',                  -- verde
                                        'cancelado',               -- rojo
                                        'incluido_en_marketing',   -- celeste (CRM incluido, sin cobro aparte)
                                        'en_riesgo_o_mora',        -- naranja (ambiguo, revisar con negocio)
                                        'previo_a_activacion',     -- gris (mes anterior al inicio)
                                        'sin_datos'                -- blanco / sin relleno
                                    )),
    unique (cliente_id, mes)
);

-- --- Índices de apoyo al motor de comisiones ----------------------------------
create index if not exists idx_clientes_fecha_activacion on public.clientes (fecha_activacion);
create index if not exists idx_pagos_cliente_mes         on public.pagos_mensuales (cliente_id, mes);

-- --- Comentarios de tabla (documentación viva) --------------------------------
comment on table public.clientes        is 'Clientes reales de CS. Excluye cuentas internas (TRD Agency, Elite Agent).';
comment on table public.colaboradores   is 'Equipo CS + admin. La categoría (fundador/nuevo) define la ventana de comisión.';
comment on table public.pagos_mensuales is 'Histórico mensual por cliente. El color del Excel origen mapea a estado_mes.';
