import "server-only";
import { consulta } from "@/lib/db";

/** Períodos de soporte de un cliente (nivel de soporte activo por un rango). */

export interface SoporteRow {
  id: number;
  valor: number;
  desde: string;        // YYYY-MM-DD
  hasta: string | null; // null = indefinido
  nota: string | null;
}

const isoDia = (v: unknown): string | null =>
  v == null ? null : (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

export async function soportesDeCliente(clienteId: number): Promise<SoporteRow[]> {
  const rows = await consulta(
    `select id, valor, desde, hasta, nota from public.cliente_soportes
      where cliente_id=$1 order by desde`,
    [clienteId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    valor: Number(r.valor),
    desde: isoDia(r.desde)!,
    hasta: isoDia(r.hasta),
    nota: (r.nota as string) ?? null,
  }));
}

export async function obtenerSoporte(id: number): Promise<(SoporteRow & { clienteId: number }) | null> {
  const rows = await consulta(
    `select id, cliente_id, valor, desde, hasta, nota from public.cliente_soportes where id=$1`,
    [id],
  );
  if (rows.length === 0) return null;
  const r = rows[0]!;
  return {
    id: Number(r.id),
    clienteId: Number(r.cliente_id),
    valor: Number(r.valor),
    desde: isoDia(r.desde)!,
    hasta: isoDia(r.hasta),
    nota: (r.nota as string) ?? null,
  };
}

/** ¿Hay un soporte activo cubriendo un mes 'YYYY-MM'? Devuelve su valor o null. */
export function soporteEnMes(soportes: SoporteRow[], mesYYYYMM: string, hoyYYYYMM: string): number | null {
  for (const s of soportes) {
    const d = s.desde.slice(0, 7);
    const h = s.hasta ? s.hasta.slice(0, 7) : hoyYYYYMM; // indefinido = hasta hoy
    if (mesYYYYMM >= d && mesYYYYMM <= h) return s.valor;
  }
  return null;
}
