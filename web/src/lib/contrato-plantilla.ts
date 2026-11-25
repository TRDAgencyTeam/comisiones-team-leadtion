/**
 * Plantillas de contrato (puro, cliente + servidor), MODULAR:
 *  - Cada servicio tiene su CUERPO (cláusulas propias), sin intro ni firma.
 *  - El párrafo introductorio ("Entre TRD INVESTMENT LLC… y EL CLIENTE…") y el bloque
 *    de firma aparecen UNA sola vez, driven por el servicio PRINCIPAL.
 *  - Se pueden combinar varios servicios en UN solo documento (una sola firma): el
 *    principal arriba + los adicionales a continuación (solo sus cláusulas).
 * `renderContrato`/`renderContratoCompuesto` devuelven el HTML; con `resaltar` marca
 * las variables (editor), con `firma` estampa la firma del cliente.
 */

import { CUERPOS } from "./contrato-cuerpos";

export interface PagoLinea { concepto: string; monto: number; nota?: string }
export const MONEDAS = ["USD", "COP", "EUR", "MXN"] as const;

export interface VarsPlanMarketing {
  clienteNombre: string;
  clienteEmail?: string | null;
  clienteDomicilio?: string | null;
  meses: string;
  bono?: boolean;            // (obsoleto)
  moneda: string;
  fechaInicio?: string | null;
  fechaCampanas?: string | null;
  fechaFin?: string | null;
  notaEspecial?: string | null;
  pagos: PagoLinea[];
  cobrosAuto: boolean;
  anotaciones?: string | null;
  /** Servicios adicionales (claves de plantilla) incluidos en el MISMO documento. */
  plantillasExtra?: string[];
}
export type VarsContrato = VarsPlanMarketing;

export interface FirmaContrato { tipo: "dibujo" | "texto"; data: string; fuente?: string; fecha?: string }

