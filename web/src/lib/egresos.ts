import "server-only";
import { cache } from "react";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { calcLLC, calcCOL } from "@/lib/facturacion-calc";
import { primerDiaMes, mesActualISO } from "@/lib/facturacion";
import { calcularPnL, proyeccionLeadtionMes } from "@/lib/pnl";

export interface EgresoRow {
  id: number;
  mes: string;
  concepto: string;
  marca: string | null;
  fecha: string | null;
  valorUsd: number;
  valorCop: number | null;
  afectaUtilidad: boolean;
  categoria: string | null;
  subcategoria: string | null;
  automatico: boolean;
}

/**
 * Egresos automáticos del mes en curso/futuro. Dos partes:
 *  1) FIJOS (nómina + gastos): snapshot 1 sola vez (editable después; `resyncFijos
 *     MesActual` los refresca cuando cambias los catálogos).
 *  2) AUTO LEADTION (comisiones CS, referidos, API WhatsApp): se REFRESCAN en cada
 *     lectura desde su fuente (motor de comisiones, afiliados, clientes) para que
 *     estén siempre al día. No hace backfill de meses pasados.
 */
export const asegurarEgresosFijosDelMes = cache(async (mes: string): Promise<number> => {
  const primer = primerDiaMes(mes);

  // 0) COMISIONES EQUIPO COMERCIAL: egreso derivado de `comision_comercial` del mes.
  //    Aplica a CUALQUIER mes (una venta pasada deja su comisión en su propio mes),
  //    por eso va antes del corte de backfill. Es agencia-wide (NO Operación Leadtion).
  await consulta(`delete from public.egreso_mensual where mes = $1 and categoria = 'comision_comercial'`, [primer]);
  {
    // Una fila por comercial: concepto = su nombre, marca = "N cuentas".
    const cc = await consulta(
      `select co.nombre, count(*)::int n, coalesce(sum(cc.monto_usd),0)::float t
         from public.comision_comercial cc
         join public.colaboradores co on co.id = cc.colaborador_id
        where to_char(cc.mes,'YYYY-MM') = $1
        group by co.nombre order by t desc`,
      [mes.slice(0, 7)],
    );
    for (const row of cc as Record<string, unknown>[]) {
      const t = Number(row.t ?? 0);
      if (t <= 0) continue;
      await consulta(
        `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria)
         values ($1, $2, $3, $4, true, 'comision_comercial')`,
        [primer, String(row.nombre), `${Number(row.n)} cuenta${Number(row.n) === 1 ? "" : "s"}`, Math.round(t * 100) / 100],
      );
    }
  }

  if (primer < primerDiaMes(mesActualISO())) return 0; // no backfill histórico (fijos)
  const { cop: tasa } = await tasaUsdCop();

  // 1) FIJOS: snapshot 1 vez.
  const yaFijo = await consulta(`select 1 from public.egreso_mensual where mes = $1 and categoria = 'fijo' limit 1`, [primer]);
  if (yaFijo.length === 0) {
    await consulta(
      `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, valor_cop, afecta_utilidad, categoria, subcategoria)
       select $1, nombre, coalesce(area,'Equipo'),
              round((coalesce(case when to_char(fecha_inicio_contrato,'YYYY-MM')=to_char($1::date,'YYYY-MM') and valor_primer_mes is not null then valor_primer_mes else valor_nomina end,0)/$2)::numeric,2),
              coalesce(case when to_char(fecha_inicio_contrato,'YYYY-MM')=to_char($1::date,'YYYY-MM') and valor_primer_mes is not null then valor_primer_mes else valor_nomina end,0),
              true, 'fijo', 'nomina'
         from public.colaboradores where activo and coalesce(valor_nomina,0) > 0`,
      [primer, tasa],
    );
    // "share" = valor mensual × % que asume la empresa (seg. social 60%, etc.).
    await consulta(
      `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, valor_cop, afecta_utilidad, categoria, subcategoria)
       select $1, nombre, 'TRD',
          round(( (valor / case when recurrencia='anual' then 12 when recurrencia='diario' then (1.0/30) else 1 end)
                  * (coalesce(porcentaje_reparto,100)/100.0)
                  / case when moneda='COP' then $2 else 1 end )::numeric, 2),
          case when moneda='COP'
               then round(( (valor / case when recurrencia='anual' then 12 when recurrencia='diario' then (1.0/30) else 1 end)
                            * (coalesce(porcentaje_reparto,100)/100.0) )::numeric, 2)
               else null end,
          true, 'fijo', categoria
         from public.gasto_fijo
        where activo and afecta_utilidad and categoria <> 'paso_dinero'
          and (recurrencia='mensual' or (recurrencia='anual' and amortizar) or recurrencia='diario')`,
      [primer, tasa],
    );
  }

  // 2) AUTO LEADTION (solo mes en curso): comisiones CS, comisiones afiliados y API
  //    incluida se toman del P&L NATIVO de Leadtion (calcularPnL), así Egresos cuadra
  //    con el dashboard de Leadtion. NO se toma GoHighLevel (ya está en Herramientas)
  //    ni la nómina de pnl (la madre tiene la suya). Se refrescan en cada lectura.
  await consulta(`delete from public.egreso_mensual where mes = $1 and categoria in ('comision','referido','api')`, [primer]);
  if (mes.slice(0, 7) === mesActualISO()) {
    const pnl = await calcularPnL();
    if (pnl.costos.comisionesCS > 0) {
      await consulta(
        `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria)
         values ($1, 'Comisiones CS Team', 'Leadtion', $2, true, 'comision')`,
        [primer, pnl.costos.comisionesCS],
      );
    }
    if (pnl.costos.comisionesAfiliados > 0) {
      await consulta(
        `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria)
         values ($1, 'Comisiones afiliados (Leadtion)', 'Leadtion', $2, true, 'referido')`,
        [primer, pnl.costos.comisionesAfiliados],
      );
    }
    if (pnl.costos.apisIncluidas > 0) {
      await consulta(
        `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, afecta_utilidad, categoria)
         values ($1, $2, 'Leadtion', $3, true, 'api')`,
        [primer, `API WhatsApp (${pnl.costos.apisIncluidasCuentas} incluidas × $10)`, pnl.costos.apisIncluidas],
      );
    }
  }
  return 1;
});
/**
 * Al agregar una persona (colaborador) o un gasto fijo (herramienta/operativo) en
 * su catálogo madre, refleja esa línea en el MES EN CURSO si ese mes ya tiene el
 * snapshot de fijos (para que aparezca de una en Egresos). No toca meses pasados;
 * los meses futuros la toman solos al abrirse (asegurarEgresosFijosDelMes).
 */
