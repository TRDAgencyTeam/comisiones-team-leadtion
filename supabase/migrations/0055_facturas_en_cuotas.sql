-- 0055 — Planes "en cuotas" como grupo propio en Facturación.
-- Una venta única pagada en N meses NO es ingreso recurrente (base fija) ni un
-- servicio del momento: se agrupa aparte. Se marca con factura_mensual.en_cuotas.
alter table public.factura_mensual add column if not exists en_cuotas boolean not null default false;

-- Los planes finitos pasan a NO recurrentes (usan materialización de cuotas, no
-- el clonado mensual): Reactivación GHL y las variantes "(2 cuotas)".
update public.servicio_catalogo set recurrente = false
 where clave in ('reactivacion_ghl', 'agente_ai_ghl_2c', 'level_up_ghl_2c');

-- Nota: las facturas existentes de estos planes (ej. Ana Brancamonte) se
-- convirtieron a cuotas materializadas (recurrente=false, en_cuotas=true) por
-- script en producción el 2026-10-07.
