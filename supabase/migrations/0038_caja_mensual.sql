-- =============================================================================
-- Migración 0038 — Caja LLC mensual (espejo del cuadro del usuario).
-- Guarda, por mes: ingresos, egresos y las inversiones/gastos que salen de caja.
-- Utilidad = ingresos − egresos. Caja disponible = Σ utilidad − Σ inversiones.
-- (No incluye Elite Agent Club Skool; se llevará aparte.)
-- Meses sin fila aquí, la pestaña los calcula del sistema.
-- =============================================================================
create table if not exists public.caja_mensual (
  mes          date primary key,
  ingresos     numeric(14,2) not null default 0,
  egresos      numeric(14,2) not null default 0,
  inversiones  numeric(14,2) not null default 0,  -- salidas de caja del mes
  notas        text,
  actualizado_en timestamptz not null default now()
);
comment on table public.caja_mensual is 'Caja LLC: ingresos/egresos/utilidad e inversiones (salidas de caja) por mes.';

insert into public.caja_mensual (mes, ingresos, egresos, inversiones) values
 ('2026-01-01', 10894, 11250, 696),
 ('2026-02-01', 14855, 11070, 2022),
 ('2026-03-01', 15677, 13429, 946),
 ('2026-04-01', 18585, 14635, 4059),
 ('2026-05-01', 17186, 17251, 2468),
 ('2026-06-01', 21673, 18141, 3724),
 ('2026-07-01', 20607, 16008, 2685),
 ('2026-08-01', 23158, 18724, 3100)
on conflict (mes) do update set ingresos=excluded.ingresos, egresos=excluded.egresos, inversiones=excluded.inversiones, actualizado_en=now();
