-- =============================================================================
-- Migración 0008 — Configuración financiera para el P&L de Membresías
-- Nómina (COP) + GoHighLevel + reselling mensual. Editables.
-- =============================================================================

create table if not exists public.config_negocio (
  clave  text primary key,
  valor  numeric not null,
  nota   text
);

-- Valores iniciales (COP para nómina; USD para GHL). Editables desde la app.
insert into public.config_negocio (clave, valor, nota) values
  ('nomina_andres_cop', 4900000, 'Sueldo Andrés (COP)'),
  ('nomina_andres_pct', 60, '% dedicación a Leadtion'),
  ('nomina_daniel_cop', 4500000, 'Sueldo Daniel (COP)'),
  ('nomina_daniel_pct', 100, '% dedicación a Leadtion'),
  ('nomina_alejandro_cop', 3300000, 'Sueldo Alejandro (COP)'),
  ('nomina_alejandro_pct', 100, '% dedicación a Leadtion'),
  ('ghl_mensual_usd', 497, 'GoHighLevel mensual (USD)')
on conflict (clave) do nothing;

-- Reselling reportado por mes (ganancia variable del uso de funcionalidades).
create table if not exists public.reselling_mensual (
  mes    text primary key,   -- 'YYYY-MM'
  monto  numeric not null default 0
);

comment on table public.config_negocio is 'Parámetros financieros editables (nómina, GHL).';
comment on table public.reselling_mensual is 'Ganancia de reselling reportada por mes.';
