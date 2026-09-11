-- 0043: Liga las facturas al maestro `clientes` por nombre SIN acentos.
-- Muchas facturas quedaron con cliente_id NULL, y el match por nombre fallaba por
-- tildes ("María José Río" vs "Maria Jose Rio"). Sin cliente_id, ni el cierre ni la
-- auto-generación de recurrentes pueden respetar el estado del cliente.
--
-- Solo actualiza cuando hay UN único cliente que coincide (evita ambigüedades).

update public.factura_mensual f
   set cliente_id = c.id
  from public.clientes c
 where f.cliente_id is null
   and translate(lower(trim(f.cliente_nombre)), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
     = translate(lower(trim(c.nombre)),          'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
   and (
     select count(*) from public.clientes c2
      where translate(lower(trim(c2.nombre)), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
          = translate(lower(trim(f.cliente_nombre)), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')
   ) = 1;