const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaLarga(iso?: string | null): string {
  if (!iso) return "__________";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${+m[3]} de ${MES[+m[2] - 1]} de ${m[1]}`;
}
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function fmtMoneda(monto: number, moneda = "USD"): string {
  const m = Number(monto) || 0;
  try { return new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: moneda === "COP" ? 0 : 2 }).format(m); }
  catch { return `${m} ${moneda}`; }
}

export function varsPlanMarketingVacias(): VarsPlanMarketing {
  return {
    clienteNombre: "", clienteEmail: "", clienteDomicilio: "Florida, EE. UU.",
    meses: "4", moneda: "USD", fechaInicio: null, fechaCampanas: null, fechaFin: null, notaEspecial: "",
    pagos: [{ concepto: "Primer mes", monto: 1400 }, { concepto: "Meses 2 a 4 (c/u)", monto: 897 }],
    cobrosAuto: true, anotaciones: "", plantillasExtra: [],
  };
}
export function totalContrato(v: VarsPlanMarketing): number {
  return (v.pagos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0);
}
export function resumenPlanMarketing(v: VarsPlanMarketing): { valor: string; vigencia: string; total: number } {
  const total = totalContrato(v);
  return { valor: fmtMoneda(total, v.moneda), vigencia: `${v.meses} meses`, total };
}

type Opts = { resaltar?: boolean; firma?: FirmaContrato | null };
function V(txt: string, o: Opts): string { return o.resaltar ? `<span class="cvar">${txt}</span>` : txt; }

/* ---------------- Registro de plantillas ---------------- */
export interface Plantilla { clave: string; nombre: string; tituloDoc: string; disponible: boolean; cuerpo: (v: VarsPlanMarketing, o: Opts) => string }

export const PLANTILLAS: Plantilla[] = [
  { clave: "plan_marketing", nombre: "Plan Marketing Ads + IA + CRM (Lead Generation)", tituloDoc: "Plan Marketing Lead Generation", disponible: true, cuerpo: () => CUERPOS.plan },
  { clave: "meta_ads", nombre: "Meta Ads", tituloDoc: "Meta Ads", disponible: true, cuerpo: () => CUERPOS.meta },
  { clave: "google_ads", nombre: "Google Ads", tituloDoc: "Google Ads", disponible: true, cuerpo: () => CUERPOS.google },
  { clave: "social_media", nombre: "Social Media Marca Personal", tituloDoc: "Social Media — Marca Personal Realtor", disponible: true, cuerpo: () => CUERPOS.social },
  { clave: "grabacion", nombre: "Grabación de contenido", tituloDoc: "Grabación audiovisual de contenido", disponible: true, cuerpo: () => CUERPOS.grabacion },
];
export function plantillaDe(clave: string): Plantilla { return PLANTILLAS.find((p) => p.clave === clave) ?? PLANTILLAS[0]; }
export function plantillaNombre(clave: string): string { return plantillaDe(clave).nombre; }

/* ---------------- Partes compartidas ---------------- */
function renderHeader(tituloDoc: string): string {
  return `
  <header class="c-head">
    <div class="c-brands">
      <img src="/brand/trd/trd-logo-black.png" alt="TRD Agency" class="c-logo c-logo-trd">
      <img src="/brand/leadtion-logo-black.png" alt="Leadtion" class="c-logo c-logo-lt">
    </div>
    <span class="c-tag">Contrato de servicios</span>
  </header>
  <h1 class="c-title">CONTRATO DE PRESTACIÓN DE SERVICIOS</h1>
  <p class="c-plan">TRD Agency — ${esc(tituloDoc)}</p>`;
}

function renderIntro(v: VarsPlanMarketing, o: Opts): string {
  const nom = V(esc(v.clienteNombre || "__________"), o);
  const dom = V(esc(v.clienteDomicilio || "__________"), o);
  const mail = v.clienteEmail ? ` ${V(`(${esc(v.clienteEmail)})`, o)}` : "";
  return `<p>Entre <b>TRD INVESTMENT LLC</b>, comercialmente conocida como <b>TRD Agency</b> (en adelante, <i>LA AGENCIA</i>), y ${nom}${mail}, con domicilio en ${dom} (en adelante, <i>EL CLIENTE</i>), quienes en conjunto serán denominados <i>LAS PARTES</i>, se acuerdan los siguientes términos:</p>`;
}

function renderVigenciaPago(v: VarsPlanMarketing, o: Opts): string {
  const perm = V(`${esc(v.meses)} meses`, o);
  const ini = V(fechaLarga(v.fechaInicio), o);
  const camp = v.fechaCampanas ? V(fechaLarga(v.fechaCampanas), o) : "";
  const fin = V(fechaLarga(v.fechaFin), o);
  const lineas = (v.pagos || []).filter((p) => p.concepto || p.monto);
  const pagos = (lineas.map((p) => `<li><span>${esc(p.concepto) || "—"}${p.nota ? ` <small>(${esc(p.nota)})</small>` : ""}</span><b>${V(fmtMoneda(p.monto, v.moneda), o)}</b></li>`).join("")
    + (lineas.length ? `<li class="c-total"><span>Total</span><b>${V(fmtMoneda(totalContrato(v), v.moneda), o)}</b></li>` : "")) || "<li><span>—</span></li>";
  return `
  <h2>Vigencia y forma de pago</h2>
  <p>El contrato tendrá una permanencia mínima de ${perm}, con la siguiente vigencia:</p>
  <ul class="c-fechas">
    <li><span>Fecha de inicio:</span> <b>${ini}</b></li>
    ${camp ? `<li><span>Inicio de campañas:</span> <b>${camp}</b></li>` : ""}
    <li><span>Fecha de finalización:</span> <b>${fin}</b></li>
  </ul>
  ${v.notaEspecial ? `<p class="c-nota">${V(esc(v.notaEspecial), o)}</p>` : ""}
  <p>El valor del servicio será el indicado a continuación. En caso de que la propuesta comercial aceptada por EL CLIENTE establezca condiciones diferentes, prevalecerán los valores de dicha propuesta.</p>
  <ul class="c-pagos">${pagos}</ul>
  <p class="c-cl">Los honorarios de LA AGENCIA se pagan de manera anticipada al inicio de cada ciclo mensual.</p>
  <p class="c-cl">La inversión en pauta publicitaria no está incluida en los honorarios de LA AGENCIA y será asumida directamente por EL CLIENTE. El presupuesto publicitario recomendado se definirá durante el proceso inicial, considerando el mercado, país, estrategia y objetivos comerciales.</p>
  ${v.cobrosAuto ? `<p class="c-cl">Al realizar el primer pago, EL CLIENTE autoriza los cobros automáticos de los siguientes ciclos mediante Stripe.</p>` : ""}
  <p class="c-cl">Si el método de pago vence, es rechazado o presenta algún inconveniente, EL CLIENTE deberá actualizarlo y regularizar el pago dentro de los cinco (5) días calendario siguientes a la fecha de vencimiento.</p>
  <p class="c-cl">Los valores vencidos podrán generar un cargo por mora del uno por ciento (1 %) semanal sobre el saldo pendiente.</p>
  <p class="c-cl">Cuando un pago permanezca pendiente durante más de veinte (20) días calendario, LA AGENCIA podrá suspender las campañas, el soporte, Leadtion CRM y las demás actividades contratadas hasta que el pago sea regularizado.</p>
  <p class="c-cl">EL CLIENTE podrá solicitar la cancelación y devolución de su pago dentro de las primeras cuarenta y ocho (48) horas posteriores a la compra, siempre que LA AGENCIA no haya iniciado trabajos; después de este período, los pagos realizados no serán reembolsables. En planes mensuales, cancelar antes de completar la permanencia genera una penalidad del treinta por ciento (30 %) de los honorarios de los meses restantes, con aviso de al menos quince (15) días calendario.</p>`;
}

function renderFirma(v: VarsPlanMarketing, o: Opts): string {
  const firmaBox = o.firma
    ? (o.firma.tipo === "dibujo"
      ? `<img src="${esc(o.firma.data)}" alt="firma" class="c-firma-img">`
      : `<span class="c-firma-ink" style="font-family:${o.firma.fuente || "'Dancing Script'"},cursive">${esc(o.firma.data)}</span>`)
    : `<span class="c-firma-ph">${o.resaltar ? "✍︎ Firma del cliente (al firmar)" : ""}</span>`;
  const fechaFirma = o.firma?.fecha ? fechaLarga(o.firma.fecha) : "";
  return `
  <div class="c-sign">
    <div class="c-sign-box"><div class="c-sign-lbl">Firma del cliente</div><div class="c-sign-line${o.firma ? " signed" : ""}">${firmaBox}</div><div class="c-sign-id">ID FIRMA (UUID)</div></div>
    <div class="c-sign-box"><div class="c-sign-lbl">Fecha del registro</div><div class="c-sign-line${o.firma ? " signed" : ""}">${fechaFirma || (o.resaltar ? "📅 Al firmar" : "")}</div></div>
  </div>
  <p class="c-foot">Este documento constituye un acuerdo legalmente vinculante entre EL CLIENTE y TRD Agency, en relación con la provisión de servicios de marketing. Al firmar, LAS PARTES se comprometen a cumplir y aceptar los términos y condiciones mencionados. TRD INVESTMENT LLC · Sheridan, Wyoming (EE. UU.).</p>`;
}

/* ---------------- Documento (principal + adicionales) ---------------- */
export function renderContratoCompuesto(principal: string, extras: string[], v: VarsPlanMarketing, o: Opts = {}): string {
  const tpl = plantillaDe(principal);
  const ex = (extras || []).filter((c) => c && c !== principal).map(plantillaDe);
  return `
<article class="contrato-doc">
  ${renderHeader(tpl.tituloDoc)}
  ${renderIntro(v, o)}
  ${renderVigenciaPago(v, o)}
  ${tpl.cuerpo(v, o)}
  ${ex.map((e) => `<div class="c-servicio"><span>Servicio adicional</span><b>${esc(e.nombre)}</b></div>${e.cuerpo(v, o)}`).join("")}
  ${v.anotaciones ? `<h2>Anotaciones</h2><p>${V(esc(v.anotaciones), o)}</p>` : ""}
  ${renderFirma(v, o)}
</article>`;
}

export function renderContrato(plantilla: string, v: VarsPlanMarketing, o: Opts = {}): string {
  return renderContratoCompuesto(plantilla, v.plantillasExtra ?? [], v, o);
}

