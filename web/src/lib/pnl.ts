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
     * Licencias cobradas ESTE mes, por ítem. Solo entran las cuentas a las que se
     * les cobra ese ítem este mes: las que están en servicio NO aparecen aquí (su
     * cobro está en Servicios). Agencia = cargo $0 (incluida en el marketing).
     */
    licenciasDetalle: {
      estandar: { n: number; total: number; clientes: { nombre: string; monto: number }[] };
      conSoporte: { n: number; total: number; clientes: { nombre: string; monto: number }[] };
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

export type CategoriaLeadtion = "estandar" | "soporte" | "servicio" | "agencia";
export interface LineaLeadtion {
  clienteId: number;
  nombre: string;
  esAgencia: boolean;
  /** En qué ítem cuenta ESTE cargo del mes. Un cliente puede generar varios cargos
   * (p. ej. reactivación mes 3 en "servicio" + Agente IA mes 3 en "soporte"). */
  categoria: CategoriaLeadtion;
  /** Monto de este cargo (cuenta una sola vez en su ítem). */
  valor: number;
  /** Tipo de servicio, solo cuando categoria = "servicio". */
  tipoServicio?: TipoServicio;
  /** De dónde salió el valor (para auditar). */
  fuenteValor?: string;
}

/**
 * Proyección del ingreso Leadtion del mes, POR CARGO (no por cliente): lo que se
 * cobra ese mes, clasificado en su ítem. No depende de que el cobro esté
 * registrado: una cuenta activa cuenta porque se cobrará según su corte.
 *
 * Reglas (confirmadas con Mauro):
 *  - Dentro de la ventana de un servicio manda el calendario, y cada mes cuenta
 *    en SU categoría: Agente IA mes 1 y Reactivación (todos los meses) = "servicio";
 *    Agente IA mes 3 = "soporte" (ya es su mensualidad); mes de garantía = $0 (no cuenta).
 *    Un cliente con dos servicios genera dos cargos (p. ej. $197 servicio + $157 soporte).
 *  - FUERA de toda ventana, la mensualidad base por VALOR: soporte explícito
 *    (cliente_soportes / soporte_valor) o valor_licencia_general > 69 (119/157) = "soporte";
 *    valor ≤ 69 (34/67/69) = "estandar"; sin valor = base $69 estándar.
 *  - `es_agencia` → un cargo "agencia" de $0 (la licencia va incluida en el marketing).
 */
export async function proyeccionLeadtionMes(mes: string): Promise<LineaLeadtion[]> {
  const [clientes, servicios, soportesInd] = await Promise.all([
    consulta(`select id, nombre, coalesce(es_agencia,false) es_agencia,
                coalesce(soporte_valor,0) sop, coalesce(valor_licencia_general,0) licgen,
                to_char(fecha_activacion,'YYYY-MM') act
                from public.clientes where estado_actual='activo' and es_leadtion`),
    consulta(`select cliente_id, tipo_servicio, to_char(mes_inicio,'YYYY-MM') mes_inicio, soporte_valor, precio_mes1
                from public.cliente_servicios`),
    consulta(`select cliente_id, valor from public.cliente_soportes where hasta is null`),
  ]);

  const sopIndDe = new Map<number, number>();
  for (const s of soportesInd) sopIndDe.set(Number(s.cliente_id), Number(s.valor));

  // Cargos de ventana de servicio que caen en `mes`, por cliente.
  interface Cargo { categoria: "servicio" | "soporte"; valor: number; tipoServicio: TipoServicio }
  const cargosDe = new Map<number, Cargo[]>();
  const enVentana = new Set<number>(); // tiene alguna entrada de calendario este mes (incl. garantía)
  for (const sv of servicios) {
    const tipo = String(sv.tipo_servicio) as TipoServicio;
    const cal = calendarioServicio(
      tipo,
      sv.soporte_valor == null ? null : Number(sv.soporte_valor),
      sv.precio_mes1 == null ? null : Number(sv.precio_mes1),
    );
    const inicio = (sv.mes_inicio instanceof Date ? sv.mes_inicio.toISOString() : String(sv.mes_inicio)).slice(0, 7);
    for (const e of cal) {
      if (mesConDesfaseMes(inicio, e.offset) !== mes) continue;
      const id = Number(sv.cliente_id);
      enVentana.add(id);
      if (e.categoria === "garantia" || e.valor <= 0) continue; // garantía: no genera cargo
      const arr = cargosDe.get(id) ?? [];
      arr.push({ categoria: e.categoria === "soporte" ? "soporte" : "servicio", valor: round2(e.valor), tipoServicio: tipo });
      cargosDe.set(id, arr);
    }
  }

  const lineas: LineaLeadtion[] = [];
  for (const c of clientes) {
    const id = Number(c.id);
    const nombre = String(c.nombre);
    const act = c.act ? String(c.act) : null;
    if (act != null && mes < act) continue; // aún no activo ese mes

    // Agencia: la licencia va incluida en el marketing → cargo $0, sin servicios propios.
    if (Boolean(c.es_agencia)) {
      lineas.push({ clienteId: id, nombre, esAgencia: true, categoria: "agencia", valor: 0, fuenteValor: "incluida en marketing" });
      continue;
    }

    // Dentro de ventana de servicio → sus cargos (servicio/soporte); garantía = $0.
    const cargos = cargosDe.get(id);
    if (cargos && cargos.length > 0) {
      for (const cg of cargos) {
        lineas.push({ clienteId: id, nombre, esAgencia: false, categoria: cg.categoria, valor: cg.valor, tipoServicio: cg.categoria === "servicio" ? cg.tipoServicio : undefined, fuenteValor: "calendario servicio" });
      }
      continue;
    }
    if (enVentana.has(id)) continue; // solo garantía este mes ($0)

    // Fuera de ventana → mensualidad base por valor.
    const licgen = Number(c.licgen);
    const sopVal = Number(c.sop);
    const sopInd = sopIndDe.get(id) ?? 0;
    const sopExplicito = sopInd > 0 ? sopInd : (sopVal > 0 ? sopVal : 0);
    if (sopExplicito > 0) {
      lineas.push({ clienteId: id, nombre, esAgencia: false, categoria: "soporte", valor: round2(sopExplicito), fuenteValor: sopInd > 0 ? "cliente_soportes" : "soporte_valor" });
    } else if (licgen > 0) {
      lineas.push({ clienteId: id, nombre, esAgencia: false, categoria: licgen <= 69 ? "estandar" : "soporte", valor: round2(licgen), fuenteValor: "valor_licencia_general" });
    } else {
      lineas.push({ clienteId: id, nombre, esAgencia: false, categoria: "estandar", valor: 69, fuenteValor: "base 69" });
    }
  }
  return lineas;
}

export async function calcularPnL(now = new Date()): Promise<PnL> {
  const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [fx, lineasLead, apiRows, cfgRows, reselRows, activasRows, bonoRows, afil, cs] = await Promise.all([
    tasaUsdCop(),
    // Ingreso Leadtion del mes por cargo (licencias, soporte y servicios).
    proyeccionLeadtionMes(mes),
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

  const porNombre = (a: LineaLeadtion, b: LineaLeadtion) => a.nombre.localeCompare(b.nombre, "es");

  // Servicios del mes = cargos "servicio" (Agente IA mes 1, Reactivación, Level Up mes 1),
  // por tipo. El Agente IA mes 3 NO va aquí: cuenta como soporte.
  const servicioLines = lineasLead.filter((l) => l.categoria === "servicio").sort((a, b) => b.valor - a.valor);
  const serv = { agente_ai: 0, reactivacion: 0, level_up: 0 };
  const serviciosDetalle: { nombre: string; tipo: string; monto: number }[] = [];
  for (const l of servicioLines) {
    const t = l.tipoServicio as keyof typeof serv | undefined;
    if (t && t in serv) serv[t] = round2(serv[t] + l.valor);
    serviciosDetalle.push({ nombre: l.nombre, tipo: l.tipoServicio ?? "servicio", monto: l.valor });
  }
  const serviciosTotal = round2(serv.agente_ai + serv.reactivacion + serv.level_up);

  // Licencias del mes: cada cargo cuenta en SU ítem (estándar / con soporte).
  // Un cliente en servicio no aparece aquí (su cobro está en Servicios); uno con
  // soporte de Agente IA mes 3 sí aparece en "con soporte".
  const estandarLead = lineasLead.filter((l) => l.categoria === "estandar").sort(porNombre);
  const soporteLead = lineasLead.filter((l) => l.categoria === "soporte").sort(porNombre);
  const agenciaLead = lineasLead.filter((l) => l.categoria === "agencia").sort(porNombre);
  const cliDe = (l: LineaLeadtion) => ({ nombre: l.nombre, monto: l.valor });
  const sumaValor = (arr: LineaLeadtion[]) => round2(arr.reduce((s, l) => s + l.valor, 0));
  const licenciasDetalle = {
    estandar: { n: estandarLead.length, total: sumaValor(estandarLead), clientes: estandarLead.map(cliDe) },
    conSoporte: { n: soporteLead.length, total: sumaValor(soporteLead), clientes: soporteLead.map(cliDe) },
    agencia: { n: agenciaLead.length, total: 0, clientes: agenciaLead.map((l) => ({ nombre: l.nombre })) },
  };
  const licencias = round2(licenciasDetalle.estandar.total + licenciasDetalle.conSoporte.total);
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
