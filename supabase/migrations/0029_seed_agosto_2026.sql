-- =============================================================================
-- Migración 0029 — Semilla AGOSTO 2026 (línea base real, del Excel del usuario).
-- Re-ejecutable: borra agosto antes de insertar. Tasa del mes: 3225.20.
-- Cuadra con el resumen: ingresos $23.142 · gastos $18.359 · util. neta $4.305 (18,6%).
-- =============================================================================

delete from public.factura_mensual where mes = '2026-08-01';
delete from public.egreso_mensual  where mes = '2026-08-01';
delete from public.ingreso_mensual where mes = '2026-08-01';

-- Facturas LLC (agencia = recurrente) ----------------------------------------
insert into public.factura_mensual
  (mes, entidad, cliente_nombre, servicios, precio_desglose, facturado, medio, iva_pct, estado,
   recurrente, reserva, mes_contrato, servicio_clave, fecha_factura, fecha_pago)
values
  ('2026-08-01','LLC','Mauricio Total Health','Ads Pro Business + SEO Web','$520 + $196',716,'stripe',0,'pagado',true,false,3,'ads_pro_business','2026-08-14','2026-08-17'),
  ('2026-08-01','LLC','Jhon Roa','Meta Ads + Social Media Advance','$597 + $397 (mes 6)',994,'stripe',0,'facturado',true,false,6,'plan_ads_ia_crm','2026-08-21',null),
  ('2026-08-01','LLC','Verónica Valencia','Meta Ads + LEADTION Text AI','$1200 (mes 1)',1200,'stripe',0,'pagado',true,false,1,'plan_ads_ia_crm','2026-08-26','2026-08-26'),
  ('2026-08-01','LLC','Andrea Hidalgo','Meta Ads + LEADTION Text AI','$597 (mes 6)',597,'stripe',0,'pagado',true,false,6,'plan_ads_ia_crm','2026-08-24','2026-08-30'),
  ('2026-08-01','LLC','Elite Agent Club','Social Media Advance','$497',497,'zelle',0,'pagado',true,false,1,'social_media_advance',null,null),
  ('2026-08-01','LLC','Johana Gómez (Lady Gomez)','Meta Ads + LEADTION Text AI','$897 (mes 6)',897,'stripe',0,'pagado',true,false,6,'plan_ads_ia_crm','2026-08-21','2026-08-22'),
  ('2026-08-01','LLC','Yosmar Cutcher','Meta Ads + LEADTION Text AI','$647 (mes 4)',647,'stripe',0,'pagado',true,false,4,'plan_ads_ia_crm','2026-08-21','2026-08-22'),
  ('2026-08-01','LLC','Irma Díaz','Meta Ads + LEADTION Text AI','$747 (mes 4)',747,'stripe',0,'pagado',true,false,4,'plan_ads_ia_crm','2026-08-28','2026-08-31'),
  ('2026-08-01','LLC','Sandra Guerra PA','Meta Ads','$797 (mes 4)',797,'stripe',0,'pagado',true,false,4,'plan_ads_ia_crm','2026-08-21','2026-08-23'),
  ('2026-08-01','LLC','Kenia Jarquín','Social Media Advance','$497',497,'stripe',0,'pagado',true,false,1,'social_media_advance','2026-08-14','2026-08-24'),
  ('2026-08-01','LLC','María José Río','Advance + Meta Ads + Grabación','(mes 1)',1694,'stripe',0,'pagado',true,false,1,'plan_ads_ia_crm','2026-08-11','2026-08-12'),
  ('2026-08-01','LLC','Arturo Otero','Meta Ads + LEADTION Text AI','$797 (mes 2)',797,'stripe',0,'pagado',true,false,2,'plan_ads_ia_crm','2026-08-04','2026-08-07'),
  ('2026-08-01','LLC','Wilmar Sosa LLC','Licencia Canva + LEADTION CRM + Meta Ads','$10 + $67 + Camp 90/10 + Evento Bogotá',5477,'zelle',0,'pagado',true,false,1,'plan_ads_ia_crm','2026-08-28','2026-09-01');

-- Servicios Leadtion (LLC, no recurrentes; reservas marcadas) -----------------
insert into public.factura_mensual
  (mes, entidad, cliente_nombre, servicios, precio_desglose, facturado, medio, iva_pct, estado,
   recurrente, reserva, servicio_clave, fecha_factura, fecha_pago)
