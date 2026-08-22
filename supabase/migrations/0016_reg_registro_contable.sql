-- =============================================================================
-- Migración 0016 — REG (Registro contable) · plataforma madre TRD Investment
--
-- Primer módulo de la plataforma madre. Registra el pago mensual a cada
-- colaborador (nómina) y a freelance ocasionales, calculando las retenciones
-- colombianas (ReteICA + ReteRenta Art. 383) y el valor a girar. Incluye el
-- checklist de 4 estados por pago (correo · drive · registro app · pagado).
--
-- Reutiliza la tabla `colaboradores` existente (se le agregan datos tributarios)
-- y NO toca nada de Leadtion. Ver ARQUITECTURA_TRD_INVESTMENT.md.
-- =============================================================================

-- 1) Datos tributarios del colaborador (para calcular sus retenciones).
alter table public.colaboradores add column if not exists identificacion text;
alter table public.colaboradores add column if not exists actividad_ciiu text;
-- Tarifa de ICA en "por mil" de su actividad (ej. 8.66). Editable; si el día de
-- mañana se importa la tabla CIIU completa, se puede autocompletar desde el código.
alter table public.colaboradores add column if not exists tarifa_ica_mil numeric(6,2);

comment on column public.colaboradores.actividad_ciiu is 'Código CIIU de la actividad económica (para ReteICA).';
comment on column public.colaboradores.tarifa_ica_mil is 'Tarifa de ICA por mil de la actividad (ej. 8.66).';

-- 2) UVT por año (Unidad de Valor Tributario). Fuente única para el cálculo.
create table if not exists public.reg_uvt (
  anio  integer primary key,
  valor numeric(12,2) not null
);
insert into public.reg_uvt (anio, valor) values
  (2024, 47065),
  (2025, 49799),
  (2026, 52374)
on conflict (anio) do update set valor = excluded.valor;

-- 3) Tabla de referencia CIIU -> tarifa ICA (por mil). Se siembra un subconjunto
--    con las actividades del equipo; ampliable con el resto de la tabla oficial.
create table if not exists public.reg_tarifa_ica (
  codigo      text primary key,
  descripcion text not null,
  tarifa_mil  numeric(6,2) not null
);
insert into public.reg_tarifa_ica (codigo, descripcion, tarifa_mil) values
  ('7410', 'Actividades especializadas de diseño', 8.66),
  ('7310', 'Publicidad', 9.66),
  ('8299', 'Otras actividades de servicio de apoyo a las empresas n.c.p.', 9.66),
  ('5911', 'Producción de películas, videos y comerciales', 11.04),
  ('5912', 'Postproducción de películas, videos y comerciales', 11.04),
  ('5920', 'Grabación de sonido y edición de música', 11.04),
  ('6201', 'Desarrollo de sistemas informáticos', 9.66),
  ('6202', 'Consultoría informática', 6.90),
  ('7420', 'Actividades de fotografía', 9.66),
  ('7020', 'Actividades de consultoría de gestión', 8.66)
on conflict (codigo) do update set descripcion = excluded.descripcion, tarifa_mil = excluded.tarifa_mil;

-- 4) Registro contable de pagos (REG). Un renglón por colaborador/freelance y mes.
create table if not exists public.reg_pago (
  id                  bigserial primary key,
  -- Colaborador de nómina (si aplica) o pago suelto a freelance (nombre libre).
  colaborador_id      integer references public.colaboradores(id) on delete set null,
  nombre_libre        text,
  identificacion      text,
  actividad_ciiu      text,
  tarifa_ica_mil      numeric(6,2) not null default 0,
  -- Mes del pago: se guarda el primer día del mes (date_trunc).
  mes                 date not null,
  -- Entradas
  valor_cuenta_cobro  numeric(14,2) not null default 0,
  aporte_salud        numeric(14,2) not null default 0,
  aporte_pension      numeric(14,2) not null default 0,
  -- Resultados (snapshot calculado; el front recalcula en vivo con la misma fórmula)
  rete_ica            numeric(14,2) not null default 0,
  rete_renta          numeric(14,2) not null default 0,
  valor_girar         numeric(14,2) not null default 0,
  -- Costo de transferencia bancaria: lo asume Ebenezer, NO se descuenta al colaborador.
  costo_transferencia numeric(14,2) not null default 0,
  -- Checklist de 4 estados del proceso de pago.
  ck_correo           boolean not null default false,
  ck_drive            boolean not null default false,
  ck_registro         boolean not null default false,
  ck_pagado           boolean not null default false,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now()
);

-- Un colaborador de nómina solo puede tener un renglón por mes.
create unique index if not exists idx_reg_pago_colab_mes
  on public.reg_pago (colaborador_id, mes) where colaborador_id is not null;

create index if not exists idx_reg_pago_mes on public.reg_pago (mes);

comment on table public.reg_pago is 'REG — registro contable de pagos a colaboradores/freelance por mes (retenciones + checklist).';
