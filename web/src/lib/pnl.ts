import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { dashboardAfiliados } from "@/lib/afiliados";
import { cargarResultados } from "@/lib/comisiones";

/** P&L mensual del negocio Leadtion (ingresos vs costos, en USD). */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface PnL {
  mes: string;
  tasa: { cop: number; enVivo: boolean };
  ingresos: {
    licenciasServicios: number;
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

  const [fx, ingresoRows, apiRows, cfgRows, reselRows, activasRows, bonoRows, afil, cs] = await Promise.all([
    tasaUsdCop(),
    consulta(`select coalesce(sum(valor),0)::float t from public.pagos_mensuales where to_char(mes,'YYYY-MM')=$1 and valor>0`, [mes]),
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

  // Comisiones CS que caen en el mes actual (hito con fecha en este mes).
  let comisionesCS = 0;
  for (const r of cs) for (const l of r.lineas) for (const h of l.hitos) {
    if (h.fechaHito.slice(0, 7) === mes) comisionesCS += h.monto;
  }
  comisionesCS = round2(comisionesCS);
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

  const licenciasServicios = round2(Number(ingresoRows[0]?.t ?? 0));
  // Ganancia real de las APIs vendidas: precio cobrado − $10 de costo por cada una.
  const apiVendida = round2(apiVendidaIngreso - apiVendidaCuentas * 10);
  const reselling = round2(Number(reselRows[0]?.monto ?? 0));

  const ingresosTotal = round2(licenciasServicios + apiVendida + reselling);
  const costosTotal = round2(nomina + ghl + apisIncluidas + comisionesAfiliados + comisionesCS + bonos);

  return {
    mes,
    tasa: { cop, enVivo: fx.enVivo },
    ingresos: { licenciasServicios, apiVendida, apiVendidaCuentas, reselling, total: ingresosTotal },
    costos: { nomina, ghl, apisIncluidas, apisIncluidasCuentas: apiIncluidaCount, comisionesAfiliados, comisionesCS, bonos, total: costosTotal, nominaDetalle },
    neto: round2(ingresosTotal - costosTotal),
    cuentasActivas: Number(activasRows[0]?.n ?? 0),
  };
}
