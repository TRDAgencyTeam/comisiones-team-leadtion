import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { primerDiaMes } from "@/lib/facturacion";
import { resumenDelMes } from "@/lib/egresos";

/**
 * Liquidación mensual USA → Colombia (TRD Investment → Ebenezer).
 *
 * Qué se cubre por defecto (en COP):
 *  - Nómina COMPLETA: la cuenta de cobro de REG (incluye comisión, adicionales y
 *    freelance). Si REG del mes aún no existe, la nómina de Egresos.
 *  - Operativos fijos (arriendo, seguridad social, contadora, servicios…).
 *  - Cuota del crédito.
 *  - Comisiones (CS si no van ya en REG, afiliados, equipo comercial).
 *  - Gastos de caja (inversiones, grabaciones, cuotas…).
 *  - Diezmo: el del Resumen (10% de la utilidad bruta), convertido a COP.
 *  - Gastos del mes pagados con un medio de COLOMBIA (TC Mauricio / Nu / María,
 *    Ahorros Ebenezer).
 *  - Elite Agent (Mauricio Ovalle): casilla aparte en USD → COP a la tasa de cálculo.
 * Fuera por defecto: herramientas y hosting (USD), gastos variables sin medio de
 * Colombia (representación…), API WhatsApp. Todo se puede incluir/excluir a mano
 * (`ajustes`). El giro NO es egreso: no toca la utilidad.
 */