export async function sincronizarFijoMesActual(tipo: "nomina" | "gasto", id: number): Promise<void> {
  const primer = primerDiaMes(mesActualISO());
  const ya = await consulta(`select 1 from public.egreso_mensual where mes = $1 and categoria = 'fijo' limit 1`, [primer]);
  if (ya.length === 0) return; // el mes aún no tiene snapshot: lo tomará al abrir Egresos
  const { cop: tasa } = await tasaUsdCop();
  if (tipo === "nomina") {
    await consulta(
      `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, valor_cop, afecta_utilidad, categoria, subcategoria)
       select $1, nombre, coalesce(area,'Equipo'),
              round((coalesce(case when to_char(fecha_inicio_contrato,'YYYY-MM')=to_char($1::date,'YYYY-MM') and valor_primer_mes is not null then valor_primer_mes else valor_nomina end,0)/$2)::numeric,2),
              coalesce(case when to_char(fecha_inicio_contrato,'YYYY-MM')=to_char($1::date,'YYYY-MM') and valor_primer_mes is not null then valor_primer_mes else valor_nomina end,0),
              true, 'fijo', 'nomina'
         from public.colaboradores where id = $3 and activo and coalesce(valor_nomina,0) > 0`,
      [primer, tasa, id],
    );
  } else {
    await consulta(
      `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, valor_cop, afecta_utilidad, categoria, subcategoria)
       select $1, nombre, 'TRD',
          round(( (valor / case when recurrencia='anual' then 12 when recurrencia='diario' then (1.0/30) else 1 end)
                  * (coalesce(porcentaje_reparto,100)/100.0) / case when moneda='COP' then $2 else 1 end )::numeric, 2),
          case when moneda='COP'
               then round(( (valor / case when recurrencia='anual' then 12 when recurrencia='diario' then (1.0/30) else 1 end)
                            * (coalesce(porcentaje_reparto,100)/100.0) )::numeric, 2)
               else null end,
          true, 'fijo', categoria
         from public.gasto_fijo
        where id = $3 and activo and afecta_utilidad and categoria <> 'paso_dinero'
          and (recurrencia='mensual' or (recurrencia='anual' and amortizar) or recurrencia='diario')`,
      [primer, tasa, id],
    );
  }
}

