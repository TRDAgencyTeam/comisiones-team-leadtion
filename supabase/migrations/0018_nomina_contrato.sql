-- =============================================================================
-- Migración 0018 — Nómina (dentro de Gastos Fijos): datos de contrato del colaborador
--
-- La nómina vive dentro de Gastos Fijos (como en el Excel). Se amplía la tabla
-- `colaboradores` (fuente única de personas) con los datos que se piden al crear
-- a alguien desde el módulo madre. La fecha de fin se calcula (inicio + meses) y
-- se guarda para poder consultarla/ordenar/alertar.
-- =============================================================================

alter table public.colaboradores add column if not exists fecha_nacimiento date;
alter table public.colaboradores add column if not exists fecha_inicio_contrato date;
alter table public.colaboradores add column if not exists duracion_contrato_meses integer;
alter table public.colaboradores add column if not exists fecha_fin_contrato date;
-- Área de la nómina (como en el Excel): GC gerencia, SM social media, LT Leadtion,
-- AV audiovisual, MB media buyer, ADM administración, etc. Texto libre por ahora.
alter table public.colaboradores add column if not exists area text;

comment on column public.colaboradores.fecha_inicio_contrato is 'Inicio del contrato vigente.';
comment on column public.colaboradores.duracion_contrato_meses is 'Duración del contrato en meses.';
comment on column public.colaboradores.fecha_fin_contrato is 'Fin del contrato = inicio + duración (calculado).';
comment on column public.colaboradores.area is 'Área de nómina (GC/SM/LT/AV/MB/ADM…).';
