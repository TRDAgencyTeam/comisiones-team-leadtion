import "server-only";
import { consulta } from "@/lib/db";

/**
 * Módulo Comercial (equipo interno). MVP: el comercial gana 10% por cada cliente
 * NUEVO que trae, sobre la venta NETA = facturado − comisión de pasarela.
 * Aplica una sola vez (primera venta) y solo si el admin lo marca al crear el cliente.
 */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const PCT_COMERCIAL = 10;

/** Costo de pasarela por medio de pago. Editable aquí (Mauro confirma los demás
 *  medios más adelante). Stripe: 2.9% + $0.30; Zelle/Bancolombia/Nequi: $0. */
export const COSTO_PASARELA: Record<string, { pct: number; fijo: number }> = {
  stripe: { pct: 2.9, fijo: 0.3 },
  zelle: { pct: 0, fijo: 0 },
  bancolombia: { pct: 0, fijo: 0 },
  nequi: { pct: 0, fijo: 0 },
};

/** Comisión de pasarela para un cobro dado su medio y monto. */
export function costoPasarela(medio: string | null, monto: number): number {
  if (monto <= 0) return 0;
  const c = COSTO_PASARELA[(medio ?? "").toLowerCase()] ?? { pct: 0, fijo: 0 };
  return round2(monto * (c.pct / 100) + c.fijo);
}

export interface Comercial { id: number; nombre: string }

/** Colaboradores marcados como comerciales (para el toggle en Facturación). */
export async function comercialesActivos(): Promise<Comercial[]> {
  const rows = await consulta(
    `select id, nombre from public.colaboradores where es_comercial and activo order by nombre`,
  );
  return rows.map((r) => ({ id: Number(r.id), nombre: String(r.nombre) }));
}

/**
 * Registra la comisión comercial de una venta (alta de cliente NUEVO). Idempotente
 * por factura (una comisión por alta). Calcula 10% sobre la venta neta.
 */
export async function registrarComisionComercial(args: {
  clienteId: number;
  facturaId: number;
  colaboradorId: number;
  mes: string; // 'YYYY-MM' o 'YYYY-MM-01'
  facturado: number;
  medio: string | null;
}): Promise<void> {
  const { clienteId, facturaId, colaboradorId, facturado, medio } = args;
  if (!colaboradorId || facturado <= 0) return;
  const pasarela = costoPasarela(medio, facturado);
  const neta = round2(facturado - pasarela);
  const monto = round2((neta * PCT_COMERCIAL) / 100);
  if (monto <= 0) return;
  const primer = `${args.mes.slice(0, 7)}-01`;
  await consulta(
    `insert into public.comision_comercial
       (cliente_id, factura_id, colaborador_id, mes, base_facturado, pasarela, base_neta, pct, monto_usd, estado)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pendiente')
     on conflict (factura_id) do nothing`,
    [clienteId, facturaId, colaboradorId, primer, round2(facturado), pasarela, neta, PCT_COMERCIAL, monto],
  );
}

export interface FilaComisionComercial {
  id: number;
  clienteNombre: string;
  colaboradorNombre: string;
  mes: string;
  baseFacturado: number;
  pasarela: number;
  baseNeta: number;
  montoUsd: number;
  estado: string;
  fechaPago: string | null;
}

/** Comisiones comerciales de un mes ('YYYY-MM') con nombres. */
export async function comisionesComercialMes(mes: string): Promise<FilaComisionComercial[]> {
  const rows = await consulta(
    `select cc.id, coalesce(cl.nombre, '—') cliente, co.nombre colaborador,
            to_char(cc.mes,'YYYY-MM') mes, cc.base_facturado, cc.pasarela, cc.base_neta,
            cc.monto_usd, cc.estado, to_char(cc.fecha_pago,'YYYY-MM-DD') fecha_pago
       from public.comision_comercial cc
       left join public.clientes cl on cl.id = cc.cliente_id
       join public.colaboradores co on co.id = cc.colaborador_id
      where to_char(cc.mes,'YYYY-MM') = $1
      order by cc.creado_en desc`,
    [mes],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    clienteNombre: String(r.cliente),
    colaboradorNombre: String(r.colaborador),
    mes: String(r.mes),
    baseFacturado: Number(r.base_facturado),
    pasarela: Number(r.pasarela),
    baseNeta: Number(r.base_neta),
    montoUsd: Number(r.monto_usd),
    estado: String(r.estado),
    fechaPago: r.fecha_pago ? String(r.fecha_pago) : null,
  }));
}

/** Total (USD) de comisión comercial de un mes — alimenta el egreso de la madre. */
export async function totalComercialMes(mes: string): Promise<{ total: number; n: number }> {
  const rows = await consulta(
    `select coalesce(sum(monto_usd),0)::float t, count(*)::int n
       from public.comision_comercial where to_char(mes,'YYYY-MM') = $1`,
    [mes],
  );
  return { total: round2(Number(rows[0]?.t ?? 0)), n: Number(rows[0]?.n ?? 0) };
}
