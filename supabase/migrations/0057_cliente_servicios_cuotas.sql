-- Un servicio Leadtion (Agente IA / Level Up) puede pagarse en varias cuotas. Se
-- guarda cuántas cuotas son para que el calendario de cobros de Membresías refleje
-- el pago real por mes (cuota 1, cuota 2, … y luego soporte), igual que Facturación,
-- en vez de cargar el total al mes 1. 1 = pago único (comportamiento normal).
alter table public.cliente_servicios
  add column if not exists cuotas_n integer not null default 1;
