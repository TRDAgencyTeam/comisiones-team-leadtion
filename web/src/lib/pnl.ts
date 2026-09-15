import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { dashboardAfiliados } from "@/lib/afiliados";
import { cargarResultados } from "@/lib/comisiones";
import { calendarioServicio, type TipoServicio } from "@/lib/servicios";

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
    /**
     * Membresía por tipo de licencia base. Cada cuenta Leadtion activa cuenta en
     * EXACTAMENTE una categoría → estandar.n + conSoporte.n + agencia.n = cuentas
     * activas. `total` = valor base de cartera (agencia = 0, va en el marketing).
     * `enServicio` marca los que este mes están en ventana de servicio (su cobro
     * del mes está en Servicios, no en la base).
     */
    licenciasDetalle: {
      estandar: { n: number; total: number; ingreso: number; clientes: { nombre: string; monto: number; enServicio: boolean }[] };
      conSoporte: { n: number; total: number; ingreso: number; clientes: { nombre: string; monto: number; enServicio: boolean }[] };
      agencia: { n: number; total: number; clientes: { nombre: string }[] };
    };
    servicios: {
      agente_ai: number; reactivacion: number; level_up: number; total: number;
      detalle: { nombre: string; tipo: string; monto: number }[];
    };
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

export type TipoLineaLeadtion = "estandar" | "soporte";
export interface LineaLeadtion {
  clienteId: number;
  nombre: string;
  esAgencia: boolean;
  /** Licencia base del cliente (siempre, aunque esté en servicio o sea agencia). */
  baseTipo: TipoLineaLeadtion;
  baseValor: number;
  /** Este mes está dentro de la ventana de un servicio (cobra el servicio, no la base). */
  enServicio: boolean;
  /** Ingreso REAL del mes: servicio si está en ventana; base si no; 0 si agencia. */
  valor: number;
  /** De dónde salió el valor base (para auditar la clasificación). */
  fuenteValor?: string;
}

/**
 * Proyección del ingreso Leadtion del mes, por cada cliente ACTIVO.
 *
 * No depende de que el cobro esté registrado en `pagos_mensuales`: una licencia
 * activa cuenta porque se cobrará tarde o temprano (según su fecha de corte),
 * salvo que se desactive en Membresías. La clasificación se basa en campos que
 * YA existen en el maestro de clientes (los mismos que muestra la lista de
 * Clientes), no en valores inventados:
 *  - dentro de una ventana de servicio (cliente_servicios) → "servicio"
 *    (o "garantia" si el calendario marca ese mes en $0);
 *  - fuera de ventana, la clasificación es por VALOR (regla del negocio):
 *      · con soporte explícito (cliente_soportes / soporte_valor) → "soporte";
 *      · si no, su `valor_licencia_general`: ≤ 69 (34/67/69) → "estandar";
 *        > 69 (87/119/157…) → "soporte"; sin valor → base 69 estándar.
 *  - `es_agencia` → no genera línea (la licencia va incluida en el marketing).
 */
