-- 0041: Cuadre EXACTO con el cuadro oficial de Mauro (línea "TRD Agency & Leadtion").
-- Elite Agent Club Skool es un módulo aparte y NO entra aquí.
--
-- 1) caja_mensual = cuadro nuevo: ingresos, egresos (los que afectan utilidad) e
--    inversiones = "inversiones y gastos con la utilidad" (INCLUYE el diezmo).
--    Caja disponible = Σ (ingresos − egresos) − Σ inversiones = 20.878 − 19.699 = 1.179.
--
-- 2) Líneas "Ajuste de cuadre (cuadro oficial)" en ingreso/egreso para que el
--    Resumen COMPUTADO (KPIs + tendencia) dé exactamente los ingresos/egresos del
--    cuadro. Cierran la diferencia de transcripción de 1-2 clientes por mes.
--    Son editables/eliminables desde la UI (Facturación / Egresos).

begin;

insert into public.caja_mensual (mes, ingresos, egresos, inversiones) values
  ('2026-01-01', 10894, 11250,  696),
  ('2026-02-01', 14705, 11070, 2022),
  ('2026-03-01', 15467, 13429,  946),
  ('2026-04-01', 18395, 14635, 4059),
  ('2026-05-01', 16957, 17251, 2468),
  ('2026-06-01', 21454, 18141, 3724),
  ('2026-07-01', 20457, 16008, 2685),
  ('2026-08-01', 23163, 18830, 3100)
on conflict (mes) do update
  set ingresos = excluded.ingresos, egresos = excluded.egresos,
      inversiones = excluded.inversiones, actualizado_en = now();

-- Reconciliación idempotente: borra y recrea las líneas de cuadre.
delete from public.ingreso_mensual where concepto = 'Ajuste de cuadre (cuadro oficial)';
delete from public.egreso_mensual  where concepto = 'Ajuste de cuadre (cuadro oficial)';

-- Ingresos: cuadro − sistema computado (solo donde la diferencia es >= $1).
insert into public.ingreso_mensual (mes, concepto, fecha, valor_usd, categoria) values
  ('2026-01-01','Ajuste de cuadre (cuadro oficial)','2026-01-31',  92.32,'ajuste'),
  ('2026-02-01','Ajuste de cuadre (cuadro oficial)','2026-02-28', 206.48,'ajuste'),
  ('2026-03-01','Ajuste de cuadre (cuadro oficial)','2026-03-31', 242.63,'ajuste'),
  ('2026-05-01','Ajuste de cuadre (cuadro oficial)','2026-05-31',-102.71,'ajuste'),
  ('2026-07-01','Ajuste de cuadre (cuadro oficial)','2026-07-31',  29.98,'ajuste'),
  ('2026-08-01','Ajuste de cuadre (cuadro oficial)','2026-08-31',  20.94,'ajuste');

-- Egresos (afectan utilidad): cuadro − sistema computado (todos los meses, al centavo).
insert into public.egreso_mensual (mes, concepto, marca, fecha, valor_usd, afecta_utilidad, categoria) values
  ('2026-01-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-01-31', -19.80, true,'ajuste'),
  ('2026-02-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-02-28',   0.30, true,'ajuste'),
  ('2026-03-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-03-31',  -0.60, true,'ajuste'),
  ('2026-04-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-04-30',   0.60, true,'ajuste'),
  ('2026-05-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-05-31',  -0.04, true,'ajuste'),
  ('2026-06-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-06-30',  -0.10, true,'ajuste'),
  ('2026-07-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-07-31',   0.70, true,'ajuste'),
  ('2026-08-01','Ajuste de cuadre (cuadro oficial)','TRD','2026-08-31', 471.30, true,'ajuste');

commit;
