-- =============================================================================
-- Migración 0011 — Email de acceso del colaborador (portal CS)
--
-- Cada colaborador de Customer Success puede tener una cuenta propia (Supabase
-- Auth, creada por el admin) para entrar a su portal. El vínculo entre la cuenta
-- y el colaborador es el email: se guarda aquí y se compara con el email del
-- usuario autenticado. El admin (ADMIN_EMAIL) no necesita estar en esta tabla.
-- =============================================================================

alter table public.colaboradores add column if not exists email text;

-- Único e insensible a mayúsculas (dos colaboradores no pueden compartir login).
create unique index if not exists idx_colaboradores_email
  on public.colaboradores (lower(email)) where email is not null;

comment on column public.colaboradores.email is 'Email de acceso al portal del colaborador (coincide con su usuario de Supabase Auth).';
