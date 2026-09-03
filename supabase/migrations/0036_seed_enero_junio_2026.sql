-- =============================================================================
-- Migración 0036 — Semilla ENERO–JUNIO 2026 (histórico, de las imágenes).
-- Re-ejecutable (borra cada mes antes de insertar). Planes con nombres viejos se
-- dejan como texto (marketing general, servicio_clave null). Tachados = anulado.
-- Los valores se transcriben de las imágenes; revisar y ajustar si algo difiere.
-- =============================================================================
delete from public.factura_mensual where mes in ('2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01','2026-06-01');
delete from public.ingreso_mensual where mes in ('2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01','2026-06-01');
delete from public.egreso_mensual  where mes in ('2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01','2026-06-01');

-- ===================== ENERO (tasa 3592) =====================
insert into public.factura_mensual (mes,entidad,cliente_nombre,servicios,facturado,medio,iva_pct,estado,recurrente,mes_contrato,servicio_clave,tasa) values
 ('2026-01-01','LLC','Tita Galvez','Plan Dynamic',639,'stripe',0,'pagado',true,null,null,null),
 ('2026-01-01','LLC','Del Sur Home LLC (Martha Chirino)','Plan Marketing Essential Pro',415,'stripe',0,'pagado',true,null,null,null),
 ('2026-01-01','LLC','Diana Yepes','Plan Marketing Essential Pro',497,'stripe',0,'pagado',true,1,null,null),
 ('2026-01-01','LLC','Mauricio Total Health','Social Media Essential + Ads Pro Business',774,'stripe',0,'pagado',true,null,'ads_pro_business',null),
 ('2026-01-01','LLC','Wilmar Sosa LLC','Licencia Canva + Leadtion TRD + Meta Ads',831,'zelle',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-01-01','LLC','Elite Agent Club','Social Media Advance',497,'zelle',0,'pagado',true,null,'social_media_advance',null),
 ('2026-01-01','LLC','Catalina Leon Smith','LEADTION Plan Level Up',395,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-01-01','LLC','Hadar Siboni','LEADTION Plan Level Up',243,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-01-01','LLC','Maria Feliz','LEADTION Plan Level Up',747,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-01-01','LLC','Joaquin Medina','LEADTION Plan Level Up',730,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-01-01','LLC','Miguel Solera (Sandra)','Meta Ads + Email Marketing + Leadtion',655,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-01-01','LLC','Maria Rodriguez','LEADTION Plan Level Up',747,'zelle',0,'pagado',false,null,'level_up',null),
 ('2026-01-01','LLC','Diana Yepes','LEADTION Plan Level Up',747,'zelle',0,'pagado',false,null,'level_up',null),
 ('2026-01-01','COL','Lord And Lady','Meta Ads + Google Ads',935000,'bancolombia',19,'pagado',true,null,'plan_ads_ia_crm',3592),
 ('2026-01-01','COL','Lord By David','Meta Ads',690000,'bancolombia',19,'pagado',true,null,'ads_pro_business',3592),
 ('2026-01-01','COL','Bio Salud','Mantenimiento web Trimestral',590000,'bancolombia',0,'pagado',false,null,'mantenimiento_web',3592),
 ('2026-01-01','COL','Fibra Resin','Renovación Hosting + Dominio',734000,'bancolombia',0,'pagado',false,null,'renov_hosting',3592);
insert into public.ingreso_mensual (mes,concepto,valor_usd,categoria) values
 ('2026-01-01','Leadtion (23) + Afiliado',1490.47,'leadtion'),
 ('2026-01-01','Ingresos x Elite Agent (30%)',518.70,'otro'),
 ('2026-01-01','Mantenimiento Web (Multicultural)',75,'mantenimiento'),
 ('2026-01-01','Ingresos x Asesorías',54,'otro'),
 ('2026-01-01','Dominio Web (1)',37,'hosting'),
 ('2026-01-01','Afiliación Brevo',21,'afiliacion'),
 ('2026-01-01','WhatsApp API $12 (9)',18,'whatsapp_api');
insert into public.egreso_mensual (mes,concepto,marca,valor_usd,afecta_utilidad,categoria) values
 ('2026-01-01','Gastos Fijos','Ebenezer',10287,true,'fijo'),
 ('2026-01-01','Gastos Variables del mes','TRD',563,true,'variable'),
 ('2026-01-01','WhatsApp API (18)','Leadtion',180,true,'api'),
 ('2026-01-01','Referidos Leadtion','Leadtion',194.80,true,'referido'),
 ('2026-01-01','Comisión retiro banco','Ebenezer',45,true,'comision_banco');

-- ===================== FEBRERO (tasa 3777) =====================
insert into public.factura_mensual (mes,entidad,cliente_nombre,servicios,facturado,medio,iva_pct,estado,recurrente,mes_contrato,servicio_clave,tasa) values
 ('2026-02-01','LLC','Catalina Leon Smith','Meta Ads',347,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-02-01','LLC','Diana Yepes','Plan Marketing Essential Pro',347,'stripe',0,'pagado',true,2,null,null),
 ('2026-02-01','LLC','Mauricio Total Health','Social Media Essential + Ads Pro Business',774,'stripe',0,'pagado',true,null,'ads_pro_business',null),
 ('2026-02-01','LLC','Wilmar Sosa LLC','Licencia Canva + Leadtion TRD + Meta Ads',2431,'zelle',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-02-01','LLC','Elite Agent Club','Social Media Advance',497,'zelle',0,'pagado',true,null,'social_media_advance',null),
 ('2026-02-01','LLC','Agente Postal','Mantenimiento web Trimestral',76,'zelle',0,'pagado',false,null,'mantenimiento_web',null),
 ('2026-02-01','LLC','Jhon Roa','Meta Ads',597,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-02-01','LLC','Érica Maxwell','Meta Ads + Social Media Advance',1012,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-02-01','LLC','Jaqueline Firvida','LEADTION Plan Level Up',497,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-02-01','LLC','Sandra Vargas','LEADTION Plan Level Up',797,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-02-01','LLC','Stronge Stone','Renovación Hosting + Dominio',210,'stripe',0,'pagado',false,null,'renov_hosting',null),
 ('2026-02-01','LLC','Andrea Hidalgo','Meta Ads + LEADTION Plan Level Up',897,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-02-01','LLC','Johana Gómez','LEADTION Plan Level Up',497,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-02-01','LLC','Estella Bonilla','LEADTION Plan Level Up',397,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-02-01','LLC','Cero Suposiciones LLC','LEADTION Plan Level Up',797,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-02-01','COL','Lord And Lady','Meta Ads + Google Ads',935000,'nequi',19,'pagado',true,null,'plan_ads_ia_crm',3777),
 ('2026-02-01','COL','Lord By David','Meta Ads',690000,'nequi',19,'pagado',true,null,'ads_pro_business',3777),
 ('2026-02-01','COL','Mythical Hotel','Renovación Hosting + Dominio',884900,'bancolombia',0,'pagado',false,null,'renov_hosting',3777);
insert into public.ingreso_mensual (mes,concepto,valor_usd,categoria) values
 ('2026-02-01','Leadtion (27) + Afiliado',1726.47,'leadtion'),
 ('2026-02-01','Ingresos x Elite Agent (30%)',2101.50,'otro'),
 ('2026-02-01','WhatsApp API $12 (15)',30,'whatsapp_api'),
 ('2026-02-01','Afiliación Brevo',14.51,'afiliacion');
insert into public.egreso_mensual (mes,concepto,marca,valor_usd,afecta_utilidad,categoria) values
 ('2026-02-01','Gastos Fijos','Ebenezer',10010,true,'fijo'),
 ('2026-02-01','Gastos Variables del mes','TRD',736,true,'variable'),
 ('2026-02-01','WhatsApp API (20)','Leadtion',200,true,'api'),
 ('2026-02-01','Referidos Leadtion','Leadtion',73.70,true,'referido'),
 ('2026-02-01','Comisión retiro banco','Ebenezer',50,true,'comision_banco');

-- ===================== MARZO (tasa 3642.80) =====================
insert into public.factura_mensual (mes,entidad,cliente_nombre,servicios,facturado,medio,iva_pct,estado,recurrente,mes_contrato,servicio_clave,tasa) values
 ('2026-03-01','LLC','Mary Hale','Social Media Essential',437,'stripe',0,'pagado',true,null,'social_media_advance',null),
 ('2026-03-01','LLC','Diana Yepes','Plan Marketing Essential Pro',347,'stripe',0,'pagado',true,null,null,null),
 ('2026-03-01','LLC','Mauricio Total Health','Social Media Essential + Ads Pro Business',964,'stripe',0,'pagado',true,null,'ads_pro_business',null),
 ('2026-03-01','LLC','Jhon Roa','Meta Ads',597,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-03-01','LLC','Érica Maxwell','Meta Ads + Social Media Advance',1012,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-03-01','LLC','Andrea Hidalgo','Meta Ads',597,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-03-01','LLC','Elite Agent Club','Social Media Advance',497,'zelle',0,'pagado',true,null,'social_media_advance',null),
 ('2026-03-01','LLC','Wilmar Sosa LLC','Licencia Canva + Leadtion TRD + Meta Ads',3227,'zelle',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-03-01','LLC','Miguel Solera (Sandra)','Meta Ads + Email Marketing',508,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-03-01','LLC','Martha Laverde','LEADTION Plan Level Up',497,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-03-01','LLC','Yosmar Cutcher','LEADTION Reactivación Base',497,'stripe',0,'pagado',false,null,'reactivacion',null),
 ('2026-03-01','LLC','Iris Mar Aguilera','LEADTION Plan Level Up',497,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-03-01','LLC','Johana Gómez','Meta Ads',397,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-03-01','LLC','Marcela Cazares','LEADTION Plan Level Up',597,'zelle',0,'pagado',false,null,'level_up',null),
 ('2026-03-01','LLC','Vanessa Figueroa','Meta Ads + LEADTION Reactivación Base',1810,'zelle',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-03-01','COL','Lord And Lady','Meta Ads + Google Ads',935000,'bancolombia',19,'pagado',true,null,'plan_ads_ia_crm',3642.80),
 ('2026-03-01','COL','Lord By David','Meta Ads',690000,'bancolombia',19,'pagado',true,null,'ads_pro_business',3642.80),
 ('2026-03-01','COL','Martha Laverde','LEADTION Plan Level Up',1110000,'bancolombia',0,'pagado',false,null,'level_up',3642.80);
insert into public.ingreso_mensual (mes,concepto,valor_usd,categoria) values
 ('2026-03-01','Leadtion (33) + Afiliado',1875.47,'leadtion'),
 ('2026-03-01','Ingresos x Elite Agent (30%)',248.03,'otro'),
 ('2026-03-01','WhatsApp API $12 (21)',42,'whatsapp_api'),
 ('2026-03-01','Afiliación Brevo',14.51,'afiliacion');
insert into public.egreso_mensual (mes,concepto,marca,valor_usd,afecta_utilidad,categoria) values
 ('2026-03-01','Gastos Fijos','Ebenezer',12237,true,'fijo'),
 ('2026-03-01','Gastos Variables del mes','TRD',819,true,'variable'),
 ('2026-03-01','WhatsApp API (27)','Leadtion',270,true,'api'),
 ('2026-03-01','Referidos Leadtion','Leadtion',53.60,true,'referido'),
 ('2026-03-01','Comisión retiro banco','Ebenezer',50,true,'comision_banco');

-- ===================== ABRIL (tasa 3690) =====================
insert into public.factura_mensual (mes,entidad,cliente_nombre,servicios,facturado,medio,iva_pct,estado,recurrente,mes_contrato,servicio_clave,tasa) values
 ('2026-04-01','LLC','Mary Hale','Social Media Essential',437,'stripe',0,'pagado',true,null,'social_media_advance',null),
 ('2026-04-01','LLC','Diana Yepes (DICAY)','Plan Marketing Essential Pro (prorrateado cancelación)',243,'stripe',0,'pagado',false,null,null,null),
 ('2026-04-01','LLC','Mauricio Total Health','Social Media Essential + Ads Pro Business + SEO Web',1569,'stripe',0,'pagado',true,null,'ads_pro_business',null),
 ('2026-04-01','LLC','Jhon Roa','Meta Ads + Social Media Advance + LEADTION Text AI',1394,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Érica Maxwell','Meta Ads + Social Media Advance',1012,'stripe',0,'pagado',true,3,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Andrea Hidalgo','Meta Ads',597,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Elite Agent Club','Social Media Advance',497,'zelle',0,'pagado',true,null,'social_media_advance',null),
 ('2026-04-01','LLC','Vanessa Figueroa','Meta Ads + Social Media Advance',800,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Johana Gómez','Meta Ads',358,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Yosmar Cutcher','Meta Ads + LEADTION Text AI',847,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Irma Díaz','Meta Ads + LEADTION Text AI',847,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Sandra Guerra PA','Meta Ads',497,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Wilmar Sosa LLC','Licencia Canva + Leadtion CRM + Meta Ads',2627,'zelle',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Gabriela Dablat','LEADTION Plan Level Up',497,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-04-01','LLC','Sandra Guerra (Reactivación)','LEADTION Reactivación Base + Text AI',1225,'stripe',0,'pagado',false,null,'reactivacion',null),
 ('2026-04-01','LLC','Katherine Vargas','LEADTION Plan Level Up',167,'zelle',0,'pagado',false,null,'level_up',null),
 ('2026-04-01','LLC','Francisco Lara (The Global Team)','LEADTION Text AI',797,'stripe',0,'pagado',false,null,'agente_ai',null),
 ('2026-04-01','LLC','Sandra Aparicio','LEADTION Text AI',597,'stripe',0,'pagado',false,null,'agente_ai',null),
 ('2026-04-01','LLC','Catalina Leon Smith','Meta Ads + Evento Presencial',697,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-04-01','LLC','Ivelisse Medina','LEADTION Reactivación Base',497,'stripe',0,'pagado',false,1,'reactivacion',null),
 ('2026-04-01','COL','Lord And Lady','Meta Ads + Google Ads',935000,'nequi',19,'pagado',true,null,'plan_ads_ia_crm',3690),
 ('2026-04-01','COL','Lord By David','Meta Ads',690000,'nequi',19,'pagado',true,null,'ads_pro_business',3690);
insert into public.ingreso_mensual (mes,concepto,valor_usd,categoria) values
 ('2026-04-01','Leadtion (42) + Afiliado',2079.47,'leadtion'),
 ('2026-04-01','WhatsApp API $12 (18)',38,'whatsapp_api'),
 ('2026-04-01','Afiliación Brevo',14.51,'afiliacion');
insert into public.egreso_mensual (mes,concepto,marca,valor_usd,afecta_utilidad,categoria) values
 ('2026-04-01','Gastos Fijos','Ebenezer',13435,true,'fijo'),
 ('2026-04-01','Gastos Variables del mes','TRD',798,true,'variable'),
 ('2026-04-01','WhatsApp API (31)','Leadtion',310,true,'api'),
 ('2026-04-01','Referidos Leadtion (Catalina)','Leadtion',41.40,true,'referido'),
 ('2026-04-01','Comisión retiro banco','Ebenezer',50,true,'comision_banco');

-- ===================== MAYO (tasa 3555) =====================
insert into public.factura_mensual (mes,entidad,cliente_nombre,servicios,facturado,medio,iva_pct,estado,recurrente,mes_contrato,servicio_clave,tasa) values
 ('2026-05-01','LLC','Mary Hale','Social Media Essential',437,'stripe',0,'pagado',true,3,'social_media_advance',null),
 ('2026-05-01','LLC','14 ROC','Meta Ads',500,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Mauricio Total Health','Social Media Essential + Ads Pro Business + SEO Web',970,'stripe',0,'pagado',true,null,'ads_pro_business',null),
 ('2026-05-01','LLC','Jhon Roa','Meta Ads + Social Media Advance + LEADTION Text AI',1394,'stripe',0,'pagado',true,3,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Érica Maxwell','Meta Ads + Social Media Advance',1012,'stripe',0,'pagado',true,4,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Andrea Hidalgo','Meta Ads + LEADTION Text AI',597,'stripe',0,'pagado',true,3,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Elite Agent Club','Social Media Advance',497,'zelle',0,'pagado',true,null,'social_media_advance',null),
 ('2026-05-01','LLC','Vanessa Figueroa','Meta Ads',449,'stripe',0,'pagado',true,3,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Johana Gómez','Meta Ads',397,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Yosmar Cutcher','Meta Ads + LEADTION Text AI',647,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Irma Díaz','Meta Ads + LEADTION Text AI',747,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Sandra Guerra PA','Meta Ads',797,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Martha Laverde','Meta Ads',400,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Wilmar Sosa LLC','Licencia Canva + Leadtion CRM + Meta Ads',2477,'zelle',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-05-01','LLC','Evelyn Santodomingo','LEADTION Text AI (cancela)',225,'stripe',0,'pagado',false,null,'agente_ai',null),
 ('2026-05-01','LLC','Yolanda Uzeta','LEADTION Plan Level Up',497,'stripe',0,'pagado',false,null,'level_up',null),
 ('2026-05-01','LLC','Katherine Osorio','Meta Ads + LEADTION Reactivación Base',1344,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-05-01','COL','Lord And Lady','Meta Ads + Google Ads',935000,'bancolombia',19,'pagado',true,null,'plan_ads_ia_crm',3555),
 ('2026-05-01','COL','Lord By David','Meta Ads',690000,'bancolombia',19,'pagado',true,null,'ads_pro_business',3555),
 ('2026-05-01','COL','Bio Salud','Mantenimiento web Trimestral',590000,'bancolombia',0,'pagado',false,null,'mantenimiento_web',3555);
insert into public.ingreso_mensual (mes,concepto,valor_usd,categoria) values
 ('2026-05-01','Leadtion (44) + Afiliado',2470.47,'leadtion'),
 ('2026-05-01','Cloud TRD + Mantenimiento web',833.14,'mantenimiento'),
 ('2026-05-01','WhatsApp API $12 (19)',38,'whatsapp_api'),
 ('2026-05-01','Afiliación Brevo',14.51,'afiliacion');
insert into public.egreso_mensual (mes,concepto,marca,valor_usd,afecta_utilidad,categoria) values
 ('2026-05-01','Gastos Fijos','Ebenezer',15695,true,'fijo'),
 ('2026-05-01','Gastos Variables del mes','TRD',779,true,'variable'),
 ('2026-05-01','WhatsApp API (39)','Leadtion',390,true,'api'),
 ('2026-05-01','Referidos Leadtion','Leadtion',137.04,true,'referido'),
 ('2026-05-01','Bono reactivación clientes Leadtion (2)','Leadtion',200,true,'bono'),
 ('2026-05-01','Comisión retiro banco','Ebenezer',50,true,'comision_banco');

-- ===================== JUNIO (tasa 3331) =====================
insert into public.factura_mensual (mes,entidad,cliente_nombre,servicios,facturado,medio,iva_pct,estado,recurrente,mes_contrato,servicio_clave,tasa) values
 ('2026-06-01','LLC','Katherine Osorio','Meta Ads',797,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','14 ROC (Cervera)','Meta Ads',500,'stripe',0,'pagado',true,1,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Mauricio Total Health','Ads Pro Business + Renovación Hosting',1080,'stripe',0,'pagado',true,null,'ads_pro_business',null),
 ('2026-06-01','LLC','Jhon Roa','Meta Ads + Social Media Advance',994,'stripe',0,'pagado',true,4,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Érica Maxwell','Meta Ads + Social Media Advance',1012,'stripe',0,'pagado',true,5,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Andrea Hidalgo','Meta Ads + LEADTION Text AI',597,'stripe',0,'pagado',true,4,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Elite Agent Club','Social Media Advance',497,'zelle',0,'pagado',true,null,'social_media_advance',null),
 ('2026-06-01','LLC','Vanessa Figueroa','Meta Ads (cancela)',0,'stripe',0,'anulado',false,null,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Johana Gómez (Lady Gomez)','Meta Ads + LEADTION Text AI',677,'stripe',0,'pagado',true,4,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Yosmar Cutcher','Meta Ads + LEADTION Text AI',647,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Irma Díaz','Meta Ads + LEADTION Text AI',747,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Sandra Guerra PA','Meta Ads',797,'stripe',0,'pagado',true,2,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Martha Laverde','Meta Ads',400,'stripe',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Wilmar Sosa LLC','Licencia Canva + Leadtion CRM + Meta Ads',3087,'zelle',0,'pagado',true,null,'plan_ads_ia_crm',null),
 ('2026-06-01','LLC','Melida Cabral','LEADTION Reactivación Base',542,'stripe',0,'pagado',false,null,'reactivacion',null),
 ('2026-06-01','LLC','Sara Pineda','LEADTION Reactivación Base + Text AI',1394,'stripe',0,'pagado',false,null,'reactivacion',null),
 ('2026-06-01','LLC','Carolina Quijano','LEADTION Text AI',1186,'stripe',0,'pagado',false,null,'agente_ai',null),
 ('2026-06-01','LLC','María José Río','LEADTION Text AI + Meta Ads + Social Media',1694,'stripe',0,'pagado',false,null,'agente_ai',null),
 ('2026-06-01','LLC','Bibiana Gutierrez','LEADTION Reactivación Base',597,'stripe',0,'pagado',false,null,'reactivacion',null),
 ('2026-06-01','LLC','Liliana Bustamante','LEADTION Reactivación Base',597,'stripe',0,'pagado',false,null,'reactivacion',null),
 ('2026-06-01','COL','Lord And Lady','Meta Ads + Google Ads',935000,'bancolombia',19,'pagado',true,null,'plan_ads_ia_crm',3331),
 ('2026-06-01','COL','Lord By David','Meta Ads',690000,'bancolombia',19,'pagado',true,null,'ads_pro_business',3331),
 ('2026-06-01','COL','Bio Salud','Renovación Hosting Cloud + Dominio (x3)',2538239,'bancolombia',0,'pagado',false,null,'renov_hosting',3331);
insert into public.ingreso_mensual (mes,concepto,valor_usd,categoria) values
 ('2026-06-01','Leadtion (47) + Afiliado',2537.47,'leadtion'),
 ('2026-06-01','Reservas Reactivación P2P (Claudia + Verónica)',200,'reserva'),
 ('2026-06-01','WhatsApp API $12 (18)',36,'whatsapp_api'),
 ('2026-06-01','Afiliación Brevo',7.25,'afiliacion');
insert into public.egreso_mensual (mes,concepto,marca,valor_usd,afecta_utilidad,categoria) values
 ('2026-06-01','Gastos Fijos','Ebenezer',15695,true,'fijo'),
 ('2026-06-01','Gastos Variables del mes','TRD',1644,true,'variable'),
 ('2026-06-01','WhatsApp API (39)','Leadtion',390,true,'api'),
 ('2026-06-01','Referidos Leadtion (Ivelisse, Caro, Francisco)','Leadtion',62.10,true,'referido'),
 ('2026-06-01','Bono reactivación clientes Leadtion','Leadtion',300,true,'bono'),
 ('2026-06-01','Comisión retiro banco','Ebenezer',50,true,'comision_banco');
