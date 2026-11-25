-- Valor numérico del contrato (suma de las líneas de pago) + divisa, para poder
-- sumar/reportar el valor contratado.
alter table public.contrato
  add column if not exists total_monto numeric default 0,
  add column if not exists moneda text default 'USD';
