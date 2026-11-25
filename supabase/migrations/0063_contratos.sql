-- Módulo de Contratos para clientes finales (no nómina interna). Un contrato se crea
-- desde una plantilla (clausulado fijo) + variables (cliente, fechas, forma de pago…),
-- se envía al cliente para firma y se refleja su estado aquí.

create table if not exists public.contrato (
  id bigserial primary key,
  uuid text not null unique,
  cliente_id bigint references public.clientes(id) on delete set null,
  cliente_nombre text not null,
  cliente_email text,
  cliente_domicilio text default 'Florida, EE. UU.',
  plantilla text not null default 'plan_marketing',
  titulo text,
  variables jsonb not null default '{}',
  -- borrador | enviado | visto | firmado | vencido | anulado
  estado text not null default 'borrador',
  valor_resumen text,
  vigencia_resumen text,
  token text,                         -- enlace público de firma (futuro)
  fecha_envio timestamptz,
  fecha_vence timestamptz,
  fecha_firma timestamptz,
  firma_tipo text,                    -- dibujo | texto
  firma_data text,                    -- data URL (dibujo) o nombre
  firma_fuente text,
  recordatorio_dias int default 1,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);
create index if not exists idx_contrato_estado on public.contrato (estado);
create index if not exists idx_contrato_cliente on public.contrato (cliente_id);

-- Registro de eventos (auditoría) por contrato.
create table if not exists public.contrato_evento (
  id bigserial primary key,
  contrato_id bigint not null references public.contrato(id) on delete cascade,
  tipo text,
  descripcion text,
  creado_en timestamptz default now()
);
create index if not exists idx_contrato_evento on public.contrato_evento (contrato_id);
