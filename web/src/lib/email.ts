import "server-only";

/**
 * Envío de correo transaccional vía Resend (API REST, sin SDK).
 *
 * Config por variables de entorno (NUNCA en el código):
 *   RESEND_API_KEY  → la API key de Resend (https://resend.com/api-keys)
 *   RESEND_FROM     → remitente verificado, ej. "TRD Investment <pagos@tudominio.com>"
 *
 * Si faltan las variables, lanza un error claro para que el usuario configure el
 * proveedor (no revienta el resto de la app).
 */

export interface CorreoParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export function emailConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM;
}

export async function enviarEmail({ to, subject, html, replyTo }: CorreoParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "Correo no configurado: falta RESEND_API_KEY y/o RESEND_FROM en las variables de entorno.",
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`Resend respondió ${res.status}: ${detalle.slice(0, 300)}`);
  }
}

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/** Arma el asunto + HTML del correo de pago a un colaborador. */
export function plantillaCorreoPago(datos: {
  nombre: string;
  mesLabel: string;
  valorCuentaCobro: number;
  reteIca: number;
  reteRenta: number;
  valorGirar: number;
}): { subject: string; html: string } {
  const { nombre, mesLabel, valorCuentaCobro, reteIca, reteRenta, valorGirar } = datos;
  const subject = `Pago realizado — ${mesLabel}`;
  const fila = (lbl: string, val: string, fuerte = false) =>
    `<tr>
       <td style="padding:8px 0;color:#586274;font-size:14px">${lbl}</td>
       <td style="padding:8px 0;text-align:right;font-size:14px;${fuerte ? "font-weight:700" : ""}">${val}</td>
     </tr>`;
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#141922">
    <p style="font-size:15px">Hola ${nombre},</p>
    <p style="font-size:15px">Te confirmamos que se realizó el pago correspondiente a <strong>${mesLabel}</strong>. Este es el detalle:</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e7ee;border-bottom:1px solid #e2e7ee;margin:14px 0">
      ${fila("Valor cuenta de cobro", cop(valorCuentaCobro))}
      ${fila("Retención de ICA", cop(reteIca))}
      ${fila("Retención de renta", cop(reteRenta))}
      ${fila("Valor girado", cop(valorGirar), true)}
    </table>
    <p style="font-size:13px;color:#586274">Cualquier duda, responde a este correo.</p>
    <p style="font-size:13px;color:#586274">TRD Investment</p>
  </div>`;
  return { subject, html };
}
