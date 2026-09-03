-- =============================================================================
-- Migración 0037 — Salidas de caja históricas (columna "Inversiones y gastos con
-- la utilidad de TRD + Leadtion" del cuadro Caja LLC). Se consumen de la CAJA
-- (utilidad acumulada), no de la utilidad del mes.
--
-- Reemplaza los egresos "sale de caja" de ene–ago por el total curado del mes
-- (neto del diezmo, que el sistema calcula automático aparte). Así:
--   salidas del mes = "inversiones y gastos de caja" + diezmo automático.
-- Totales del usuario: ene 696, feb 2022, mar 946, abr 4059, may 2468,
--                      jun 3724, jul 2685, ago 3100  → total $19.699.
-- =============================================================================
delete from public.egreso_mensual
 where afecta_utilidad = false and mes between '2026-01-01' and '2026-08-01';

insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria) values
 ('2026-01-01','Inversiones y gastos de caja','TRD', 696.00,  false,'caja'),
 ('2026-02-01','Inversiones y gastos de caja','TRD', 1679.10, false,'caja'),
 ('2026-03-01','Inversiones y gastos de caja','TRD', 766.60,  false,'caja'),
 ('2026-04-01','Inversiones y gastos de caja','TRD', 3682.90, false,'caja'),
 ('2026-05-01','Inversiones y gastos de caja','TRD', 2468.00, false,'caja'),
 ('2026-06-01','Inversiones y gastos de caja','TRD', 3392.70, false,'caja'),
 ('2026-07-01','Inversiones y gastos de caja','TRD', 2243.00, false,'caja'),
 ('2026-08-01','Inversiones y gastos de caja','TRD', 2621.70, false,'caja');
