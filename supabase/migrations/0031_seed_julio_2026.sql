-- =============================================================================
-- Migración 0031 — Semilla JULIO 2026 (del Excel del usuario). Re-ejecutable.
-- Tasa del mes: 3219. Cuadra con el resumen: ingresos $20.427 · gastos $16.008 ·
-- utilidad neta $3.977 (19,5%). COL de julio va como agregado (detalle pendiente).
-- =============================================================================

delete from public.factura_mensual where mes = '2026-07-01';
delete from public.egreso_mensual  where mes = '2026-07-01';
delete from public.ingreso_mensual where mes = '2026-07-01';

-- Facturas LLC ---------------------------------------------------------------
insert into public.factura_mensual
  (mes, entidad, cliente_nombre, servicios, precio_desglose, facturado, medio, iva_pct, estado,
   recurrente, reserva, mes_contrato, servicio_clave, fecha_factura, fecha_pago)
values
  ('2026-07-01','LLC','Katherine Osorio','Meta Ads','$797 (mes 3)',797,'stripe',0,'pagado',true,false,3,'plan_ads_ia_crm','2026-07-20','2026-07-23'),
  ('2026-07-01','LLC','14 ROC (Cervera)','Meta Ads','$500 (mes 2)',500,'stripe',0,'pagado',true,false,2,'plan_ads_ia_crm','2026-07-20','2026-07-27'),
  ('2026-07-01','LLC','Mauricio Total Health','Ads Pro Business + SEO Web','$520 + $196',716,'stripe',0,'pagado',true,false,2,'ads_pro_business','2026-07-15','2026-07-22'),
  ('2026-07-01','LLC','Jhon Roa','Meta Ads + Social Media Advance','$597 + $397 (mes 5)',994,'stripe',0,'pagado',true,false,5,'plan_ads_ia_crm','2026-07-22','2026-08-13'),
  ('2026-07-01','LLC','Érica Maxwell','Meta Ads + Social Media Advance','$597 + $415 (mes 5)',1012,'stripe',0,'pagado',true,false,5,'plan_ads_ia_crm','2026-07-13','2026-07-29'),
  ('2026-07-01','LLC','Andrea Hidalgo','Meta Ads + LEADTION Text AI','$597 (mes 5)',597,'stripe',0,'pagado',true,false,5,'plan_ads_ia_crm','2026-07-25','2026-07-28'),
  ('2026-07-01','LLC','Elite Agent Club','Social Media Advance','$497',497,'zelle',0,'pagado',true,false,1,'social_media_advance',null,null),
  ('2026-07-01','LLC','María José Río','Meta Ads + Social Media Advance','$776 (penalización cancelación)',776,'stripe',0,'pagado',false,false,null,'plan_ads_ia_crm','2026-07-27',null),
  ('2026-07-01','LLC','Johana Gómez (Lady Gomez)','Meta Ads + LEADTION Text AI','$677 (mes 5)',677,'stripe',0,'pagado',true,false,5,'plan_ads_ia_crm','2026-07-22','2026-07-27'),
  ('2026-07-01','LLC','Yosmar Cutcher','Meta Ads + LEADTION Text AI','$647 (mes 3)',647,'stripe',0,'pagado',true,false,3,'plan_ads_ia_crm','2026-07-22','2026-07-27'),
  ('2026-07-01','LLC','Irma Díaz','Meta Ads + LEADTION Text AI','$747 (mes 3)',747,'stripe',0,'pagado',true,false,3,'plan_ads_ia_crm','2026-07-29','2026-08-03'),
  ('2026-07-01','LLC','Sandra Guerra PA','Meta Ads','$797 (mes 3)',797,'stripe',0,'pagado',true,false,3,'plan_ads_ia_crm','2026-07-22','2026-07-27'),
  ('2026-07-01','LLC','Martha Laverde','Meta Ads','$400 (mes 2) — cancelado',0,'stripe',0,'anulado',false,false,null,'plan_ads_ia_crm','2026-07-23',null),
  ('2026-07-01','LLC','Wilmar Sosa LLC','Licencia Canva + LEADTION CRM + Meta Ads','$10 + $67 + Camp 90/10 (100×3)',377,'zelle',0,'pagado',true,false,1,'plan_ads_ia_crm','2026-07-22','2026-08-10');

-- Servicios Leadtion / reservas / referidos (LLC) ----------------------------
insert into public.factura_mensual
  (mes, entidad, cliente_nombre, servicios, precio_desglose, facturado, medio, iva_pct, estado,
   recurrente, reserva, servicio_clave, fecha_factura, fecha_pago)
