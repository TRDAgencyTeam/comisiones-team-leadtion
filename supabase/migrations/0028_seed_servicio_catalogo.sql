-- =============================================================================
-- Migración 0028 — Semilla del catálogo de servicios (precios base editables).
-- Precios "por defecto": se pueden cambiar por cliente al crear la factura.
-- recurrente=true solo para los que se cobran TODOS los meses (auto-generación).
-- =============================================================================

insert into public.servicio_catalogo
  (clave, nombre, categoria, recurrente, precio_variable, precio_mes1, precio_resto,
   min_meses, aplica_cs, aplica_referido, aplica_reserva, orden)
values
  -- Agencia --------------------------------------------------------------------
  ('plan_ads_ia_crm',    'Plan Marketing Ads + IA + CRM', 'agencia', true,  false, 1500, 897, 4, true,  false, false, 10),
  ('ads_pro_business',   'Ads Pro Business',              'agencia', true,  true,  null, null, 1, true,  false, false, 20),
  ('social_media_advance','Social Media Advance',         'agencia', true,  false, 497,  497,  1, false, false, false, 30),
  ('seo_web',            'SEO Web',                       'agencia', true,  true,  null, null, 1, true,  false, false, 40),
  ('licencia_canva',     'Licencia Canva (reventa)',      'agencia', true,  false, 10,   10,   1, false, false, false, 50),
  ('mantenimiento_web',  'Mantenimiento web',             'agencia', false, true,  null, null, 1, true,  false, false, 60),
  ('hosting_cloud_12',   'Hosting Cloud 12 meses',        'agencia', false, true,  null, null, 1, true,  false, false, 70),
  ('dominio_web_12',     'Dominio web 12 meses',          'agencia', false, true,  null, null, 1, true,  false, false, 80),
  ('renov_hosting',      'Renovación hosting',            'agencia', false, true,  null, null, 1, true,  false, false, 90),
  ('renov_dominio',      'Renovación dominio',            'agencia', false, true,  null, null, 1, true,  false, false, 100),
  -- Puntual (una vez) ----------------------------------------------------------
  ('grabacion_contenido','Grabación de contenido',        'puntual', false, false, 400,  null, 1, true,  false, false, 110),
  ('marketing_eventos',  'Marketing para eventos',        'puntual', false, false, 797,  null, 1, true,  false, false, 120),
  -- Leadtion (se jalan de Leadtion; referido/reserva aplican) -------------------
  ('agente_ai',          'Agente IA (Text AI)',           'leadtion', false, false, 847, 0,   3, true,  true,  true,  130),
  ('reactivacion',       'Reactivación Base P2P',         'leadtion', false, false, 597, 197, 3, true,  true,  true,  140),
  ('level_up',           'Level Up',                      'leadtion', false, false, 497, null, 1, true,  true,  true,  150),
  ('membresia',          'Membresía Leadtion',            'leadtion', true,  false, 69,  69,   1, true,  true,  false, 160)
on conflict (clave) do nothing;