/**
 * Re-sincroniza los egresos FIJOS del MES EN CURSO con la fuente (colaboradores +
 * gasto_fijo). Se llama tras crear/editar/activar/eliminar en Nómina, Herramientas
 * u Operativos, para que los cambios (área, salario, valor, activo) se reflejen ya
 * en Egresos y en el total del mes. NO toca meses pasados. Solo actúa si el mes ya
 * fue snapshotteado (si no, `asegurarEgresosFijosDelMes` lo tomará fresco al abrir,
 * incluyendo comisiones/referidos).
 */
export async function resyncFijosMesActual(): Promise<void> {
  const primer = primerDiaMes(mesActualISO());
  const ya = await consulta(`select 1 from public.egreso_mensual where mes = $1 and categoria = 'fijo' limit 1`, [primer]);
  if (ya.length === 0) return;
  const { cop: tasa } = await tasaUsdCop();
  await consulta(`delete from public.egreso_mensual where mes = $1 and categoria = 'fijo'`, [primer]);
  await consulta(
    `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, valor_cop, afecta_utilidad, categoria, subcategoria)
     select $1, nombre, coalesce(area,'Equipo'), round((valor_nomina/$2)::numeric,2), valor_nomina, true, 'fijo', 'nomina'
       from public.colaboradores where activo and coalesce(valor_nomina,0) > 0`,
    [primer, tasa],
  );
  await consulta(
    `insert into public.egreso_mensual (mes, concepto, marca, valor_usd, valor_cop, afecta_utilidad, categoria, subcategoria)
     select $1, nombre, 'TRD',
        round(( (valor / case when recurrencia='anual' then 12 when recurrencia='diario' then (1.0/30) else 1 end)
                * (coalesce(porcentaje_reparto,100)/100.0)
                / case when moneda='COP' then $2 else 1 end )::numeric, 2),
        case when moneda='COP'
             then round(( (valor / case when recurrencia='anual' then 12 when recurrencia='diario' then (1.0/30) else 1 end)
                          * (coalesce(porcentaje_reparto,100)/100.0) )::numeric, 2)
             else null end,
        true, 'fijo', categoria
       from public.gasto_fijo
      where activo and afecta_utilidad and categoria <> 'paso_dinero'
        and (recurrencia='mensual' or (recurrencia='anual' and amortizar) or recurrencia='diario')`,
    [primer, tasa],
  );
}