export async function proyeccionLeadtionMes(mes: string): Promise<LineaLeadtion[]> {
  const [clientes, servicios, soportesInd] = await Promise.all([
    consulta(`select id, nombre, coalesce(es_agencia,false) es_agencia,
                coalesce(tipo_cliente,'estandar') tipo, coalesce(soporte_valor,0) sop,
                coalesce(valor_licencia_general,0) licgen, to_char(fecha_activacion,'YYYY-MM') act
                from public.clientes where estado_actual='activo' and es_leadtion`),
    consulta(`select cliente_id, tipo_servicio, to_char(mes_inicio,'YYYY-MM') mes_inicio, soporte_valor, precio_mes1
                from public.cliente_servicios`),
    consulta(`select cliente_id, valor from public.cliente_soportes where hasta is null`),
  ]);

  const sopIndDe = new Map<number, number>();
  for (const s of soportesInd) sopIndDe.set(Number(s.cliente_id), Number(s.valor));

  // Valor del calendario de servicio que cae en `mes`, por cliente
  // (0 = garantía; undefined = ese cliente no tiene servicio ese mes).
  const svcDe = new Map<number, number>();
  for (const sv of servicios) {
    const cal = calendarioServicio(
      String(sv.tipo_servicio) as TipoServicio,
      sv.soporte_valor == null ? null : Number(sv.soporte_valor),
      sv.precio_mes1 == null ? null : Number(sv.precio_mes1),
    );
    const inicio = (sv.mes_inicio instanceof Date ? sv.mes_inicio.toISOString() : String(sv.mes_inicio)).slice(0, 7);
    for (const c of cal) {
      if (mesConDesfaseMes(inicio, c.offset) === mes) {
        const id = Number(sv.cliente_id);
        svcDe.set(id, (svcDe.get(id) ?? 0) + c.valor);
      }
    }
  }

  const lineas: LineaLeadtion[] = [];
  for (const c of clientes) {
    const id = Number(c.id);
    const nombre = String(c.nombre);
    const act = c.act ? String(c.act) : null;
    if (act != null && mes < act) continue; // aún no activo ese mes

    const esAgencia = Boolean(c.es_agencia);
    const licgen = Number(c.licgen);
    const sopVal = Number(c.sop);
    const sopInd = sopIndDe.get(id) ?? 0;
    const sopExplicito = sopInd > 0 ? sopInd : (sopVal > 0 ? sopVal : 0);

    // Licencia base (siempre se calcula, aunque esté en servicio o sea agencia).
    let baseTipo: TipoLineaLeadtion, baseValor: number, fuente: string;
    if (sopExplicito > 0) {
      baseTipo = "soporte"; baseValor = round2(sopExplicito);
      fuente = sopInd > 0 ? "cliente_soportes" : "soporte_valor";
    } else if (licgen > 0) {
      // 34/67/69 = estándar; mayor = soporte.
      baseTipo = licgen <= 69 ? "estandar" : "soporte"; baseValor = round2(licgen);
      fuente = "valor_licencia_general";
    } else {
      baseTipo = "estandar"; baseValor = 69; fuente = "base 69";
    }

    const svc = svcDe.get(id);
    const enServicio = svc !== undefined;
    // Ingreso real del mes: servicio si está en ventana; base si no; 0 si agencia.
    const valor = enServicio ? round2(svc) : (esAgencia ? 0 : baseValor);
    lineas.push({ clienteId: id, nombre, esAgencia, baseTipo, baseValor, enServicio, valor, fuenteValor: fuente });
  }
  return lineas;
}

