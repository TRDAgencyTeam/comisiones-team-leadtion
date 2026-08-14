-- =============================================================================
-- Migración 0007 — Personas asignadas a un cliente (para comisión CS)
--
-- Qué colaboradores (Andrés/Daniel/Alejandro) atienden a cada cliente. Se captura
-- al crear el cliente desde Membresías. Informativo por ahora (el motor de CS
-- sigue calculando por fecha); permite ver a quién se le paga por cada cuenta.
-- =============================================================================

create table if not exists public.cliente_colaboradores (
  cliente_id     bigint not null references public.clientes(id) on delete cascade,
  colaborador_id bigint not null references public.colaboradores(id) on delete cascade,
  primary key (cliente_id, colaborador_id)
);

comment on table public.cliente_colaboradores is 'Colaboradores CS asignados a cada cliente (a quién se le paga comisión por la cuenta).';