export interface IngresoRow {
  id: number;
  mes: string;
  concepto: string;
  fecha: string | null;
  valorUsd: number;
  categoria: string | null;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const toISO = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function egresosDelMes(mes: string): Promise<EgresoRow[]> {
  const rows = await consulta(
    `select * from public.egreso_mensual where mes = $1 order by afecta_utilidad desc, valor_usd desc`,
    [primerDiaMes(mes)],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id), mes: toISO(r.mes)!.slice(0, 7), concepto: String(r.concepto),
    marca: (r.marca as string) ?? null, fecha: toISO(r.fecha), valorUsd: num(r.valor_usd),
    valorCop: r.valor_cop != null ? Number(r.valor_cop) : null,
    afectaUtilidad: Boolean(r.afecta_utilidad), categoria: (r.categoria as string) ?? null,
    subcategoria: (r.subcategoria as string) ?? null,
    automatico: Boolean(r.automatico),
  }));
}

export async function otrosIngresosDelMes(mes: string): Promise<IngresoRow[]> {
  const rows = await consulta(
    `select * from public.ingreso_mensual where mes = $1 order by valor_usd desc`,
    [primerDiaMes(mes)],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id), mes: toISO(r.mes)!.slice(0, 7), concepto: String(r.concepto),
    fecha: toISO(r.fecha), valorUsd: num(r.valor_usd), categoria: (r.categoria as string) ?? null,
  }));
}

export interface ResumenMes {
  tasa: number;
  ingresos: {
    clientesUsa: number;
    clientesCol: number;
    otros: IngresoRow[];
    /** Ingreso Leadtion de membresías + soporte (licencias estándar y con soporte);
     *  NO incluye servicios (esos se facturan por la LLC). = dato del dashboard. */
    leadtion: number;
    /** Ganancia de las APIs de WhatsApp vendidas ($2 por cuenta). Automático desde Membresías. */
    apiVendida: number;
    apiVendidaCuentas: number;
    /** Reselling reportado (manual, categoría 'reselling' en otros ingresos). */
    reselling: number;
    total: number;
    porFuente: { etiqueta: string; valor: number }[];
  };
  egresos: {
    afectanUtilidad: EgresoRow[];
    saleDeCaja: EgresoRow[];
    totalAfectan: number;
    totalCaja: number;
  };
  utilidadBruta: number;
  diezmo: number;
  utilidadNeta: number;
  margen: number;
  /** Inversiones y gastos con la utilidad (incluye diezmo) según el cuadro oficial
   *  (caja_mensual) si el mes tiene fila; si no, el total de caja computado. */
  cajaOficial: number;
}

const DIEZMO_PCT = 0.1;

/**
 * Resumen del mes (cuadro madre): ingresos por cliente (facturas neto) + otros
 * ingresos, menos egresos que afectan la utilidad → utilidad bruta − diezmo
 * (automático 10%, sale de caja) → utilidad neta. Los egresos "sale de caja"
 * (incluido el diezmo) no bajan la utilidad; bajan la caja.
 */
