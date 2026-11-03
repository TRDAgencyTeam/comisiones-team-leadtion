-- Herramientas que cobran POR PERSONA/puesto (ej. Gather, ClickUp): el `valor` es por
-- persona y el costo mensual = valor × nº de personas activas en nómina fija
-- (valor_nomina > 0; excluye freelances/del-momento). false = monto fijo normal.
alter table public.gasto_fijo
  add column if not exists por_persona boolean not null default false;
