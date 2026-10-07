-- 0054 — Servicio "Diseño de Landing Page" (agencia, pago único, precio variable).
-- Precio por proyecto (se escribe al vender). Comisiona comercial; no CS ni afiliado;
-- no vuelve al cliente miembro Leadtion.
insert into public.servicio_catalogo
  (clave, nombre, categoria, recurrente, precio_variable, precio_mes1, precio_resto, min_meses,
   aplica_cs, aplica_referido, aplica_reserva, por_persona, incluye_leadtion, comisiona_comercial, orden, activo)
values
  ('diseno_landing', 'Diseño de Landing Page', 'agencia', false, true, null, null, 1,
   false, false, false, false, false, true, 55, true)
on conflict (clave) do update set
  nombre=excluded.nombre, categoria=excluded.categoria, recurrente=excluded.recurrente,
  precio_variable=excluded.precio_variable, comisiona_comercial=excluded.comisiona_comercial,
  orden=excluded.orden, activo=true;
