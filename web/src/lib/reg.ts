import "server-only";
import { consulta } from "@/lib/db";
import { calcularRetenciones, uvtDeAnio, TARIFA_ICA_DEFAULT } from "@/lib/retenciones";
import { cargarResultados, resultadoDeColaborador, corteFinDeMes } from "@/lib/comisiones";
import { tasaUsdCop } from "@/lib/fx";
import { GMF, IVA, COSTO_TRANSFERENCIA_OTRO, bancoSinCosto } from "@/lib/catalogos";

/**
 * Datos del módulo REG (registro contable). Combina los colaboradores activos con
 * su registro de pago del mes. El pago se desglosa en pago fijo + adicional +
 * comisión CS (sincronizada desde Leadtion, convertida a COP). Sobre el total se
 * calculan ICA y renta.
 */

export interface RenglonReg {
  pagoId: number | null;
  colaboradorId: number | null;
  nombre: string;
  esFreelance: boolean;
  email: string | null;
  banco: string | null;
  identificacion: string | null;
  actividadCiiu: string | null;
  tarifaIcaMil: number;
  valorNomina: number;
  valorMesAnterior: number;
  /** Pago fijo sugerido (pago del mes si existe; si no, la base de nómina). */
  pagoFijo: number;
  adicional: number;
  adicionalDesc: string | null;
  /** Comisión CS del mes en COP (sincronizada; entra al total). */
  comision: number;
  /** Total = pago fijo + adicional + comisión (lo guardado). */
  valorCuentaCobro: number;
  aporteSalud: number;
  aportePension: number;
  reteIca: number;
  reteRenta: number;
  valorGirar: number;
  costoTransferencia: number;
  ckCorreo: boolean;
  ckDrive: boolean;
  ckRegistro: boolean;
  ckPagado: boolean;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));

/** Normaliza un mes "YYYY-MM" al primer día "YYYY-MM-01". */
export function primerDiaMes(mes: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(mes);
  const hoy = new Date();
  if (!m) return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
  return `${m[1]}-${m[2]}-01`;
}