export interface Partida {
  clave: string;
  grupo: string;
  concepto: string;
  detalle: string | null;
  cop: number;
  porDefecto: boolean;
  incluida: boolean;
}
export interface LineaLiq { id: number; origen: "manual" | "adicional" | "auto"; grupo: string; concepto: string; cop: number }
export interface Liquidacion {
  id: number; mes: string; estado: "borrador" | "cerrada"; tasaCalculo: number | null; ajustes: Record<string, boolean>;
  fechaGiro: string | null; usdEnviado: number | null; tasaBanco: number | null; copRecibido: number | null;
  comisionUsd: number | null; copNecesario: number | null; copAdicional: number | null; notas: string | null;
  eliteUsd: number | null; eliteCop: number | null;
}
export interface VistaLiquidacion {
  mes: string;
  liq: Liquidacion | null;
  tasaHoy: number;
  tasaCalculo: number;
  partidas: Partida[];          // auto (borrador: en vivo; cerrada: congeladas)
  manuales: LineaLiq[];
  adicionales: LineaLiq[];
  fuenteNomina: "reg" | "egresos";
  copNecesario: number;
  copAdicional: number;
  /** Elite Agent (Mauricio Ovalle): se digita en USD; COP = USD × tasa de cálculo (congelado al cerrar). */
  eliteUsd: number;
  eliteCop: number;
  copTotal: number;
  usdEstimado: number;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numN = (v: unknown): number | null => (v == null ? null : Number(v));
const iso = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
const r2 = (n: number) => Math.round(n * 100) / 100;

function mapLiq(r: Record<string, unknown>): Liquidacion {
  return {
    id: Number(r.id), mes: iso(r.mes)!.slice(0, 7), estado: r.estado as "borrador" | "cerrada",
    tasaCalculo: numN(r.tasa_calculo), ajustes: (r.ajustes as Record<string, boolean>) ?? {},
    fechaGiro: iso(r.fecha_giro), usdEnviado: numN(r.usd_enviado), tasaBanco: numN(r.tasa_banco),
    copRecibido: numN(r.cop_recibido), comisionUsd: numN(r.comision_usd),
    copNecesario: numN(r.cop_necesario), copAdicional: numN(r.cop_adicional), notas: (r.notas as string) ?? null,
    eliteUsd: numN(r.elite_usd), eliteCop: numN(r.elite_cop),
  };
}

export async function obtenerLiquidacion(mes: string): Promise<Liquidacion | null> {
  const rows = await consulta(`select * from public.liquidacion where mes = $1`, [primerDiaMes(mes)]);
  return rows.length ? mapLiq(rows[0] as Record<string, unknown>) : null;
}

/** Partidas propuestas del mes, calculadas en vivo desde REG y Egresos. */
export async function partidasPropuestas(mes: string, tasa: number, ajustes: Record<string, boolean> = {}):
  Promise<{ partidas: Partida[]; fuenteNomina: "reg" | "egresos" }> {
  const primer = primerDiaMes(mes);
  // Primero el Resumen (diezmo = 10% de la utilidad; no se guarda como egreso). Va
  // ANTES de leer egresos porque regenera las filas automáticas de Leadtion
  // (comisiones, referidos, API): leerlas en paralelo las puede encontrar borradas.
  const resumen = await resumenDelMes(mes);
  const [reg, egresos, mediosCO] = await Promise.all([
    consulta(
      `select r.id, coalesce(co.nombre, r.nombre_libre, 'Freelance') nombre, r.colaborador_id is null freelance,
              coalesce(r.valor_cuenta_cobro,0)::float cop, coalesce(r.comision,0)::float comision, coalesce(r.adicional,0)::float adicional
         from public.reg_pago r left join public.colaboradores co on co.id = r.colaborador_id
        where r.mes = $1 and coalesce(r.valor_cuenta_cobro,0) > 0
        order by r.valor_cuenta_cobro desc`,
      [primer],
    ),
    consulta(
      `select id, concepto, marca, categoria, subcategoria, afecta_utilidad, medio_pago,
              valor_usd::float usd, valor_cop::float cop
         from public.egreso_mensual where mes = $1 and coalesce(categoria,'') not in ('ajuste')
        order by valor_usd desc`,
      [primer],
    ),
    consulta(`select nombre from public.medio_pago where pais = 'CO'`),
  ]);
  const co = new Set((mediosCO as Record<string, unknown>[]).map((r) => String(r.nombre)));
  const usaReg = reg.length > 0;
  const partidas: Partida[] = [];
  const push = (p: Omit<Partida, "incluida">) =>
    partidas.push({ ...p, incluida: ajustes[p.clave] ?? p.porDefecto });

  // 1) Nómina completa (REG) — incluye comisión CS, adicionales y freelance.
  for (const r of reg as Record<string, unknown>[]) {
    const extra = [num(r.comision) > 0 ? "con comisión" : null, num(r.adicional) > 0 ? "con adicional" : null, r.freelance ? "freelance" : null].filter(Boolean).join(" · ");
    push({ clave: `reg:${r.id}`, grupo: "Nómina (cuenta de cobro completa)", concepto: String(r.nombre), detalle: extra || null, cop: r2(num(r.cop)), porDefecto: true });
  }

  for (const e of egresos as Record<string, unknown>[]) {
    const cat = (e.categoria as string) ?? "", sub = (e.subcategoria as string) ?? "";
    const cop = e.cop != null && num(e.cop) > 0 ? num(e.cop) : r2(num(e.usd) * tasa);
    const medio = (e.medio_pago as string) ?? null;
    // Las filas automáticas (comisiones, referidos, API, comercial) se borran y se
    // recrean en cada cálculo (cambian de id): su clave va por categoría + concepto
    // para que incluir/excluir a mano se conserve.
    const regenerada = ["comision", "referido", "api", "comision_comercial"].includes(cat);
    const clave = regenerada ? `auto:${cat}:${String(e.concepto).slice(0, 100)}` : `eg:${e.id}`;
    const base = { clave, concepto: String(e.concepto), cop: r2(cop) };
    if (cat === "fijo" && sub === "nomina") {
      if (usaReg) continue; // la nómina sale de REG (completa)
      push({ ...base, grupo: "Nómina (Egresos · REG aún no generado)", detalle: (e.marca as string) ?? null, porDefecto: true });
    } else if (cat === "fijo" && (sub === "servicio_publico" || sub === "otro")) {
      push({ ...base, grupo: "Operativos fijos", detalle: medio, porDefecto: true });
    } else if (cat === "fijo" && sub === "credito") {
      push({ ...base, grupo: "Crédito", detalle: "cuota mensual", porDefecto: true });
    } else if (cat === "comision" && usaReg) {
      continue; // ya va dentro de la cuenta de cobro de REG
    } else if (["comision", "referido", "comision_comercial"].includes(cat)) {
      // Comisiones (CS, afiliados, equipo comercial): se pagan desde Colombia.
      push({ ...base, grupo: "Comisiones", detalle: (e.marca as string) ?? null, porDefecto: true });
    } else if (!e.afecta_utilidad) {
      // Gastos de caja (inversiones, grabaciones, cuotas…): se cubren desde Colombia.
      push({ ...base, grupo: "Gastos de caja", detalle: medio, porDefecto: true });
    } else {
      // Resto del mes: entra solo si se pagó con un medio de Colombia.
      const pagoCO = medio != null && co.has(medio);
      const grupo = pagoCO ? "Gastos pagados en Colombia" : "Otros egresos del mes (no incluidos)";
      const motivo = medio ? (pagoCO ? medio : `${medio} (USA)`) : "sin medio de pago";
      push({ ...base, grupo, detalle: motivo, porDefecto: pagoCO });
    }
  }
  // Diezmo: el mismo del Resumen (10% sobre la utilidad bruta, en USD), pagado en COP.
  const diezmoUsd = resumen.diezmo;
  push({
    clave: "diezmo", grupo: "Diezmo", concepto: "Diezmo (10% de la utilidad del mes)",
    detalle: diezmoUsd > 0
      ? `${new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD" }).format(diezmoUsd)} × tasa de cálculo`
      : "utilidad del mes negativa o en cero: no hay diezmo",
    cop: Math.round(diezmoUsd * tasa), porDefecto: true,
  });
  return { partidas, fuenteNomina: usaReg ? "reg" : "egresos" };
}

async function lineas(liqId: number): Promise<LineaLiq[]> {
  const rows = await consulta(
    `select id, origen, grupo, concepto, cop::float cop from public.liquidacion_item where liquidacion_id = $1 order by orden, id`,
    [liqId],
  );
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id), origen: r.origen as LineaLiq["origen"], grupo: String(r.grupo), concepto: String(r.concepto), cop: num(r.cop),
  }));
}

