-- =============================================================================
-- Migración 0013 — Origen de los pagos mensuales
--
-- Para poder EDITAR/BORRAR servicios y que el historial se recalcule bien, hay
-- que distinguir los meses generados por un servicio de los meses "manuales"
-- (licencia, importados). Al recalcular se borran los de origen='servicio' y se
-- vuelven a generar; así, si un servicio cambia de mes, los meses que deja de
-- ocupar se limpian solos.
-- =============================================================================

alter table public.pagos_mensuales add column if not exists origen text;

-- Backfill: marca como 'servicio' los meses que hoy genera cada cliente_servicios
-- (mes 1 para todos; mes 2 y 3 solo para Agente IA y Reactivación; Level Up = mes 1).
update public.pagos_mensuales pm set origen = 'servicio'
  from public.cliente_servicios cs
 where pm.cliente_id = cs.cliente_id
   and pm.mes in (
     cs.mes_inicio,
     case when cs.tipo_servicio in ('agente_ai','reactivacion') then (cs.mes_inicio + interval '1 month')::date end,
     case when cs.tipo_servicio in ('agente_ai','reactivacion') then (cs.mes_inicio + interval '2 months')::date end
   );

comment on column public.pagos_mensuales.origen is 'servicio = generado por cliente_servicios (se recalcula); NULL = manual/licencia/importado.';
