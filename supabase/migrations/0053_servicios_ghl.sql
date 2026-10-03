-- 0053 — Línea de servicios "Leadtion · GHL"
-- Mismos servicios de Leadtion pero implementados en Go High Level. NO cobran
-- licencia ($69) ni vuelven al cliente miembro Leadtion (incluye_leadtion=false
-- y claves nuevas → no disparan es_leadtion). Se venden como servicio (factura).
-- Comisionan comercial (10%) y afiliados; NO comisionan CS (no hay licencia base).

-- Nueva categoría 'ghl' en el catálogo.
alter table public.servicio_catalogo drop constraint if exists servicio_catalogo_categoria_check;
alter table public.servicio_catalogo add constraint servicio_catalogo_categoria_check
  check (categoria in ('agencia','leadtion','puntual','ghl'));

insert into public.servicio_catalogo
  (clave, nombre, categoria, recurrente, precio_variable, precio_mes1, precio_resto, min_meses,
   aplica_cs, aplica_referido, aplica_reserva, por_persona, incluye_leadtion, comisiona_comercial, orden, activo)
values
  ('reactivacion_ghl', 'Reactivación GHL',          'ghl', true,  false, 400,  400,  3, false, true, false, false, false, true, 200, true),
  ('agente_ai_ghl',    'Agente IA GHL',             'ghl', false, false, 1000, null, 1, false, true, false, false, false, true, 210, true),
  ('agente_ai_ghl_2c', 'Agente IA GHL (2 cuotas)',  'ghl', true,  false, 500,  500,  2, false, true, false, false, false, true, 215, true),
  ('level_up_ghl',     'Level Up GHL',              'ghl', false, false, 600,  null, 1, false, true, false, false, false, true, 220, true),
  ('level_up_ghl_2c',  'Level Up GHL (2 cuotas)',   'ghl', true,  false, 300,  300,  2, false, true, false, false, false, true, 225, true)
on conflict (clave) do update set
  nombre=excluded.nombre, categoria=excluded.categoria, recurrente=excluded.recurrente,
  precio_mes1=excluded.precio_mes1, precio_resto=excluded.precio_resto, min_meses=excluded.min_meses,
  aplica_cs=excluded.aplica_cs, aplica_referido=excluded.aplica_referido, incluye_leadtion=excluded.incluye_leadtion,
  comisiona_comercial=excluded.comisiona_comercial, orden=excluded.orden, activo=true;
