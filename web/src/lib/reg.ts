import "server-only";
import { consulta } from "@/lib/db";
import { calcularRetenciones, uvtDeAnio, TARIFA_ICA_DEFAULT } from "@/lib/retenciones";

/**
 * Datos del módulo REG (registro contable). Combina los colaboradores activos
 * con su registro de pago del mes elegido; los freelance se guardan como pagos
 * con `nombre_libre` (sin colaborador_id).
 */

export interface RenglonReg {
  /** id del renglón reg_pago (null si el colaborador aún no tiene pago ese mes). */
  pagoId: number | null;
  colaboradorId: number | null;
  nombre: string;
  esFreelance: boolean;
  email: string | null;
  identificacion: string | null;
  actividadCiiu: string | null;
  tarifaIcaMil: number;
  /** Valor base de nómina del colaborador (pre-llena la cuenta de cobro). */
  valorNomina: number;
  /** Valor de la cuenta de cobro pagada el mes anterior (0 si no hubo). */
  valorMesAnterior: number;
  /** Valor sugerido para el input (pago del mes si existe; si no, la base). */
  prefill: number;
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

/** Primer día del mes ANTERIOR al dado ("YYYY-MM" → "YYYY-MM-01"). */
export function primerDiaMesAnterior(mes: string): string {
  const primer = primerDiaMes(mes);
  const [a, m] = primer.split("-").map(Number);
  const d = new Date(a!, (m! - 1) - 1, 1); // un mes atrás
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** UVT vigente para el mes dado (según su año). */
export async function uvtDeMes(mes: string): Promise<number> {
  const anio = Number(mes.slice(0, 4));
  const rows = await consulta(`select valor from public.reg_uvt where anio = $1`, [anio]);
  return rows.length ? Number(rows[0]!.valor) : uvtDeAnio(anio);
}

/**
 * Renglones del mes: todos los colaboradores activos (con su pago del mes si
 * existe) + los freelance registrados ese mes. Ordena nómina primero.
 */
export async function renglonesDelMes(mes: string): Promise<RenglonReg[]> {
  const primer = primerDiaMes(mes);
  const anterior = primerDiaMesAnterior(mes);

  // Colaboradores activos con LEFT JOIN a su pago del mes y al del mes anterior.
  const colabs = await consulta(
    `select c.id, c.nombre, c.email, c.identificacion, c.valor_nomina,
            p.id as pago_id, p.valor_cuenta_cobro, p.aporte_salud, p.aporte_pension,
            p.rete_ica, p.rete_renta, p.valor_girar, p.costo_transferencia,
            p.ck_correo, p.ck_drive, p.ck_registro, p.ck_pagado,
            p.identificacion as p_ident,
            pa.valor_cuenta_cobro as valor_mes_anterior
       from public.colaboradores c
       left join public.reg_pago p  on p.colaborador_id = c.id and p.mes = $1
       left join public.reg_pago pa on pa.colaborador_id = c.id and pa.mes = $2
      where c.activo
      order by (c.categoria is null), c.fecha_ingreso, c.nombre`,
    [primer, anterior],
  );

  const renglonesColab: RenglonReg[] = colabs.map((r: Record<string, unknown>) => {
    const tienePago = r.pago_id != null;
    const valorPago = num(r.valor_cuenta_cobro);
    const valorNomina = num(r.valor_nomina);
    const valorMesAnterior = num(r.valor_mes_anterior);
    // Prefill: si ya hay pago del mes, ese valor; si no, la base (nómina) o el mes anterior.
    const prefill = tienePago ? valorPago : (valorNomina || valorMesAnterior || 0);
    return {
    pagoId: tienePago ? Number(r.pago_id) : null,
    colaboradorId: Number(r.id),
    nombre: String(r.nombre),
    esFreelance: false,
    email: (r.email as string) ?? null,
    identificacion: (r.p_ident as string) ?? (r.identificacion as string) ?? null,
    actividadCiiu: null,
    tarifaIcaMil: TARIFA_ICA_DEFAULT,
    valorNomina,
    valorMesAnterior,
    prefill,
    valorCuentaCobro: valorPago,
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

  // Freelance del mes (pagos sin colaborador_id).
  const free = await consulta(
    `select id, nombre_libre, identificacion, actividad_ciiu, tarifa_ica_mil,
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
    identificacion: (r.identificacion as string) ?? null,
    actividadCiiu: (r.actividad_ciiu as string) ?? null,
    tarifaIcaMil: num(r.tarifa_ica_mil),
    valorNomina: 0,
    valorMesAnterior: 0,
    prefill: num(r.valor_cuenta_cobro),
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
  pendientes: number; // renglones con valor > 0 aún no marcados como pagados
}

export function totalizar(renglones: RenglonReg[]): TotalesReg {
  const t: TotalesReg = { cuentaCobro: 0, reteIca: 0, reteRenta: 0, valorGirar: 0, pendientes: 0 };
  for (const r of renglones) {
    t.cuentaCobro += r.valorCuentaCobro;
    t.reteIca += r.reteIca;
    t.reteRenta += r.reteRenta;
    t.valorGirar += r.valorGirar;
    if (r.valorCuentaCobro > 0 && !r.ckPagado) t.pendientes += 1;
  }
  return t;
}

/** Recalcula retenciones desde los datos crudos (fuente única = retenciones.ts). */
export function recalcular(valor: number, tarifaIcaMil: number, salud: number, pension: number, uvt: number) {
  return calcularRetenciones({ valor, tarifaIcaMil, aporteSalud: salud, aportePension: pension, uvt });
}
