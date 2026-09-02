-- =============================================================================
-- Migración 0026 — Facturación recurrente (automática)
--
-- Marca las facturas de plan de marketing (agencia) como recurrentes: cada mes se
-- generan solas (lazy al abrir el mes + cron el 1º). Los servicios de una vez y lo
-- de Leadtion (reactivación, membresías) NO son recurrentes aquí: se jalan de Leadtion.
-- =============================================================================

alter table public.factura_mensual add column if not exists recurrente boolean not null default false;

-- Backfill: las facturas de clientes de agencia (plan de marketing) quedan recurrentes.
update public.factura_mensual f set recurrente = true
  from public.clientes c
 where f.cliente_id = c.id and c.es_agencia = true and f.recurrente = false;

comment on column public.factura_mensual.recurrente is 'true = plan de marketing recurrente (se autogenera cada mes).';
