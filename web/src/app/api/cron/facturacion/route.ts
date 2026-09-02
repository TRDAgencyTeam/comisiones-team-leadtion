import { asegurarRecurrentesDelMes, mesActualISO } from "@/lib/facturacion";

/**
 * Cron del día 1: genera las facturas recurrentes del mes en curso. Vercel lo
 * llama con Authorization: Bearer $CRON_SECRET (si CRON_SECRET está en las envs).
 * Igual la vista genera los recurrentes al abrir el mes (lazy), así que esto es
 * un respaldo para que el mes quede listo aunque nadie entre.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 });
  }
  const mes = mesActualISO();
  const creadas = await asegurarRecurrentesDelMes(mes);
  return Response.json({ ok: true, mes, creadas });
}
