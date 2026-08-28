-- =============================================================================
-- Migración 0024 — "Agencia" como etiqueta INDEPENDIENTE del servicio Leadtion
--
-- Antes, tipo_cliente (estandar/agencia/servicio) era excluyente: marcar agencia
-- borraba "servicio". Ahora la agencia es un flag aparte (es_agencia), así un
-- cliente puede ser AGENCIA y a la vez tener un servicio Leadtion (que se vence
-- solo por calendario). tipo_cliente se conserva para el historial.
-- =============================================================================

alter table public.clientes add column if not exists es_agencia boolean not null default false;
alter table public.clientes add column if not exists agencia_desde date;

-- Backfill: los que hoy son agencia quedan con el flag (no pierden nada).
update public.clientes set es_agencia = true where tipo_cliente = 'agencia' and es_agencia = false;

comment on column public.clientes.es_agencia is 'Cliente con plan de agencia (independiente del servicio Leadtion). Lo controlará también la plataforma madre.';
comment on column public.clientes.agencia_desde is 'Fecha en que el cliente pasó a ser de agencia.';
