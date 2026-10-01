-- Foto mensual del ingreso Leadtion automático (licencias estándar + soporte y API
-- WhatsApp vendida). Ese ingreso se calcula en vivo desde Membresías solo para el mes
-- en curso; al cerrar el mes se perdía (el Resumen de meses pasados lo mostraba en $0).
-- El Resumen guarda aquí el valor del mes en curso cada vez que se abre, y el cron
-- del día 1 lo deja guardado si nadie entró. Meses pasados leen de esta tabla.
create table if not exists public.leadtion_mes (
  mes          date primary key,              -- primer día del mes
  leadtion     numeric not null default 0,    -- membresías + soporte (USD)
  api_vendida  numeric not null default 0,    -- ganancia API WhatsApp vendida (USD)
  api_cuentas  int     not null default 0,
  actualizado  timestamptz not null default now()
);
comment on table public.leadtion_mes is
  'Foto mensual del ingreso Leadtion automático (licencias+soporte, API vendida) para que los meses cerrados lo conserven.';
