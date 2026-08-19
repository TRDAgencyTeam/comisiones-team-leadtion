import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { dashboardAfiliados } from "@/lib/afiliados";
import { cargarResultados } from "@/lib/comisiones";
import { calendarioServicio } from "@/lib/servicios";

/** P&L mensual del negocio Leadtion (ingresos vs costos, en USD). */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Devuelve el 'YYYY-MM' de sumar `n` meses a un 'YYYY-MM'. */
function mesConDesfaseMes(mesInicio: string, n: number): string {
  const [y, m] = mesInicio.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export interface PnL {
  mes: string;
  tasa: { cop: number; enVivo: boolean };
  ingresos: {
    licencias: number;
    servicios: { agente_ai: number; reactivacion: number; level_up: number; total: number };
    apiVendida: number; apiVendidaCuentas: number;
    reselling: number; total: number;
  };
  costos: {
    nomina: number; ghl: number; apisIncluidas: number; apisIncluidasCuentas: number;
    comisionesAfiliados: number; comisionesCS: number; bonos: number; total: number;
    nominaDetalle: { nombre: string; cop: number; pct: number; usd: number }[];
  };
  neto: number;
  cuentasActivas: number;
}

export async function calcularPnL(now = new Date()): Promise<PnL> {
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [fx, ingresoRows, servicioRows, apiRows, cfgRows, reselRows, activasRows, bonoRows, afil, cs] = await Promise.all([
    tasaUsdCop(),
    consulta(`select coalesce(sum(valor),0)::float t from public.pagos_mensuales where to_char(mes,'YYYY-MM')=$1 and valor>0`, [mes]),
    // Servicios registrados (para atribuir el ingreso por tipo desde su calendario,
    // sin doble conteo cuando un cliente tiene varios servicios).
    consulta(`select tipo_servicio, mes_inicio, soporte_valor, precio_mes1 from public.cliente_servicios`),
    consulta(`select coalesce(sum(api_valor) filter (where api_estado='vendida' and estado_actual='activo'),0)::float vendida_ingreso,
                     count(*) filter (where api_estado='vendida' and estado_actual='activo')::int vendida_n,
                     count(*) filter (where api_estado='incluida' and estado_actual='activo')::int incluida
                from public.clientes`),
    consulta(`select clave, valor from public.config_negocio`),
    consulta(`select monto from public.reselling_mensual where mes=$1`, [mes]),
    consulta(`select count(*) filter (where estado_actual='activo')::int n from public.clientes`),
    consulta(`select coalesce(sum(bono_reactivacion),0)::float t from public.clientes where bono_reactivacion is not null and to_char(fecha_activacion,'YYYY-MM')=$1`, [mes]),
    dashboardAfiliados(now),
    cargarResultados(finMes),
  ]);

  // Comisiones CS = lo PENDIENTE por pagar al equipo, al mismo corte (fin de mes)
  // que el panel de comisiones y los portales. Así el P&L cuadra con lo que se
  // paga realmente (no solo los hitos cuya fecha cae dentro del mes).
  const comisionesCS = round2(cs.reduce((s, r) => s + r.totalPendiente, 0));
  const bonos = round2(Number(bonoRows[0]?.t ?? 0));

  const cfg: Record<string, number> = {};
  for (const r of cfgRows) cfg[String(r.clave)] = Number(r.valor);
  const cop = fx.cop;

  const nominaDetalle = [
    { nombre: "Andrés", cop: cfg.nomina_andres_cop ?? 0, pct: cfg.nomina_andres_pct ?? 0 },
    { nombre: "Daniel", cop: cfg.nomina_daniel_cop ?? 0, pct: cfg.nomina_daniel_pct ?? 0 },
    { nombre: "Alejandro", cop: cfg.nomina_alejandro_cop ?? 0, pct: cfg.nomina_alejandro_pct ?? 0 },
  ].map((n) => ({ ...n, usd: round2((n.cop * (n.pct / 100)) / cop) }));
  const nomina = round2(nominaDetalle.reduce((s, n) => s + n.usd, 0));

  const apiVendidaIngreso = Number(apiRows[0]?.vendida_ingreso ?? 0);
  const apiVendidaCuentas = Number(apiRows[0]?.vendida_n ?? 0);
  const apiIncluidaCount = Number(apiRows[0]?.incluida ?? 0);
  const ghl = cfg.ghl_mensual_usd ?? 497;
  const apisIncluidas = round2(apiIncluidaCount * 10);
  const comisionesAfiliados = round2((afil.dash.pendienteMes ?? 0) + (afil.dash.pagadoMes ?? 0));

  const totalPagosMes = round2(Number(ingresoRows[0]?.t ?? 0));
  // Ingreso por servicios Leadtion del mes, por tipo, desde el CALENDARIO de cada
  // servicio (así un cliente con varios servicios no se cuenta doble).
  const serv = { agente_ai: 0, reactivacion: 0, level_up: 0 };
  for (const r of servicioRows) {
    const t = String(r.tipo_servicio) as keyof typeof serv;
    if (!(t in serv)) continue;
    const mesInicio = (r.mes_inicio instanceof Date ? r.mes_inicio.toISOString() : String(r.mes_inicio)).slice(0, 7);
    const cal = calendarioServicio(
      t,
      r.soporte_valor == null ? null : Number(r.soporte_valor),
      r.precio_mes1 == null ? null : Number(r.precio_mes1),
    );
    for (const m of cal) {
      if (mesConDesfaseMes(mesInicio, m.offset) === mes) serv[t] += m.valor;
    }
  }
  serv.agente_ai = round2(serv.agente_ai);
  serv.reactivacion = round2(serv.reactivacion);
  serv.level_up = round2(serv.level_up);
  const serviciosTotal = round2(serv.agente_ai + serv.reactivacion + serv.level_up);
  // Licencias = todo lo cobrado del mes que no es un servicio Leadtion.
  const licencias = round2(totalPagosMes - serviciosTotal);
  // Ganancia real de las APIs vendidas: precio cobrado − $10 de costo por cada una.
  const apiVendida = round2(apiVendidaIngreso - apiVendidaCuentas * 10);
  const reselling = round2(Number(reselRows[0]?.monto ?? 0));

  const ingresosTotal = round2(licencias + serviciosTotal + apiVendida + reselling);
  const costosTotal = round2(nomina + ghl + apisIncluidas + comisionesAfiliados + comisionesCS + bonos);

  return {
    mes,
    tasa: { cop, enVivo: fx.enVivo },
    ingresos: {
      licencias,
      servicios: { ...serv, total: serviciosTotal },
      apiVendida, apiVendidaCuentas, reselling, total: ingresosTotal,
    },
    costos: { nomina, ghl, apisIncluidas, apisIncluidasCuentas: apiIncluidaCount, comisionesAfiliados, comisionesCS, bonos, total: costosTotal, nominaDetalle },
    neto: round2(ingresosTotal - costosTotal),
    cuentasActivas: Number(activasRows[0]?.n ?? 0),
  };
}