export async function resumenDelMes(mes: string): Promise<ResumenMes> {
  await asegurarEgresosFijosDelMes(mes); // fijos del mes en curso/futuro (idempotente)
  const primer = primerDiaMes(mes);
  const [facturas, fx, otros, egresos, cajaSnap] = await Promise.all([
    consulta(`select entidad, facturado, medio, iva_pct, estado, tasa from public.factura_mensual where mes = $1`, [primer]),
    tasaUsdCop(),
    otrosIngresosDelMes(mes),
    egresosDelMes(mes),
    consulta(`select inversiones from public.caja_mensual where mes = $1`, [primer]),
  ]);
  const tasa = fx.cop;

  let clientesUsa = 0, clientesCol = 0;
  for (const f of facturas as Record<string, unknown>[]) {
    if (String(f.estado) === "anulado") continue;
    if (f.entidad === "LLC") clientesUsa += calcLLC(num(f.facturado), (f.medio as string) ?? null).neto;
    else clientesCol += calcCOL(num(f.facturado), num(f.iva_pct), f.tasa != null ? Number(f.tasa) : tasa).netoUsd;
  }
  clientesUsa = r2(clientesUsa); clientesCol = r2(clientesCol);
  // Reselling (manual) va en su propia línea; el resto de "otros" queda aparte.
  const reselling = r2(otros.filter((o) => o.categoria === "reselling").reduce((s, o) => s + o.valorUsd, 0));
  const otrosSinResel = otros.filter((o) => o.categoria !== "reselling");
  const otrosTotal = r2(otrosSinResel.reduce((s, x) => s + x.valorUsd, 0));

  // API WhatsApp vendida: ganancia neta ($2/cuenta) de las cuentas 'vendida' activas.
  // Automático desde el maestro Leadtion; solo mes en curso/futuro (es foto de hoy).
  let apiVendida = 0, apiVendidaCuentas = 0;
  if (mes.slice(0, 7) >= mesActualISO()) {
    const av = await consulta(
      `select coalesce(sum(api_valor) filter (where api_estado='vendida' and estado_actual='activo' and es_leadtion),0)::float ing,
              count(*) filter (where api_estado='vendida' and estado_actual='activo' and es_leadtion)::int n
         from public.clientes`,
    );
    const ing = Number((av[0] as Record<string, unknown>)?.ing ?? 0);
    apiVendidaCuentas = Number((av[0] as Record<string, unknown>)?.n ?? 0);
    apiVendida = r2(ing - apiVendidaCuentas * 10); // ganancia = cobrado − $10 de costo
  }

  // Ingreso Leadtion de MEMBRESÍAS + SOPORTE (licencias): estándar + con soporte de
  // todas las cuentas activas. Es EXACTAMENTE el dato del dashboard de Membresías.
  // NO incluye servicios (Agente IA / Reactivación): esos se facturan por la LLC y ya
  // están en la Facturación del mes (contarlos aquí duplicaría). Las licencias/soporte
  // nunca van en Facturación, así que no hay doble conteo. Solo mes en curso/futuro.
  let leadtion = 0;
  if (mes.slice(0, 7) >= mesActualISO()) {
    const lineas = await proyeccionLeadtionMes(mes.slice(0, 7));
    leadtion = r2(
      lineas
        .filter((l) => l.categoria === "estandar" || l.categoria === "soporte")
        .reduce((s, l) => s + l.valor, 0),
    );
  }
  const totalIngresos = r2(clientesUsa + clientesCol + otrosTotal + reselling + leadtion + apiVendida);

  const afectan = egresos.filter((e) => e.afectaUtilidad);
  const caja = egresos.filter((e) => !e.afectaUtilidad);
  const totalAfectan = r2(afectan.reduce((s, e) => s + e.valorUsd, 0));

  const utilidadBruta = r2(totalIngresos - totalAfectan);
  const diezmo = r2(Math.max(0, utilidadBruta) * DIEZMO_PCT);
  const utilidadNeta = r2(utilidadBruta - diezmo);
  const margen = totalIngresos > 0 ? r2((utilidadNeta / totalIngresos) * 100) : 0;

  // Diezmo automático como línea "sale de caja" (virtual, no se guarda).
  const diezmoRow: EgresoRow = {
    id: -1, mes: mes.slice(0, 7), concepto: "Diezmo (10% sobre utilidad)", marca: "TRD",
    fecha: null, valorUsd: diezmo, valorCop: null, afectaUtilidad: false, categoria: "diezmo", subcategoria: null, automatico: true,
  };
  const totalCaja = r2(caja.reduce((s, e) => s + e.valorUsd, 0) + diezmo);
  const cajaOficial = (cajaSnap as Record<string, unknown>[]).length
    ? num((cajaSnap as Record<string, unknown>[])[0]!.inversiones) : totalCaja;

  return {
    tasa,
    ingresos: {
      clientesUsa, clientesCol, otros: otrosSinResel, leadtion, apiVendida, apiVendidaCuentas, reselling, total: totalIngresos,
      porFuente: [
        { etiqueta: "Clientes USA", valor: clientesUsa },
        { etiqueta: "Clientes Colombia", valor: clientesCol },
        { etiqueta: "Leadtion (membresías + soporte)", valor: leadtion },
        { etiqueta: "API WhatsApp vendida", valor: apiVendida },
        { etiqueta: "Reselling (Leadtion)", valor: reselling },
        ...otrosSinResel.map((o) => ({ etiqueta: o.concepto, valor: o.valorUsd })),
      ].filter((x) => x.valor > 0),
    },
    egresos: { afectanUtilidad: afectan, saleDeCaja: [diezmoRow, ...caja], totalAfectan, totalCaja },
    utilidadBruta, diezmo, utilidadNeta, margen, cajaOficial,
  };
}

