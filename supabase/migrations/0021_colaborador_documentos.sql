-- =============================================================================
-- Migración 0021 — Documentos del colaborador (hoja de vida, cédula/RUT, contratos)
--
-- Se guardan en la BD (bytea) para no depender de un bucket externo. Archivos
-- pequeños (PDF/imágenes de pocos MB). Se sirven vía una ruta que hace stream.
-- tipo: hoja_vida | cedula | rut | contrato.  Para contratos, es_vigente marca
-- el contrato actual (los demás quedan como "anteriores").
-- =============================================================================

create table if not exists public.colaborador_documento (
  id             bigserial primary key,
  colaborador_id integer not null references public.colaboradores(id) on delete cascade,
  tipo           text not null check (tipo in ('hoja_vida','cedula','rut','contrato')),
  nombre_archivo text not null,
  mime           text not null,
  tamano         integer not null default 0,
  contenido      bytea not null,
  es_vigente     boolean not null default false,   -- solo aplica a contratos
  creado_en      timestamptz not null default now()
);

create index if not exists idx_doc_colaborador on public.colaborador_documento (colaborador_id, tipo);

comment on table public.colaborador_documento is 'Documentos del colaborador (bytea): hoja de vida, cédula/RUT, contratos.';
