-- =============================================================================
-- Migración 0039 — Costo de tercerización por unidad (grabación).
-- La grabación se vende ~$133,33/hora (3h ≈ $400) y su costo con el aliado es
-- $100/hora. Al vender grabación, se genera automático el egreso = costo × horas.
-- =============================================================================
alter table public.servicio_catalogo add column if not exists costo_persona numeric(12,2);
comment on column public.servicio_catalogo.costo_persona is 'Costo por unidad (persona/hora) que la empresa terceriza; genera egreso automático.';

update public.servicio_catalogo set costo_persona = 100 where clave = 'grabacion_contenido';