export async function calcularPnL(now = new Date()): Promise<PnL> {
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [fx, lineasLead, servicioRows, apiRows, cfgRows, reselRows, activasRows, bonoRows, afil, cs] = await Promise.all([
    tasaUsdCop(),
    // Licencias activas del mes (proyectadas, no dependen del cobro registrado).
    proyeccionLeadtionMes(mes),
    // Servicios registrados (para atribuir el ingreso por tipo desde su calendario,
    // sin doble conteo cuando un cliente tiene varios servicios).
    consulta(`select cs.tipo_servicio, cs.mes_inicio, cs.soporte_valor, cs.precio_mes1, cl.nombre
                from public.cliente_servicios cs join public.clientes cl on cl.id=cs.cliente_id`),
    // API: toda cuenta Leadtion activa lleva la API incluida (costo $10) salvo las
    // "vendidas" (el cliente la paga aparte). Por eso incluida = activas − vendidas.
    consulta(`select coalesce(sum(api_valor) filter (where api_estado='vendida' and estado_actual='activo' and es_leadtion),0)::float vendida_ingreso,
                     count(*) filter (where api_estado='vendida' and estado_actual='activo' and es_leadtion)::int vendida_n,
                     count(*) filter (where estado_actual='activo' and es_leadtion and coalesce(api_estado,'ninguna')<>'vendida')::int incluida
                from public.clientes`),
    consulta(`select clave, valor from public.config_negocio`),
    // Reselling: ahora se reporta en Facturación → otros ingresos (categoría 'reselling').
    consulta(`select coalesce(sum(valor_usd),0)::float monto from public.ingreso_mensual where categoria='reselling' and to_char(mes,'YYYY-MM')=$1`, [mes]),
    consulta(`select count(*) filter (where estado_actual='activo' and es_leadtion)::int n from public.clientes`),
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

  // Ingreso por servicios Leadtion del mes, por tipo, desde el CALENDARIO de cada
  // servicio (así un cliente con varios servicios no se cuenta doble).
  const serv = { agente_ai: 0, reactivacion: 0, level_up: 0 };
  const serviciosDetalle: { nombre: string; tipo: string; monto: number }[] = [];
  for (const r of servicioRows) {
    const t = String(r.tipo_servicio) as keyof typeof serv;
    if (!(t in serv)) continue;
    const mesInicio = (r.mes_inicio instanceof Date ? r.mes_inicio.toISOString() : String(r.mes_inicio)).slice(0, 7);
    const cal = calendarioServicio(
      t,
      r.soporte_valor == null ? null : Number(r.soporte_valor),
      r.precio_mes1 == null ? null : Number(r.precio_mes1),
    );
    let aporte = 0;
    for (const m of cal) if (mesConDesfaseMes(mesInicio, m.offset) === mes) aporte += m.valor;
    if (aporte > 0) {
      serv[t] += aporte;
      serviciosDetalle.push({ nombre: String(r.nombre), tipo: t, monto: round2(aporte) });
    }
  }
  serviciosDetalle.sort((a, b) => b.monto - a.monto);
  serv.agente_ai = round2(serv.agente_ai);
  serv.reactivacion = round2(serv.reactivacion);
  serv.level_up = round2(serv.level_up);
  const serviciosTotal = round2(serv.agente_ai + serv.reactivacion + serv.level_up);
  // Licencias activas del mes (proyectadas), separadas en puras ($69) y con soporte.
  const porNombre = (a: LineaLeadtion, b: LineaLeadtion) => a.nombre.localeCompare(b.nombre, "es");
  // Roster de membresía: cada cuenta activa cae en UNA categoría por su licencia
  // base → estandar.n + conSoporte.n + agencia.n = cuentas activas.
  const estandarLead = lineasLead.filter((l) => !l.esAgencia && l.baseTipo === "estandar").sort(porNombre);
  const conSopLead = lineasLead.filter((l) => !l.esAgencia && l.baseTipo === "soporte").sort(porNombre);
  const agenciaLead = lineasLead.filter((l) => l.esAgencia).sort(porNombre);
  const rosterCli = (l: LineaLeadtion) => ({ nombre: l.nombre, monto: l.baseValor, enServicio: l.enServicio });
  const ingresoBase = (arr: LineaLeadtion[]) => round2(arr.filter((l) => !l.enServicio).reduce((s, l) => s + l.baseValor, 0));
  const licenciasDetalle = {
    estandar: {
      n: estandarLead.length,
      total: round2(estandarLead.reduce((s, l) => s + l.baseValor, 0)),
      ingreso: ingresoBase(estandarLead),
      clientes: estandarLead.map(rosterCli),
    },
    conSoporte: {
      n: conSopLead.length,
      total: round2(conSopLead.reduce((s, l) => s + l.baseValor, 0)),
      ingreso: ingresoBase(conSopLead),
      clientes: conSopLead.map(rosterCli),
    },
    agencia: {
      n: agenciaLead.length,
      total: 0,
      clientes: agenciaLead.map((l) => ({ nombre: l.nombre })),
    },
  };
  // Ingreso de licencias del mes (para el total): base de las cuentas que NO están
  // en ventana de servicio (las que sí, su cobro va en Servicios) y no son agencia.
  const licencias = round2(
    lineasLead.filter((l) => !l.esAgencia && !l.enServicio).reduce((s, l) => s + l.baseValor, 0),
  );
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
      licenciasDetalle,
      servicios: { ...serv, total: serviciosTotal, detalle: serviciosDetalle },
      apiVendida, apiVendidaCuentas, reselling, total: ingresosTotal,
    },
    costos: { nomina, ghl, apisIncluidas, apisIncluidasCuentas: apiIncluidaCount, comisionesAfiliados, comisionesCS, bonos, total: costosTotal, nominaDetalle },
    neto: round2(ingresosTotal - costosTotal),
    cuentasActivas: Number(activasRows[0]?.n ?? 0),
  };
}
