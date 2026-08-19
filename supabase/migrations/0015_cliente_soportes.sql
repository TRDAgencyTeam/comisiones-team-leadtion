-- =============================================================================
-- Migración 0015 — Períodos de soporte (activar/desactivar plan de soporte)
--
-- Un cliente de Leadtion puede activar un plan de soporte ($87/$119/$157) por un
-- período (ej. solo agosto) y volver luego a su plan normal. Se registra el nivel
-- y el rango de fechas; hasta=NULL significa indefinido (cubre hasta el mes en
-- curso y se extiende cada mes). Los meses cubiertos se ponen con ese valor en el
-- historial; los de fuera vuelven solos a su valor normal.
-- =============================================================================

create table if not exists public.cliente_soportes (
  id          bigserial primary key,
  cliente_id  bigint not null references public.clientes(id) on delete cascade,
  valor       numeric not null,
  desde       date not null,
  hasta       date,               -- NULL = indefinido
  nota        text,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_cliente_soportes_cliente on public.cliente_soportes(cliente_id);

comment on table public.cliente_soportes is 'Períodos en que un cliente tiene un plan de soporte activo (nivel + rango). hasta NULL = indefinido.';
