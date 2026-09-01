-- =============================================================================
-- Migración 0025 — Facturación mensual (pestaña "Clientes" de la madre)
--
-- El cuadro de ingresos: una fila por cliente y mes. LLC en USD (con comisión de
-- pasarela) y Colombia en COP (con IVA 19%, entidad Ebenezer). cliente_id enlaza
-- con la tabla `clientes` cuando aplica (clientes Leadtion); para clientes de solo
-- agencia se usa cliente_nombre (hasta unificar con "nuevo cliente en cascada").
-- =============================================================================

create table if not exists public.factura_mensual (
  id              bigserial primary key,
  mes             date not null,                    -- primer día del mes
  entidad         text not null default 'LLC' check (entidad in ('LLC','COL')),
  cliente_id      integer references public.clientes(id) on delete set null,
  cliente_nombre  text not null,
  mrr             integer,                          -- # de cliente recurrente (opcional)
  reserva         boolean not null default false,
  servicios       text,
  precio_desglose text,                             -- "$597 + $397 (MES 6)"
  facturado       numeric(14,2) not null default 0, -- USD (LLC) o COP antes de IVA (COL)
  medio           text,                             -- stripe / zelle / bancolombia / nequi / otro
  fecha_factura   date,
  fecha_pago      date,
  iva_pct         numeric(5,2) not null default 0,  -- LLC 0; COL 19 (editable)
  estado          text not null default 'por_facturar'
                    check (estado in ('pagado','facturado','anulado','por_facturar','programado')),
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create index if not exists idx_factura_mes on public.factura_mensual (mes, entidad);
create index if not exists idx_factura_cliente on public.factura_mensual (cliente_id);

comment on table public.factura_mensual is 'Facturación mensual por cliente (cuadro de ingresos de la madre): LLC USD + COL COP/IVA.';
