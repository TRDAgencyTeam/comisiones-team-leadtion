/**
 * Plantillas de contrato (puro, cliente + servidor). El clausulado es FIJO; solo se
 * inyectan las variables (cliente, fechas, permanencia, forma de pago, anotaciones).
 * `renderContrato` devuelve el HTML del documento; con `resaltar` marca las variables
 * (vista previa del editor) y sin él queda limpio (PDF/firma).
 */

/** Línea de pago: concepto + monto NUMÉRICO (para poder sumar el valor del contrato).
 *  La divisa es a nivel de contrato (`moneda`). `nota` es texto libre opcional
 *  (ej. "o $1.500/mes") que no entra en la suma. */
export interface PagoLinea { concepto: string; monto: number; nota?: string }

export const MONEDAS = ["USD", "COP", "EUR", "MXN"] as const;

export interface VarsPlanMarketing {
  clienteNombre: string;
  clienteEmail?: string | null;
  clienteDomicilio?: string | null;
  meses: string;            // ej. "4"
  bono?: boolean;           // (obsoleto; ya no se usa en la UI)
  moneda: string;           // USD | COP | EUR | MXN (default USD)
  fechaInicio?: string | null;     // YYYY-MM-DD
  fechaCampanas?: string | null;   // opcional
  fechaFin?: string | null;
  notaEspecial?: string | null;
  pagos: PagoLinea[];
  cobrosAuto: boolean;
  anotaciones?: string | null;
}

/** Formatea un monto con su divisa. COP sin decimales; el resto con 2. */
export function fmtMoneda(monto: number, moneda = "USD"): string {
  const m = Number(monto) || 0;
  try {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: moneda === "COP" ? 0 : 2 }).format(m);
  } catch { return `${m} ${moneda}`; }
}

export interface FirmaContrato { tipo: "dibujo" | "texto"; data: string; fuente?: string; fecha?: string }

export const PLANTILLAS: { clave: string; nombre: string; disponible: boolean }[] = [
  { clave: "plan_marketing", nombre: "Plan Marketing Ads + IA + CRM (Lead Generation)", disponible: true },
  { clave: "agente_ai", nombre: "Agente IA Precalificado", disponible: false },
  { clave: "reactivacion", nombre: "Reactivación Base P2P", disponible: false },
];

