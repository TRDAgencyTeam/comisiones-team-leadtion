import { consulta } from "@/lib/db";
import { hoyISO } from "@/lib/fecha";
import { enviarEmail, emailConfigurado, plantillaRecordatorioFacturas, type FacturaRecordatorio } from "@/lib/email";

/**
 * Cron diario (8 a.m. Colombia) de recordatorios de FACTURACIÓN. Revisa las facturas
 * que están en "por_facturar" o "programado" con fecha de facturación, y envía un
 * correo a la persona encargada y al host con tres secciones:
 *   - Para mañana (1 día antes, para prepararlas).
 *   - Para hoy (hay que facturarlas hoy).
 *   - Vencidas: ya pasó su fecha y NO se marcaron como facturadas → "por favor hazla".
 * Como corre a diario, una factura vencida se vuelve a recordar cada día hasta que se
 * marque como Facturado/Pagado (o se anule). Vercel lo llama con Authorization: Bearer
 * $CRON_SECRET (si CRON_SECRET está en las envs).
 */

/** Destinatarios: host + encargada de facturación. Configurable por env (CSV). */
const DESTINATARIOS = (process.env.RECORDATORIO_FACTURAS_TO
  || "cuentas.trd@gmail.com,mvargas@turincondigital.com")
  .split(",").map((s) => s.trim()).filter(Boolean);

/** Suma n días a un "YYYY-MM-DD" (aritmética de fecha, sin zona horaria). */
function sumarDia(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const hoy = hoyISO();
  const manana = sumarDia(hoy, 1);

  // Facturas que todavía hay que HACER (no las ya facturadas/pagadas/anuladas).
  const rows = await consulta(
    `select cliente_nombre, servicios, coalesce(facturado,0)::float facturado, entidad,
            to_char(fecha_factura,'YYYY-MM-DD') ff
       from public.factura_mensual
      where estado in ('por_facturar','programado') and fecha_factura is not null
      order by fecha_factura, cliente_nombre`,
  );

  const map = (r: Record<string, unknown>): FacturaRecordatorio => ({
    clienteNombre: String(r.cliente_nombre ?? "—"),
    servicios: (r.servicios as string) ?? null,
    facturado: Number(r.facturado),
    entidad: String(r.entidad ?? "LLC"),
    fecha: String(r.ff),
  });

  const vencidas: FacturaRecordatorio[] = [];
  const deHoy: FacturaRecordatorio[] = [];
  const deManana: FacturaRecordatorio[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const f = map(r);
    if (f.fecha < hoy) vencidas.push(f);
    else if (f.fecha === hoy) deHoy.push(f);
    else if (f.fecha === manana) deManana.push(f);
    // fechas más lejanas: todavía no se recuerdan.
  }

  const total = vencidas.length + deHoy.length + deManana.length;
  if (total === 0) {
    return Response.json({ ok: true, hoy, enviado: false, motivo: "nada pendiente" });
  }
  if (!emailConfigurado()) {
    return Response.json({ ok: false, hoy, enviado: false, motivo: "correo no configurado (RESEND_API_KEY/RESEND_FROM)", vencidas: vencidas.length, hoyN: deHoy.length, manana: deManana.length });
  }

  const { subject, html } = plantillaRecordatorioFacturas({ manana: deManana, hoy: deHoy, vencidas, fechaHoy: hoy });
  await enviarEmail({ to: DESTINATARIOS, subject, html });

  return Response.json({
    ok: true, hoy, enviado: true, destinatarios: DESTINATARIOS,
    vencidas: vencidas.length, hoyN: deHoy.length, manana: deManana.length,
  });
}