values
  ('2026-07-01','LLC','Katherine Vargas','LEADTION Text AI','$844 (pendiente $500 mes 2)',844,'stripe',0,'pagado',false,true,'agente_ai','2026-07-31','2026-08-03'),
  ('2026-07-01','LLC','Maylet Vazquez','LEADTION Reactivación Base + Text AI','$600 + $600',1200,'zelle',0,'pagado',false,true,'reactivacion','2026-07-30','2026-07-30'),
  ('2026-07-01','LLC','Verónica Valencia','LEADTION Reactivación Base','$497',497,'stripe',0,'pagado',false,false,'reactivacion','2026-07-08','2026-07-08'),
  ('2026-07-01','LLC','Arturo Otero','LEADTION Text AI + Meta Ads','$1.400',1400,'stripe',0,'pagado',false,false,'agente_ai','2026-07-01','2026-07-01'),
  ('2026-07-01','LLC','María Quintanilla','LEADTION Text AI + Reactivación Base','$597 + $847',1444,'stripe',0,'pagado',false,false,'reactivacion','2026-07-07','2026-07-07'),
  ('2026-07-01','LLC','Kenia Jarquín','Social Media Advance','$497',497,'stripe',0,'pagado',true,false,'social_media_advance','2026-07-15','2026-07-15'),
  ('2026-07-01','LLC','Norly Cabrera','Social Media Advance + Grabación de contenido','$497 + $300',797,'stripe',0,'pagado',false,false,'social_media_advance','2026-07-17','2026-07-17');

-- COL (agregado julio — detalle pendiente) -----------------------------------
insert into public.factura_mensual
  (mes, entidad, cliente_nombre, servicios, precio_desglose, facturado, medio, iva_pct, estado,
   recurrente, reserva, tasa)
values
  ('2026-07-01','COL','Clientes Colombia (agregado julio)','Meta Ads (detalle pendiente)','$1.012 neto',3257628,'bancolombia',0,'facturado',false,false,3219);

-- Otros ingresos del mes -----------------------------------------------------
insert into public.ingreso_mensual (mes, concepto, valor_usd, categoria) values
  ('2026-07-01','Leadtion (47) + Afiliado',3370.47,'leadtion'),
  ('2026-07-01','Reselling Leadtion',293,'reselling'),
  ('2026-07-01','Hosting Renovación',198,'hosting'),
  ('2026-07-01','Reservas Reactivación P2P (Jose Fuenmayor)',100,'reserva'),
  ('2026-07-01','WhatsApp API $12 (14 ventas, ganancia $2)',36,'whatsapp_api'),
  ('2026-07-01','Ingresos x Afiliación Brevo',7.25,'afiliacion');

-- Egresos que AFECTAN la utilidad --------------------------------------------
insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria) values
  ('2026-07-01','Gastos Fijos','Ebenezer',14500,true,'fijo'),
  ('2026-07-01','Gastos Variables del mes','TRD',733,true,'variable'),
  ('2026-07-01','WhatsApp API','Leadtion',440,true,'api'),
  ('2026-07-01','Referidos Leadtion (Ivelisse, Caro, Francisco, Oriana)','Leadtion',134.30,true,'referido'),
  ('2026-07-01','Bono reactivación clientes Leadtion (3)','Leadtion',150,true,'bono'),
  ('2026-07-01','Comisión retiro banco a Colombia','Ebenezer',50,true,'comision_banco');

-- Egresos que SALEN DE CAJA (el diezmo es automático) ------------------------
insert into public.egreso_mensual (mes, concepto, marca, fecha, valor_usd, valor_cop, afecta_utilidad, categoria) values
  ('2026-07-01','Grabación Marca Personal 3/3','TRD','2026-07-13',1491.15,4800000,false,'publicidad'),
  ('2026-07-01','Gasto publicitario LEADTION','TRD',null,601,1934619,false,'publicidad'),
  ('2026-07-01','Gastos a cuotas TC (Mao jun–jul)','TRD',null,602.39,1939099,false,'otro'),
  ('2026-07-01','Ren. Hosting Bio Spa y Kur Hotel','TRD','2026-07-16',440.56,1418170,false,'herramienta'),
  ('2026-07-01','Pago Honorarios Yulieth','TRD',null,124.26,400000,false,'honorario'),
  ('2026-07-01','Compra PC María (9/9)','TRD',null,92.50,297766,false,'otro'),
  ('2026-07-01','Costos transferencias','TRD',null,14.03,45160,false,'otro'),
  ('2026-07-01','Impuesto 4×1000 del mes','TRD',null,97.45,313698,false,'otro'),
  ('2026-07-01','Gastos de representación','TRD',null,76.05,244830,false,'otro');
