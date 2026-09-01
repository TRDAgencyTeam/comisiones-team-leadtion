import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { calcLLC, calcCOL } from "@/lib/facturacion-calc";

export interface FacturaRow {
  id: number;
  mes: string;
  entidad: "LLC" | "COL";
  clienteId: number | null;
  clienteNombre: string;
  mrr: number | null;
  reserva: boolean;
  servicios: string | null;
  precioDesglose: string | null;
  facturado: number;
  medio: string | null;
  fechaFactura: string | null;
  fechaPago: string | null;
  ivaPct: number;
  estado: string;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const toISO = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

export function primerDiaMes(mes: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(mes);
  const h = new Date();
  return m ? `${m[1]}-${m[2]}-01` : `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-01`;
}
export function mesAnteriorISO(mes: string): string {
  const [a, m] = primerDiaMes(mes).split("-").map(Number);
  const d = new Date(a!, (m! - 1) - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mapRow(r: Record<string, unknown>): FacturaRow {
  return {
    id: Number(r.id),
    mes: toISO(r.mes)!.slice(0, 7),
    entidad: (r.entidad as "LLC" | "COL") ?? "LLC",
    clienteId: r.cliente_id != null ? Number(r.cliente_id) : null,
    clienteNombre: String(r.cliente_nombre),
    mrr: r.mrr != null ? Number(r.mrr) : null,
    reserva: Boolean(r.reserva),
    servicios: (r.servicios as string) ?? null,
    precioDesglose: (r.precio_desglose as string) ?? null,
    facturado: num(r.facturado),
    medio: (r.medio as string) ?? null,
    fechaFactura: toISO(r.fecha_factura),
    fechaPago: toISO(r.fecha_pago),
    ivaPct: num(r.iva_pct),
    estado: String(r.estado),
  };
}

export interface TotalesFactura {
  tasa: number;
  llc: { facturado: number; pasarela: number; neto: number; count: number };
  col: { facturado: number; iva: number; copConIva: number; netoUsd: number; count: number };
  ingresosUsd: number;
}

export async function facturasDelMes(mes: string): Promise<{ llc: FacturaRow[]; col: FacturaRow[]; totales: TotalesFactura }> {
  const primer = primerDiaMes(mes);
  const [rows, fx] = await Promise.all([
    consulta(
      `select * from public.factura_mensual where mes = $1
        order by entidad, (mrr is null), mrr, cliente_nombre`, [primer]),
    tasaUsdCop(),
  ]);
  const filas = rows.map(mapRow);
  const llc = filas.filter((f) => f.entidad === "LLC");
  const col = filas.filter((f) => f.entidad === "COL");
  const tasa = fx.cop;

  const tLlc = { facturado: 0, pasarela: 0, neto: 0, count: llc.length };
  for (const f of llc) {
    if (f.estado === "anulado") continue;
    const c = calcLLC(f.facturado, f.medio);
    tLlc.facturado += f.facturado; tLlc.pasarela += c.pasarela; tLlc.neto += c.neto;
  }
  const tCol = { facturado: 0, iva: 0, copConIva: 0, netoUsd: 0, count: col.length };
  for (const f of col) {
    if (f.estado === "anulado") continue;
    const c = calcCOL(f.facturado, f.ivaPct, tasa);
    tCol.facturado += f.facturado; tCol.iva += c.iva; tCol.copConIva += c.copConIva; tCol.netoUsd += c.netoUsd;
  }
  return {
    llc, col,
    totales: { tasa, llc: tLlc, col: tCol, ingresosUsd: Math.round((tLlc.neto + tCol.netoUsd) * 100) / 100 },
  };
}

export async function obtenerFactura(id: number): Promise<FacturaRow | null> {
  const rows = await consulta(`select * from public.factura_mensual where id = $1`, [id]);
  return rows.length ? mapRow(rows[0]!) : null;
}

/** Clientes existentes (para enlazar la factura con un cliente Leadtion/Membresías). */
export async function clientesParaFactura(): Promise<{ id: number; nombre: string }[]> {
  const rows = await consulta(`select id, nombre from public.clientes order by nombre`);
  return rows.map((r) => ({ id: Number(r.id), nombre: String(r.nombre) }));
}