export interface FilaCaja { mes: string; ingresos: number; egresos: number; utilidad: number; inversiones: number }
export interface FlujoCaja { filas: FilaCaja[]; utilAcum: number; invAcum: number; cajaDisponible: number }

/**
 * Caja LLC (espejo del cuadro del usuario). Por mes: ingresos, egresos,
 * utilidad (ingresos−egresos) e inversiones (salidas de caja). Usa la tabla
 * caja_mensual si el mes tiene fila; si no, lo calcula del sistema.
 * Caja disponible = Σ utilidad − Σ inversiones (desde enero).
 */
export async function flujoCaja(mesFin: string, desde = "2026-01"): Promise<FlujoCaja> {
  const [dy, dm] = desde.split("-").map(Number);
  const [fy, fm] = mesFin.split("-").map(Number);
  const meses: string[] = [];
  let y = dy!, m = dm!, guard = 0;
  while ((y < fy!) || (y === fy && m <= fm!)) {
    meses.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
    if (++guard > 60) break;
  }
  const snap = await consulta(`select to_char(mes,'YYYY-MM') mes, ingresos, egresos, inversiones from public.caja_mensual`);
  const porMes = new Map<string, { ingresos: number; egresos: number; inversiones: number }>();
  for (const s of snap as Record<string, unknown>[]) {
    porMes.set(String(s.mes), { ingresos: num(s.ingresos), egresos: num(s.egresos), inversiones: num(s.inversiones) });
  }

  const filas: FilaCaja[] = [];
  let utilAcum = 0, invAcum = 0;
  for (const mm of meses) {
    let ingresos: number, egresos: number, inversiones: number;
    const s = porMes.get(mm);
    if (s) { ingresos = s.ingresos; egresos = s.egresos; inversiones = s.inversiones; }
    else {
      const r = await resumenDelMes(mm);
      ingresos = r.ingresos.total; egresos = r.egresos.totalAfectan; inversiones = r.egresos.totalCaja;
    }
    const utilidad = r2(ingresos - egresos);
    utilAcum = r2(utilAcum + utilidad);
    invAcum = r2(invAcum + inversiones);
    filas.push({ mes: mm, ingresos, egresos, utilidad, inversiones });
  }
  return { filas, utilAcum, invAcum, cajaDisponible: r2(utilAcum - invAcum) };
}

export interface PuntoMes { mes: string; ingresos: number; neta: number; egresosTotal: number; egresosUtilidad: number }

/** Serie por mes (últimos n) para las tendencias de ingresos y de egresos. */
export async function tendenciaMensual(mesFin: string, n = 8): Promise<PuntoMes[]> {
  const out: PuntoMes[] = [];
  const [ay, am] = primerDiaMes(mesFin).split("-").map(Number);
  const meses: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ay!, am! - 1 - i, 1));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  for (const m of meses) {
    const r = await resumenDelMes(m);
    out.push({
      mes: m, ingresos: r.ingresos.total, neta: r.utilidadNeta,
      egresosTotal: r2(r.egresos.totalAfectan + r.egresos.totalCaja), egresosUtilidad: r.egresos.totalAfectan,
    });
  }
  return out;
}
