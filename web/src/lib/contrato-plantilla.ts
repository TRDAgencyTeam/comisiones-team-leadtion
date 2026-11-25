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
  { clave: "plan_marketing", nombre: "Plan Marketing Ads + IA + CRM (Lead Generation)", tituloDoc: "Plan Marketing Lead Generation", disponible: true, cuerpo: cuerpoPlanMarketing },
  { clave: "meta_ads", nombre: "Meta Ads", tituloDoc: "Meta Ads", disponible: true, cuerpo: cuerpoMetaAds },
  { clave: "google_ads", nombre: "Google Ads", tituloDoc: "Google Ads", disponible: true, cuerpo: cuerpoGoogleAds },
  { clave: "social_media", nombre: "Social Media Marca Personal", tituloDoc: "Social Media — Marca Personal Realtor", disponible: true, cuerpo: cuerpoSocial },
  { clave: "grabacion", nombre: "Grabación de contenido", tituloDoc: "Grabación audiovisual de contenido", disponible: true, cuerpo: cuerpoGrabacion },
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
  <p>El valor del servicio será:</p>
  <ul class="c-pagos">${pagos}</ul>
  <p class="c-mini">Los honorarios de LA AGENCIA se pagan de manera anticipada al inicio de cada ciclo. ${v.cobrosAuto ? "Al realizar el primer pago, EL CLIENTE autoriza los cobros automáticos de los siguientes ciclos mediante Stripe. " : ""}La inversión en pauta publicitaria no está incluida y será asumida por EL CLIENTE. Los valores vencidos podrán generar un cargo por mora del 1 % semanal, y tras veinte (20) días de mora LA AGENCIA podrá suspender el servicio. EL CLIENTE podrá solicitar reembolso dentro de las 48 horas posteriores a la compra, siempre que no se hayan iniciado trabajos; luego los pagos no son reembolsables. En planes mensuales, cancelar antes de completar la permanencia genera una penalidad del 30 % de los honorarios de los meses restantes, con aviso de al menos 15 días.</p>`;
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

/* ---------------- Cuerpos por servicio (solo cláusulas) ---------------- */
function cuerpoPlanMarketing(): string {
  return `
  <h2>Objeto del contrato</h2>
  <p>LA AGENCIA prestará a EL CLIENTE un servicio integral de marketing inmobiliario que incluye estrategia y gestión de campañas en Meta Ads, producción y edición de piezas publicitarias, configuración de Leadtion CRM, implementación de un Agente de IA Precalificador y automatizaciones y seguimiento inicial de los leads generados. El objetivo es atraer prospectos, precalificarlos y aumentar las oportunidades de llamadas, citas o reuniones.</p>
  <p>El servicio no incluye Social Media orgánico, email marketing, grabación profesional, gestión de mensajes directos, atención humana permanente de leads ni otros servicios no incluidos expresamente en la propuesta comercial.</p>
  <h2>Alcance de Meta Ads</h2>
  <p>LA AGENCIA desarrollará un plan publicitario y una estrategia de comunicación, presentados durante las primeras dos semanas. Definirá la cantidad de guiones y piezas según la estrategia, el presupuesto y el mercado objetivo; realizará el diseño y la edición de imágenes y videos; y EL CLIENTE tendrá derecho a una ronda consolidada de modificaciones por grupo de piezas. Las campañas se implementan dentro de la cuenta publicitaria de EL CLIENTE con la metodología de TRD Agency. EL CLIENTE no debe modificar campañas, anuncios, públicos o presupuestos sin informar previamente a LA AGENCIA, que no será responsable por cambios hechos directamente por EL CLIENTE o terceros.</p>
  <h2>Leadtion CRM</h2>
  <p>Mientras el plan permanezca activo, EL CLIENTE tendrá acceso a Leadtion CRM (email marketing, contactos ilimitados, pipelines, landing pages, conexión con Meta Ads, hasta tres usuarios, calendarios, SMS y llamadas, número virtual cuando aplique, automatizaciones para WhatsApp/Instagram/Facebook/TikTok, app móvil y Learning Leadtion). La licencia, cuyo valor regular es de USD 69 mensuales, está incluida mientras el plan de marketing esté activo. El acceso a email marketing no incluye la redacción, diseño o automatización de campañas de correo (se contratan aparte).</p>
  <h2>Agente de IA Precalificador</h2>
  <p>El plan incluye la configuración y gestión de un (1) Agente de IA dentro de Leadtion CRM, que podrá responder mensajes, precalificar, clasificar leads, facilitar el agendamiento, notificar cuando se requiera intervención humana y ejecutar seguimientos. La implementación inicial del Agente, del CRM y de las automatizaciones está incluida; no se cobra setup adicional. Agentes adicionales o funciones no contempladas podrán cotizarse por separado. El plan no incluye una garantía especial de devolución por el desempeño del Agente de IA.</p>
  <h2>Soporte, obligaciones y resultados</h2>
  <p>Mientras el plan esté activo, LA AGENCIA dará soporte sobre las configuraciones de Leadtion CRM, el Agente de IA, pipelines, automatizaciones y conexiones de campañas (no nuevos desarrollos ni cambios de estrategia, que se cotizan aparte). EL CLIENTE deberá entregar oportunamente accesos, información y materiales; aprobar guiones y configuraciones; mantener activo el método de pago de la pauta y saldo para mensajería e IA; atender oportunamente a los leads; y cumplir las políticas de Meta y WhatsApp. LA AGENCIA optimizará las campañas pero no garantiza una cantidad exacta de leads, citas, ventas o retorno de inversión.</p>
  <h2>Reportes, costos de terceros y continuidad</h2>
  <p>LA AGENCIA enviará un reporte semanal vía WhatsApp y podrá realizar 1–2 reuniones mensuales (excepto el mes 1). Horario de soporte UTC-5. Los consumos de WhatsApp, SMS, IA, correos, números y dominios dependen del uso y los asume EL CLIENTE. Al finalizar el plan, EL CLIENTE podrá: mantener solo Leadtion CRM por USD 69/mes; Soporte Avanzado + Licencia por USD 119/mes; Soporte Premium + Licencia por USD 157/mes; migrar a GoHighLevel (con costo); o cancelar. Cuenta con 15 días para informar la opción de continuidad.</p>
  <h2>Seguridad y aceptación</h2>
  <p>LA AGENCIA mantendrá confidencialidad sobre las bases de datos, leads y accesos de EL CLIENTE. Los datos de pago son administrados por Stripe y Meta; LA AGENCIA no los almacena ni manipula. La propuesta comercial y las aprobaciones escritas complementan este contrato; ante diferencias de valor, fechas o entregables, prevalecerá la propuesta comercial aceptada por EL CLIENTE. La firma física o electrónica representa la aceptación total de estos términos.</p>`;
}

function cuerpoMetaAds(): string {
  return `
  <h2>Objeto del servicio — Meta Ads</h2>
  <p>LA AGENCIA prestará un servicio de estrategia y gestión de campañas publicitarias en Meta Ads (Facebook e Instagram) con el objetivo de fortalecer la presencia digital de EL CLIENTE y generar leads. Solo se consideran incluidos los entregables establecidos en este contrato y en la propuesta comercial.</p>
  <h2>Alcance de Meta Ads</h2>
  <p>LA AGENCIA desarrollará el plan publicitario y la estrategia durante las primeras semanas. La cantidad de guiones, anuncios y piezas se definirá según la estrategia, el presupuesto y el mercado. Los guiones incluirán instrucciones y referencias de grabación; EL CLIENTE podrá solicitar ajustes (los cambios de gancho o CTA requieren aprobación de LA AGENCIA). LA AGENCIA hará el diseño y edición de videos e imágenes; EL CLIENTE tendrá una ronda consolidada de modificaciones por grupo de piezas. Podrá desarrollar landing pages cuando sean necesarias. La segmentación y optimización siguen la metodología de TRD Agency; EL CLIENTE no debe modificar campañas, públicos o presupuestos sin aviso, y LA AGENCIA no será responsable por cambios hechos directamente por EL CLIENTE o terceros.</p>
  <h2>Activos, seguridad y precios</h2>
  <p>EL CLIENTE conservará los creativos y materiales compartidos en el drive y tendrá hasta un mes tras finalizar para descargarlos. LA AGENCIA aplica medidas de seguridad sobre los activos digitales y garantiza la confidencialidad de bases de datos y leads; los métodos de pago de la cuenta publicitaria son encriptados por Meta y nunca manipulados por la agencia. Los precios del plan son especiales; cambios o cancelaciones en los servicios pueden afectar el valor pactado.</p>`;
}

function cuerpoGoogleAds(): string {
  return `
  <h2>Objeto — Google Ads</h2>
  <p>LA AGENCIA prestará servicios de estrategia, implementación, supervisión y optimización de campañas en Google Ads. La contratación corresponde a gestión publicitaria; no incluye la operación comercial ni el cierre de ventas de EL CLIENTE.</p>
  <h2>Ciclos, alcance de implementación y optimización</h2>
  <p>El servicio se contrata por ciclos de tres (3) meses consecutivos y se renueva automáticamente por otro ciclo salvo aviso previo. La implementación tiene un plazo estimado de dos (2) semanas desde la entrega de accesos e información. El alcance incluye investigación de palabras clave, análisis de competencia, creación y configuración de campañas de búsqueda (y otras según estrategia), definición de concordancias y de las acciones de conversión a medir. Desde el segundo mes se incluye optimización de campañas, palabras clave y pujas; la cantidad de campañas y piezas se define en el plan. Las campañas en YouTube podrán activarse según presupuesto y estrategia. Se enviará seguimiento semanal o quincenal vía WhatsApp y un reporte del período.</p>
  <h2>Honorarios, CRM y web de terceros</h2>
  <p>La inversión en Google Ads no está incluida en los honorarios y la paga directamente EL CLIENTE; el honorario mensual aplica a presupuestos publicitarios hasta el límite indicado en la propuesta. Si EL CLIENTE usa un CRM o software de terceros, es responsable de que ese sistema reciba, almacene y asigne correctamente la información; LA AGENCIA podrá apoyar con recomendaciones. Si la web de EL CLIENTE fue diseñada o es administrada por un tercero, esa responsabilidad (velocidad, disponibilidad, hosting, etc.) es de EL CLIENTE; LA AGENCIA auditará las páginas de destino desde una perspectiva publicitaria pero no incluye diseño ni desarrollo web.</p>`;
}

function cuerpoSocial(): string {
  return `
  <h2>Calidad y resultados — Social Media</h2>
  <p>El éxito se mide con base en el alcance de las publicaciones y la retención de la audiencia. EL CLIENTE debe atender oportunamente a los leads, garantizar buenas prácticas al grabar el contenido y llevar sus procesos comerciales para convertir los leads en clientes.</p>
  <h2>Servicios y alcances</h2>
  <p>El servicio de Social Media Marca Personal incluye: estrategia de contenido mensual alineada con los objetivos de la marca personal; desarrollo de ideas y pilares de contenido; reuniones estratégicas quincenales (cada 15–30 días); redacción de guiones y escenas; adaptación al estilo, voz y estética de EL CLIENTE; foco en Reels y Carruseles para maximizar el alcance orgánico; gestión de 3 publicaciones por semana (diez (10) Reels/TikToks y dos (2) publicaciones estáticas o carruseles al mes); calendario de contenido mensual; adaptación de los Reels a TikTok; y acceso a TRD Academy durante la vigencia.</p>
  <p>La inversión para promocionar publicaciones es variable, se define en la reunión inicial y corre por cuenta exclusiva de EL CLIENTE. Al enfocarse en marca personal, EL CLIENTE es responsable de capturar y entregar el material audiovisual bruto según los guiones (salvo que contrate el servicio de grabación profesional). LA AGENCIA notificará cuando el contenido editado esté disponible en el drive; EL CLIENTE dispone de 24 horas antes de la publicación programada para solicitar cambios o aprobar — de no responder, el contenido se dará por aprobado y se publicará (aprobación tácita), sin modificaciones posteriores. La gestión de comentarios es básica y reactiva; la respuesta de cierre de ventas y los mensajes directos (DM) son responsabilidad de EL CLIENTE.</p>
  <h2>Activos, seguridad y precios</h2>
  <p>EL CLIENTE conservará los creativos y materiales compartidos en el drive y tendrá hasta un mes tras finalizar para descargarlos. LA AGENCIA aplica medidas de seguridad y garantiza la confidencialidad de bases de datos y leads. Los precios del plan son especiales; cambios o cancelaciones en los servicios pueden afectar el valor pactado.</p>`;
}

function cuerpoGrabacion(): string {
  return `
  <h2>Servicios y alcance — Grabación audiovisual de contenido</h2>
  <p>El servicio consiste en una (1) sesión de grabación profesional de tres (3) horas, con un valor de USD 400 por sesión. LA AGENCIA dispone de un videógrafo profesional con cámara y equipos. Según la ubicación y las condiciones logísticas del día, se podrán grabar entre cinco (5) y siete (7) videos por sesión (contenido orgánico o de anuncios). El videógrafo recibirá previamente los guiones e instrucciones. La sesión podrá ejecutarse en Orlando o en Miami, en exteriores o interiores definidos por el equipo.</p>
  <p>Cancelaciones e inasistencia: EL CLIENTE deberá avisar con mínimo veinticuatro (24) horas para cancelar o reprogramar. Si no asiste, la sesión se da por ejecutada y no es reembolsable ni reprogramable, debiendo pagar nuevamente los USD 400 para una nueva sesión. Puntualidad: las tres (3) horas se cuentan desde la hora pactada, sin importar la hora de llegada del cliente; el retraso no extiende la sesión y puede reducir la cantidad de videos. EL CLIENTE debe prepararse y llegar con los guiones en mente.</p>
  <p>Locaciones y costos: las autorizaciones para grabar en espacios privados y los permisos las gestiona EL CLIENTE. Los costos de acceso, parqueadero, peajes, entradas o permisos corren por cuenta de EL CLIENTE. Las sesiones fuera del área metropolitana de Orlando o Miami deben consultarse y pueden generar un costo adicional de desplazamiento. La sesión se ejecuta de forma continua en un (1) solo día y una sola franja horaria. En caso de clima adverso o fuerza mayor, podrá reprogramarse sin penalidad. Toda negociación y agendamiento se hace exclusivamente con la agencia (el videógrafo no negocia tarifas ni alcances). La edición está a cargo de la agencia. La sesión no es acumulable y debe agendarse dentro de un máximo de veinte (20) días.</p>`;
}