export async function vistaLiquidacion(mes: string): Promise<VistaLiquidacion> {
  const [liq, fx] = await Promise.all([obtenerLiquidacion(mes), tasaUsdCop()]);
  const tasaCalculo = liq?.tasaCalculo ?? fx.cop;
  const items = liq ? await lineas(liq.id) : [];
  const manuales = items.filter((i) => i.origen === "manual");
  const adicionales = items.filter((i) => i.origen === "adicional");

  let partidas: Partida[]; let fuenteNomina: "reg" | "egresos" = "reg";
  if (liq?.estado === "cerrada") {
    // Congeladas: lo que se liquidó, aunque después cambien los egresos.
    partidas = items.filter((i) => i.origen === "auto").map((i) => ({
      clave: `item:${i.id}`, grupo: i.grupo, concepto: i.concepto, detalle: null, cop: i.cop, porDefecto: true, incluida: true,
    }));
  } else {
    ({ partidas, fuenteNomina } = await partidasPropuestas(mes, tasaCalculo, liq?.ajustes ?? {}));
  }
  const copNecesario = r2(partidas.filter((p) => p.incluida).reduce((s, p) => s + p.cop, 0) + manuales.reduce((s, m) => s + m.cop, 0));
  const copAdicional = r2(adicionales.reduce((s, a) => s + a.cop, 0));
  // Elite Agent: borrador = en vivo (USD × tasa de cálculo); cerrada = COP congelado.
  const eliteUsd = liq?.eliteUsd ?? 0;
  const eliteCop = liq?.estado === "cerrada" && liq.eliteCop != null ? liq.eliteCop : Math.round(eliteUsd * tasaCalculo);
  const copTotal = r2(copNecesario + eliteCop + copAdicional);
  return {
    mes: mes.slice(0, 7), liq, tasaHoy: fx.cop, tasaCalculo, partidas, manuales, adicionales, fuenteNomina,
    copNecesario, copAdicional, eliteUsd, eliteCop, copTotal, usdEstimado: tasaCalculo > 0 ? r2(copTotal / tasaCalculo) : 0,
  };
}

export interface FilaHistorial {
  mes: string; estado: "borrador" | "cerrada"; fechaGiro: string | null; usdEnviado: number | null; tasaBanco: number | null;
  copRecibido: number | null; copNecesario: number | null; copAdicional: number | null; tasaCalculo: number | null;
  eliteCop: number | null;
}

/** Todas las liquidaciones (nuevo → viejo) para el historial y la gráfica. */
export async function historialLiquidaciones(): Promise<FilaHistorial[]> {
  const rows = await consulta(`select * from public.liquidacion order by mes desc`);
  return (rows as Record<string, unknown>[]).map((r) => {
    const l = mapLiq(r);
    return {
      mes: l.mes, estado: l.estado, fechaGiro: l.fechaGiro, usdEnviado: l.usdEnviado, tasaBanco: l.tasaBanco,
      copRecibido: l.copRecibido, copNecesario: l.copNecesario, copAdicional: l.copAdicional, tasaCalculo: l.tasaCalculo,
      eliteCop: l.eliteCop,
    };
  });
}
