-- =============================================================================
-- Migración 0012 — Precio personalizado del mes 1 de un servicio
--
-- Un cliente puede adquirir varios servicios a la vez (Agente IA + Reactivación,
-- etc.) y el precio de entrada (mes 1) puede negociarse (descuento). Guardamos
-- el precio del mes 1 por servicio; si es NULL se usa el estándar del plan.
-- =============================================================================

alter table public.cliente_servicios add column if not exists precio_mes1 numeric;

comment on column public.cliente_servicios.precio_mes1 is 'Precio del mes 1 del servicio (override del estándar). NULL = estándar del plan.';