values
  ('2026-08-01','LLC','Katherine Vargas','LEADTION Text AI','$500',500,'stripe',0,'pagado',false,false,'agente_ai','2026-08-30','2026-08-30'),
  ('2026-08-01','LLC','Melia Cristina','LEADTION Text AI','$847',847,'stripe',0,'pagado',false,false,'agente_ai','2026-08-05','2026-08-07'),
  ('2026-08-01','LLC','Jose Fuenmayor','LEADTION Reactivación Base','$497',497,'stripe',0,'pagado',false,true,'reactivacion','2026-08-11','2026-08-11'),
  ('2026-08-01','LLC','Claudia Guzmán','LEADTION Reactivación Base','$497',497,'stripe',0,'pagado',false,true,'reactivacion','2026-08-17','2026-08-17'),
  ('2026-08-01','LLC','Mayra González','LEADTION Plan Level Up','$497',497,'stripe',0,'pagado',false,true,'level_up','2026-08-11','2026-08-13');

-- Facturas COL (Ebenezer, COP + IVA, tasa del mes 3225.20) --------------------
insert into public.factura_mensual
  (mes, entidad, cliente_nombre, servicios, precio_desglose, facturado, medio, iva_pct, estado,
   recurrente, reserva, servicio_clave, tasa, fecha_factura, fecha_pago)
values
  ('2026-08-01','COL','Lord And Lady','Meta Ads + Google Ads','$345.000 + $590.000',935000,'bancolombia',19,'facturado',true,false,'plan_ads_ia_crm',3225.20,'2026-08-20',null),
  ('2026-08-01','COL','Lord By David','Meta Ads','$690.000',690000,'bancolombia',19,'facturado',true,false,'ads_pro_business',3225.20,'2026-08-20',null),
  ('2026-08-01','COL','Bio Salud','Mantenimiento web Trimestral Esencial','$614.000',614000,'bancolombia',0,'pagado',false,false,'mantenimiento_web',3225.20,'2026-08-10','2026-09-01');

-- Otros ingresos del mes -----------------------------------------------------
insert into public.ingreso_mensual (mes, concepto, valor_usd, categoria) values
  ('2026-08-01','Leadtion (43) + Afiliado',3736.57,'leadtion'),
  ('2026-08-01','Reselling Leadtion',400,'reselling'),
  ('2026-08-01','Mantenimientos Webs (Agente postal + Multicultural)',150,'mantenimiento'),
  ('2026-08-01','Reservas Reactivación P2P (Belkis)',100,'reserva'),
  ('2026-08-01','WhatsApp API $12 (13 ventas, ganancia $2)',24,'whatsapp_api'),
  ('2026-08-01','Ingresos x Afiliación Brevo',7.25,'afiliacion');

-- Egresos que AFECTAN la utilidad --------------------------------------------
insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria) values
  ('2026-08-01','Gastos Fijos','Ebenezer',16401,true,'fijo'),
  ('2026-08-01','Gastos Variables del mes','TRD',912,true,'variable'),
  ('2026-08-01','WhatsApp API (30)','Leadtion',300,true,'api'),
  ('2026-08-01','Comisiones CS Team Leadtion','Leadtion',286.80,true,'comision'),
  ('2026-08-01','Bono reactivación clientes Leadtion','Leadtion',200,true,'bono'),
  ('2026-08-01','Referidos Leadtion','Leadtion',208.90,true,'referido'),
  ('2026-08-01','Comisión retiro banco a Colombia','Ebenezer',50,true,'comision_banco');

-- Egresos que SALEN DE CAJA (no afectan la utilidad; el diezmo es automático) -
insert into public.egreso_mensual (mes, concepto, marca, fecha, valor_usd, valor_cop, afecta_utilidad, categoria) values
  ('2026-08-01','Grabación Marca Personal 4/4','TRD','2026-08-03',1488.28,4800000,false,'publicidad'),
  ('2026-08-01','Siigo Nube x12 meses','TRD','2026-08-13',758.50,2446330,false,'herramienta'),
  ('2026-08-01','Gasto publicitario Elite Agent','TRD',null,713.86,2302344,false,'publicidad'),
  ('2026-08-01','Gasto publicitario LEADTION','TRD',null,478.00,1541648,false,'publicidad'),
  ('2026-08-01','Capcut Teams x12 meses (1/2)','TRD',null,322.50,999950,false,'herramienta'),
  ('2026-08-01','Gastos a cuotas TC (Mao jul–ago)','TRD',null,437.60,1411346,false,'otro');
