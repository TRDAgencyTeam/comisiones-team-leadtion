-- =============================================================================
-- Migración 0010 — Servicios adquiridos por el cliente (línea de tiempo)
--
-- Un cliente puede comprar un servicio especial (Agente IA, Reactivación,
-- Level Up) DESPUÉS de llevar tiempo activo. En vez de reescribir su ficha
-- inicial, se registra un "evento de servicio" con su mes de inicio, y el
-- sistema genera los cobros de los meses siguientes según la dinámica del
-- servicio (ver web/src/lib/servicios.ts).
-- =============================================================================

create table if not exists public.cliente_servicios (
  id                bigserial primary key,
  cliente_id        bigint not null references public.clientes(id) on delete cascade,
  tipo_servicio     text not null check (tipo_servicio in ('agente_ai','reactivacion','level_up')),
  mes_inicio        date not null,               -- primer día del mes en que compró
  soporte_valor     numeric,                     -- soporte que se activa (mes 3)
  bono_reactivacion numeric,                     -- si aplica
  nota              text,
  creado_en         timestamptz not null default now()
);

create index if not exists idx_cliente_servicios_cliente on public.cliente_servicios(cliente_id);

comment on table public.cliente_servicios is 'Servicios especiales que un cliente adquiere en el tiempo; generan los pagos de su ventana.';

-- El mes 2 de Agente IA es de garantía (cobro $0). Ampliamos los estados de mes.
alter table public.pagos_mensuales drop constraint if exists pagos_mensuales_estado_mes_check;
alter table public.pagos_mensuales add constraint pagos_mensuales_estado_mes_check
  check (estado_mes = any (array[
    'activo','cancelado','incluido_en_marketing','en_riesgo_o_mora',
    'previo_a_activacion','sin_datos','garantia'
  ]));
