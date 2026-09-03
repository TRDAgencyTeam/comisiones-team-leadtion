-- =============================================================================
-- Migración 0040 — Correos de colaboradores + freelances (Úrsula, Juan Reyes).
-- Permite rol 'freelance' (sin nómina fija: valor_nomina null → no entra a
-- gastos fijos; se excluye del listado de REG y de nómina por área).
-- =============================================================================
alter table public.colaboradores drop constraint if exists colaboradores_rol_check;
alter table public.colaboradores add constraint colaboradores_rol_check
  check (rol = any (array['admin','cs','comercial','freelance']));

update public.colaboradores set email='alex.productor14@gmail.com'     where lower(nombre)='alex bernal';
update public.colaboradores set email='valentinabrun.design@gmail.com' where lower(nombre)='valentina brun';
update public.colaboradores set email='s.chaparrob@gmail.com'          where lower(nombre)='santiago chaparro';
update public.colaboradores set email='alejandro.trdagency@gmail.com'  where lower(nombre)='alejandro';
update public.colaboradores set email='jfonsevanegas@gmail.com'        where lower(nombre)='juan fonseca';
update public.colaboradores set email='numeroc78@gmail.com'            where lower(nombre)='daniel franco';
update public.colaboradores set email='diegopinedavera@gmail.com'      where lower(nombre)='diego pineda';
update public.colaboradores set email='gleinis.trdagency@gmail.com'    where lower(nombre)='gleinis';
update public.colaboradores set email='sr.andres@hotmail.es'           where lower(nombre)='andrés rodríguez';

insert into public.colaboradores (nombre, rol, area, email, activo, valor_nomina)
select 'Úrsula','freelance','FL','ursula.videomarketing@gmail.com',true,null
where not exists (select 1 from public.colaboradores where lower(nombre)='úrsula');
insert into public.colaboradores (nombre, rol, area, email, activo, valor_nomina)
select 'Juan Reyes','freelance','FL','juandareyes99@gmail.com',true,null
where not exists (select 1 from public.colaboradores where lower(nombre)='juan reyes');