const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaLarga(iso?: string | null): string {
  if (!iso) return "__________";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${+m[3]} de ${MES[+m[2] - 1]} de ${m[1]}`;
}
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function varsPlanMarketingVacias(): VarsPlanMarketing {
  return {
    clienteNombre: "", clienteEmail: "", clienteDomicilio: "Florida, EE. UU.",
    meses: "4", moneda: "USD", fechaInicio: null, fechaCampanas: null, fechaFin: null, notaEspecial: "",
    pagos: [{ concepto: "Primer mes", monto: 1400 }, { concepto: "Meses 2 a 4 (c/u)", monto: 897 }],
    cobrosAuto: true, anotaciones: "",
  };
}

/** Total numérico del contrato (suma de los montos de las líneas de pago). */
export function totalContrato(v: VarsPlanMarketing): number {
  return (v.pagos || []).reduce((s, p) => s + (Number(p.monto) || 0), 0);
}

/** Resumen corto del valor y la vigencia (para la lista y el detalle). */
export function resumenPlanMarketing(v: VarsPlanMarketing): { valor: string; vigencia: string; total: number } {
  const total = totalContrato(v);
  return { valor: fmtMoneda(total, v.moneda), vigencia: `${v.meses} meses`, total };
}

type Opts = { resaltar?: boolean; firma?: FirmaContrato | null };

/** Marca una variable: resaltada en el editor, normal en el final. */
function V(txt: string, o: Opts): string {
  return o.resaltar ? `<span class="cvar">${txt}</span>` : txt;
}

export function renderContrato(plantilla: string, v: VarsPlanMarketing, o: Opts = {}): string {
  // Hoy solo existe la plantilla de Plan Marketing; las demás se agregan igual.
  return renderPlanMarketing(v, o);
}

function fixed(html: string): string { return html; }

export function renderPlanMarketing(v: VarsPlanMarketing, o: Opts = {}): string {
  const nom = V(esc(v.clienteNombre || "__________"), o);
  const dom = V(esc(v.clienteDomicilio || "__________"), o);
  const mail = v.clienteEmail ? ` ${V(`(${esc(v.clienteEmail)})`, o)}` : "";
  const perm = V(`${esc(v.meses)} meses`, o);
  const ini = V(fechaLarga(v.fechaInicio), o);
  const camp = v.fechaCampanas ? V(fechaLarga(v.fechaCampanas), o) : "";
  const fin = V(fechaLarga(v.fechaFin), o);
  const lineas = (v.pagos || []).filter((p) => p.concepto || p.monto);
  const pagos = (lineas.map((p) =>
      `<li><span>${esc(p.concepto) || "—"}${p.nota ? ` <small>(${esc(p.nota)})</small>` : ""}</span><b>${V(fmtMoneda(p.monto, v.moneda), o)}</b></li>`).join("")
    + (lineas.length ? `<li class="c-total"><span>Total</span><b>${V(fmtMoneda(totalContrato(v), v.moneda), o)}</b></li>` : "")) || "<li><span>—</span></li>";
  const firmaBox = o.firma
    ? (o.firma.tipo === "dibujo"
      ? `<img src="${esc(o.firma.data)}" alt="firma" class="c-firma-img">`
      : `<span class="c-firma-ink" style="font-family:${o.firma.fuente || "'Dancing Script'"},cursive">${esc(o.firma.data)}</span>`)
    : `<span class="c-firma-ph">${o.resaltar ? "✍︎ Firma del cliente (al firmar)" : ""}</span>`;
  const fechaFirma = o.firma?.fecha ? fechaLarga(o.firma.fecha) : "";

  return `
<article class="contrato-doc">
  <header class="c-head">
    <div class="c-brands">
      <img src="/brand/trd/trd-logo-black.png" alt="TRD Agency" class="c-logo c-logo-trd">
      <img src="/brand/leadtion-logo-black.png" alt="Leadtion" class="c-logo c-logo-lt">
    </div>
    <span class="c-tag">Contrato · Lead Gen</span>
  </header>

  <h1 class="c-title">CONTRATO DE PRESTACIÓN DE SERVICIOS</h1>
  <p class="c-plan">TRD Agency — Plan Marketing Lead Generation</p>

  <p>Entre <b>TRD INVESTMENT LLC</b>, comercialmente conocida como <b>TRD Agency</b> (en adelante, <i>LA AGENCIA</i>), y ${nom}${mail}, con domicilio en ${dom} (en adelante, <i>EL CLIENTE</i>), quienes en conjunto serán denominados <i>LAS PARTES</i>, se acuerdan los siguientes términos:</p>

  <h2>1. Objeto del contrato</h2>
  ${fixed(`<p>1.1. LA AGENCIA prestará a EL CLIENTE un servicio integral de marketing inmobiliario que incluye:</p>
  <ol class="c-abc"><li>Estrategia y gestión de campañas publicitarias en Meta Ads.</li><li>Producción y edición de piezas publicitarias.</li><li>Configuración de Leadtion CRM.</li><li>Implementación de un Agente de IA Precalificador.</li><li>Automatizaciones y seguimiento inicial de los leads generados.</li></ol>
  <p>1.2. El servicio tiene como objetivo atraer prospectos, facilitar su atención, precalificarlos y aumentar las oportunidades de llamadas, citas o reuniones comerciales.</p>
  <p>1.3. El servicio no incluye Social Media orgánico, email marketing, grabación profesional, gestión de mensajes directos, atención humana permanente de leads ni otros servicios no incluidos expresamente en la propuesta comercial.</p>`)}

  <h2>2. Vigencia y permanencia</h2>
  <p>2.1. El contrato tendrá una permanencia mínima de ${perm}.</p>
  <p>2.2. La vigencia comenzará en la fecha de inicio indicada a continuación:</p>
  <ul class="c-fechas">
    <li><span>Fecha de inicio:</span> <b>${ini}</b></li>
    ${camp ? `<li><span>Inicio de campañas:</span> <b>${camp}</b></li>` : ""}
    <li><span>Fecha de finalización:</span> <b>${fin}</b></li>
  </ul>
  ${v.notaEspecial ? `<p class="c-nota">${V(esc(v.notaEspecial), o)}</p>` : ""}
  ${fixed(`<p>2.3. Los tiempos de implementación comienzan una vez EL CLIENTE haya realizado el pago y entregado los accesos, materiales, información y aprobaciones solicitadas.</p>
  <p>2.4. Los retrasos atribuibles a EL CLIENTE no modificarán las fechas de cobro ni extenderán automáticamente la vigencia contractual.</p>`)}

  <h2>3. Inversión y formas de pago</h2>
  <p>3.1. El valor del servicio será:</p>
  <ul class="c-pagos">${pagos}</ul>
  <p class="c-mini">Estos valores podrán variar únicamente cuando la propuesta comercial aceptada por EL CLIENTE establezca condiciones diferentes.</p>
  ${fixed(`<p>3.2. Los honorarios de LA AGENCIA se pagan de manera anticipada al inicio de cada ciclo mensual.</p>
  <p>3.3. La inversión en pauta publicitaria no está incluida en los honorarios de LA AGENCIA y será asumida directamente por EL CLIENTE.</p>
  <p>3.4. El presupuesto publicitario recomendado se definirá durante el proceso inicial, considerando el mercado, país, estrategia y objetivos comerciales.</p>`)}
  ${v.cobrosAuto ? `<p>3.5. Al realizar el primer pago, EL CLIENTE autoriza los cobros automáticos de los siguientes ciclos mediante Stripe.</p>` : ""}
  ${fixed(`<p>3.6. Si el método de pago vence, es rechazado o presenta algún inconveniente, EL CLIENTE deberá actualizarlo y regularizar el pago dentro de los cinco (5) días calendario siguientes a la fecha de vencimiento.</p>
  <p>3.7. Los valores vencidos podrán generar un cargo por mora del uno por ciento (1 %) semanal sobre el saldo pendiente.</p>
  <p>3.8. Cuando un pago permanezca pendiente durante más de veinte (20) días calendario, LA AGENCIA podrá suspender las campañas, el soporte, Leadtion CRM y las demás actividades contratadas hasta que el pago sea regularizado.</p>
  <p>3.9. Los consumos de publicidad, mensajería, inteligencia artificial, telefonía y demás servicios de terceros no son reembolsables una vez utilizados.</p>`)}

  <h2>4. Alcance del servicio de Meta Ads</h2>
  ${fixed(`<p>4.1. LA AGENCIA desarrollará un plan publicitario y una estrategia de comunicación, presentados durante las primeras dos semanas, siempre que EL CLIENTE haya entregado oportunamente la información requerida.</p>
  <p>4.2. LA AGENCIA definirá la cantidad de guiones y piezas publicitarias según la estrategia acordada, el presupuesto, el mercado objetivo y las necesidades de optimización.</p>
  <p>4.3. Los guiones incluirán instrucciones, escenas y referencias para facilitar su grabación. EL CLIENTE podrá solicitar ajustes; los cambios en el gancho, enfoque o llamado a la acción deberán ser aprobados por LA AGENCIA.</p>
  <p>4.4. LA AGENCIA realizará el diseño y la edición de imágenes y videos publicitarios conforme a la identidad visual y la estrategia de EL CLIENTE. EL CLIENTE tendrá derecho a una ronda consolidada de modificaciones por cada grupo de piezas.</p>
  <p>4.5. Las campañas serán implementadas dentro de la cuenta publicitaria de EL CLIENTE, con la metodología de TRD Agency. EL CLIENTE no deberá modificar campañas, anuncios, públicos o presupuestos sin informar previamente a LA AGENCIA, que no será responsable por cambios hechos directamente por EL CLIENTE o terceros.</p>`)}

  <h2>5. Alcance de Leadtion CRM</h2>
  ${fixed(`<p>5.1. Mientras el plan de marketing permanezca activo, EL CLIENTE tendrá acceso a Leadtion CRM: email marketing, contactos ilimitados, pipelines, diseñador de landing pages, conexión con Meta Ads, hasta tres usuarios, calendarios, SMS y llamadas, número virtual (cuando aplique), automatizaciones para WhatsApp/Instagram/Facebook/TikTok, aplicación móvil y Learning Leadtion.</p>
  <p>5.2. La licencia de Leadtion CRM, cuyo valor regular es de USD 69 mensuales, estará incluida mientras EL CLIENTE mantenga activo el plan de marketing.</p>
  <p>5.3. LA AGENCIA realizará las configuraciones necesarias para recibir, organizar y gestionar los leads generados por las campañas.</p>
  <p>5.5. El acceso a la herramienta de email marketing no incluye automáticamente la redacción, diseño, programación o automatización de campañas de correo; estos servicios deberán contratarse de manera adicional.</p>`)}

  <h2>6. Agente de IA Precalificador</h2>
  ${fixed(`<p>6.1. El plan incluye la configuración y gestión de un (1) Agente de IA Precalificador dentro de Leadtion CRM, que podrá responder mensajes, formular preguntas de precalificación, interpretar respuestas, clasificar leads, facilitar el agendamiento, notificar cuando se requiera intervención humana y ejecutar seguimientos.</p>
  <p>6.4. LA AGENCIA podrá recomendar una respuesta dentro de los primeros sesenta (60) segundos; EL CLIENTE podrá solicitar un intervalo diferente según su estrategia.</p>
  <p>6.6. La implementación inicial del Agente de IA, del CRM y de las automatizaciones relacionadas está incluida dentro del valor del plan; no se cobrará un setup adicional por estas funciones. Agentes adicionales o funciones no contempladas podrán cotizarse por separado.</p>
  <p>6.8. El presente plan no incluye una garantía especial de devolución relacionada con el funcionamiento o desempeño del Agente de IA.</p>`)}

  <h2>7. Soporte incluido</h2>
  ${fixed(`<p>7.1. Mientras EL CLIENTE mantenga activo el plan, LA AGENCIA proporcionará soporte sobre las configuraciones realizadas para Leadtion CRM, el Agente de IA, pipelines, automatizaciones y conexiones de las campañas.</p>
  <p>7.3. No se incluyen nuevos desarrollos, cambios completos de estrategia, nuevas integraciones o funciones ajenas al alcance inicial; estas solicitudes podrán cotizarse por separado.</p>`)}

  <h2>8. Obligaciones del cliente</h2>
  ${fixed(`<p>8.1. EL CLIENTE deberá entregar oportunamente accesos, información y materiales; aprobar guiones, piezas y configuraciones dentro de los plazos; grabar el contenido conforme a las recomendaciones; mantener activo el método de pago de la pauta y saldo suficiente para mensajería e IA; atender oportunamente a los leads; y cumplir las políticas de Meta, WhatsApp y demás plataformas.</p>
  <p>8.2. EL CLIENTE será responsable de su proceso comercial, seguimiento humano, atención de llamadas, asistencia a citas y cierre de ventas.</p>`)}

  <h2>9. Resultados y medición</h2>
  ${fixed(`<p>9.1. LA AGENCIA desarrollará y administrará la estrategia con el objetivo de generar leads de la mayor calidad posible y aumentar las oportunidades de llamadas, citas o reuniones.</p>
  <p>9.4. Los rangos informados son referencias basadas en la experiencia de LA AGENCIA y no constituyen una promesa de costo o cantidad exacta de leads.</p>
  <p>9.6. LA AGENCIA se compromete a monitorear y optimizar las campañas, pero no garantiza una cantidad exacta de leads, citas, ventas, comisiones o retorno de inversión.</p>`)}

  <h2>10. Reportes, reuniones y atención</h2>
  ${fixed(`<p>10.1. LA AGENCIA enviará un reporte semanal vía WhatsApp sobre el desarrollo general de las campañas.</p>
  <p>10.3. Se podrán realizar entre una (1) y dos (2) reuniones mensuales, según las necesidades de la estrategia (a excepción del mes 1 de inicio).</p>
  <p>10.4. El soporte estará disponible en horario UTC-5: lunes a viernes, 8:00 a. m. a 12:30 p. m. y 2:00 p. m. a 6:00 p. m.; sábados de 8:00 a. m. a 1:00 p. m. LA AGENCIA se regirá por el calendario de días hábiles de Estados Unidos.</p>`)}

  <h2>11. Costos operativos y proveedores externos</h2>
  ${fixed(`<p>11.1. La conexión oficial de WhatsApp API estará incluida mientras el plan de marketing se encuentre activo, cuando aplique.</p>
  <p>11.2. Los costos de plantillas y mensajes de WhatsApp, SMS y llamadas, mensajes de IA, correos, números telefónicos, dominios y servicios adicionales dependerán del uso y serán asumidos por EL CLIENTE.</p>
  <p>11.5. LA AGENCIA apoyará la revisión de bloqueos o inconvenientes, pero no será responsable por decisiones, suspensiones o limitaciones impuestas por Meta, WhatsApp, Stripe u otros proveedores.</p>`)}

  <h2>12. Activos y continuidad de Leadtion CRM</h2>
  ${fixed(`<p>12.1. EL CLIENTE conservará las imágenes, videos, guiones, bases de datos y materiales finales desarrollados dentro del servicio.</p>
  <p>12.5. Al finalizar el plan de marketing, EL CLIENTE podrá elegir entre: (a) mantener únicamente Leadtion CRM por USD 69 mensuales; (b) Plan de Soporte Avanzado + Licencia por USD 119 mensuales; (c) Plan de Soporte Premium + Licencia por USD 157 mensuales; (d) migración compatible a GoHighLevel (con costo); o (e) cancelar completamente Leadtion CRM.</p>
  <p>12.9. EL CLIENTE contará con quince (15) días calendario después de finalizar el servicio para informar la opción de continuidad seleccionada. Si no desea mantener el CRM, autoriza la cancelación y eliminación de la cuenta y su información.</p>`)}

  <h2>13. Cancelación y reembolsos</h2>
  ${fixed(`<p>13.1. EL CLIENTE podrá solicitar la cancelación y devolución de su pago dentro de las primeras cuarenta y ocho (48) horas posteriores a la compra, siempre que LA AGENCIA no haya iniciado trabajos. Después de este período, los pagos realizados no serán reembolsables.</p>
  <p>13.3. (Aplica para pagos mensuales) Si EL CLIENTE cancela antes de completar los cuatro meses, deberá pagar una penalidad equivalente al treinta por ciento (30 %) de los honorarios pendientes de los meses restantes.</p>
  <p>13.4. La cancelación deberá notificarse con al menos quince (15) días calendario antes del siguiente cobro, y no libera a EL CLIENTE del pago de honorarios vencidos, penalidades, consumos de plataformas o trabajos ya realizados.</p>`)}

  <h2>14. Seguridad y confidencialidad</h2>
  ${fixed(`<p>14.1. LA AGENCIA mantendrá confidencialidad sobre las bases de datos, leads, accesos y materiales entregados por EL CLIENTE, y no los compartirá con terceros ajenos al servicio salvo que sea necesario para operar las plataformas o exista autorización de EL CLIENTE.</p>
  <p>14.4. Los datos de pago serán administrados por Stripe y los métodos de pago publicitarios por Meta. LA AGENCIA no almacenará ni manipulará directamente esta información financiera.</p>`)}

  <h2>15. Aceptación</h2>
  ${fixed(`<p>15.1. La propuesta comercial, los formularios de onboarding y las aprobaciones escritas de EL CLIENTE complementan este contrato.</p>
  <p>15.2. En caso de diferencia respecto al valor, fechas o entregables personalizados, prevalecerá la propuesta comercial aceptada por EL CLIENTE.</p>
  <p>15.4. La firma física o electrónica representa la aceptación total de estos términos y condiciones.</p>`)}

  ${v.anotaciones ? `<h2>Anotaciones</h2><p>${V(esc(v.anotaciones), o)}</p>` : ""}

  <div class="c-sign">
    <div class="c-sign-box">
      <div class="c-sign-lbl">Firma del cliente</div>
      <div class="c-sign-line${o.firma ? " signed" : ""}">${firmaBox}</div>
      <div class="c-sign-id">ID FIRMA (UUID)</div>
    </div>
    <div class="c-sign-box">
      <div class="c-sign-lbl">Fecha del registro</div>
      <div class="c-sign-line${o.firma ? " signed" : ""}">${fechaFirma || (o.resaltar ? "📅 Al firmar" : "")}</div>
    </div>
  </div>
  <p class="c-foot">Este documento constituye un acuerdo legalmente vinculante entre EL CLIENTE y TRD Agency, en relación con la provisión de servicios de marketing. Al firmar, LAS PARTES se comprometen a cumplir y aceptar los términos y condiciones mencionados.</p>
</article>`;
}