/** Primer día del mes ANTERIOR al dado. */
export function primerDiaMesAnterior(mes: string): string {
  const [a, m] = primerDiaMes(mes).split("-").map(Number);
  const d = new Date(a!, (m! - 1) - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Corte de comisiones del mes de REG = último día de ese mes. */
export function corteDeMes(mes: string): string {
  const [a, m] = primerDiaMes(mes).split("-").map(Number);
  return corteFinDeMes(new Date(a!, m! - 1, 15));
}

/**
 * Corte para PAGAR comisiones: nunca incluye el mes en curso (que aún no cierra).
 * = mínimo entre el fin del mes de REG y el fin del último mes cerrado. Así el
 * pago corresponde solo a cortes ya cerrados (ej. hasta agosto), no acumula el mes actual.
 */
export function corteCerrado(mes: string): string {
  const cm = corteDeMes(mes);
  const h = new Date();
  const ultimoCerrado = corteFinDeMes(new Date(h.getFullYear(), h.getMonth() - 1, 15));
  return cm < ultimoCerrado ? cm : ultimoCerrado;
}

/** UVT vigente para el mes dado. */
export async function uvtDeMes(mes: string): Promise<number> {
  const anio = Number(mes.slice(0, 4));
  const rows = await consulta(`select valor from public.reg_uvt where anio = $1`, [anio]);
  return rows.length ? Number(rows[0]!.valor) : uvtDeAnio(anio);
}

/** Comisión CS pendiente por colaborador (COP) para el corte del mes. */
async function comisionesCopDelMes(mes: string): Promise<{ mapa: Map<number, number>; tasa: number }> {
  const corte = corteCerrado(mes);
  const [resultados, fx] = await Promise.all([cargarResultados(corte), tasaUsdCop()]);
  const mapa = new Map<number, number>();
  for (const r of resultados) {
    mapa.set(r.colaboradorId, Math.round(r.totalPendiente * fx.cop));
  }
  return { mapa, tasa: fx.cop };
}

/** Comisión CS pendiente (COP) de un colaborador para el corte del mes. */
export async function comisionPendienteCop(colaboradorId: number, mes: string): Promise<number> {
  const corte = corteCerrado(mes);
  const [res, fx] = await Promise.all([resultadoDeColaborador(colaboradorId, corte), tasaUsdCop()]);
  return res ? Math.round(res.totalPendiente * fx.cop) : 0;
}

export async function renglonesDelMes(mes: string): Promise<RenglonReg[]> {
  const primer = primerDiaMes(mes);
  const anterior = primerDiaMesAnterior(mes);
  const { mapa: comisionCop } = await comisionesCopDelMes(mes);

  const colabs = await consulta(
    `select c.id, c.nombre, c.email, c.banco, c.identificacion, c.valor_nomina,
            p.id as pago_id, p.pago_fijo, p.adicional, p.adicional_desc, p.comision,
            p.valor_cuenta_cobro, p.aporte_salud, p.aporte_pension,
            p.rete_ica, p.rete_renta, p.valor_girar, p.costo_transferencia,
            p.ck_correo, p.ck_drive, p.ck_registro, p.ck_pagado,
            p.identificacion as p_ident,
            pa.valor_cuenta_cobro as valor_mes_anterior
       from public.colaboradores c
       left join public.reg_pago p  on p.colaborador_id = c.id and p.mes = $1
       left join public.reg_pago pa on pa.colaborador_id = c.id and pa.mes = $2
      where c.activo and coalesce(c.rol,'') <> 'freelance'
      order by (c.categoria is null), c.fecha_ingreso, c.nombre`,
    [primer, anterior],
  );

  const renglonesColab: RenglonReg[] = colabs.map((r: Record<string, unknown>) => {
    const tienePago = r.pago_id != null;
    const valorNomina = num(r.valor_nomina);
    const valorMesAnterior = num(r.valor_mes_anterior);
    const pagoFijo = tienePago ? num(r.pago_fijo) : (valorNomina || valorMesAnterior || 0);
    // Comisión: si ya está PAGADA, la guardada (histórica); si no, la del corte
    // cerrado en vivo (aunque haya un pago guardado, para no mostrar acumulados viejos).
    const comision = (tienePago && Boolean(r.ck_pagado)) ? num(r.comision) : (comisionCop.get(Number(r.id)) ?? 0);
    return {
      pagoId: tienePago ? Number(r.pago_id) : null,
      colaboradorId: Number(r.id),
      nombre: String(r.nombre),
      esFreelance: false,
      email: (r.email as string) ?? null,
      banco: (r.banco as string) ?? null,
      identificacion: (r.p_ident as string) ?? (r.identificacion as string) ?? null,
      actividadCiiu: null,
      tarifaIcaMil: TARIFA_ICA_DEFAULT,
      valorNomina,
      valorMesAnterior,
      pagoFijo,
      adicional: num(r.adicional),
      adicionalDesc: (r.adicional_desc as string) ?? null,
      comision,
      valorCuentaCobro: num(r.valor_cuenta_cobro),
      aporteSalud: num(r.aporte_salud),
      aportePension: num(r.aporte_pension),
      reteIca: num(r.rete_ica),
      reteRenta: num(r.rete_renta),
      valorGirar: num(r.valor_girar),
      costoTransferencia: num(r.costo_transferencia),
      ckCorreo: Boolean(r.ck_correo),
      ckDrive: Boolean(r.ck_drive),
      ckRegistro: Boolean(r.ck_registro),
      ckPagado: Boolean(r.ck_pagado),
    };
  });

  const free = await consulta(
    `select id, nombre_libre, identificacion, tarifa_ica_mil, pago_fijo, adicional, adicional_desc, comision,
            valor_cuenta_cobro, aporte_salud, aporte_pension, rete_ica, rete_renta,
            valor_girar, costo_transferencia, ck_correo, ck_drive, ck_registro, ck_pagado
       from public.reg_pago
      where mes = $1 and colaborador_id is null
      order by nombre_libre`,
    [primer],
  );

  const renglonesFree: RenglonReg[] = free.map((r: Record<string, unknown>) => ({
    pagoId: Number(r.id),
    colaboradorId: null,
    nombre: String(r.nombre_libre ?? "Freelance"),
    esFreelance: true,
    email: null,
    banco: null,
    identificacion: (r.identificacion as string) ?? null,
    actividadCiiu: null,
    tarifaIcaMil: num(r.tarifa_ica_mil),
    valorNomina: 0,
    valorMesAnterior: 0,
    pagoFijo: num(r.pago_fijo) || num(r.valor_cuenta_cobro),
    adicional: num(r.adicional),
    adicionalDesc: (r.adicional_desc as string) ?? null,
    comision: num(r.comision),
    valorCuentaCobro: num(r.valor_cuenta_cobro),
    aporteSalud: num(r.aporte_salud),
    aportePension: num(r.aporte_pension),
    reteIca: num(r.rete_ica),
    reteRenta: num(r.rete_renta),
    valorGirar: num(r.valor_girar),
    costoTransferencia: num(r.costo_transferencia),
    ckCorreo: Boolean(r.ck_correo),
    ckDrive: Boolean(r.ck_drive),
    ckRegistro: Boolean(r.ck_registro),
    ckPagado: Boolean(r.ck_pagado),
  }));

  return [...renglonesColab, ...renglonesFree];
}

export interface TotalesReg {
  cuentaCobro: number;
  reteIca: number;
  reteRenta: number;
  valorGirar: number;
  pendientes: number;
  // Costos de empresa (solo de filas PAGADAS): 4x1000 + transferencia + IVA.
  gmf: number;
  costoTransferencia: number;
  ivaTransferencia: number;
}

export function totalizar(renglones: RenglonReg[]): TotalesReg {
  const t: TotalesReg = {
    cuentaCobro: 0, reteIca: 0, reteRenta: 0, valorGirar: 0, pendientes: 0,
    gmf: 0, costoTransferencia: 0, ivaTransferencia: 0,
  };
  for (const r of renglones) {
    t.cuentaCobro += r.valorCuentaCobro;
    t.reteIca += r.reteIca;
    t.reteRenta += r.reteRenta;
    t.valorGirar += r.valorGirar;
    if (r.valorCuentaCobro > 0 && !r.ckPagado) t.pendientes += 1;
    // Costos SOLO cuando ya está pagado (la transferencia se ejecutó).
    if (r.ckPagado && r.valorGirar > 0) {
      t.gmf += Math.round(r.valorGirar * GMF);
      if (!r.esFreelance && !bancoSinCosto(r.banco)) {
        t.costoTransferencia += COSTO_TRANSFERENCIA_OTRO;
        t.ivaTransferencia += Math.round(COSTO_TRANSFERENCIA_OTRO * IVA);
      }
    }
  }
  return t;
}

/** Recalcula retenciones desde los datos crudos (fuente única = retenciones.ts). */
export function recalcular(valor: number, tarifaIcaMil: number, salud: number, pension: number, uvt: number) {
  return calcularRetenciones({ valor, tarifaIcaMil, aporteSalud: salud, aportePension: pension, uvt });
}
