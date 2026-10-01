import "server-only";
import { cookies } from "next/headers";

/**
 * Aviso para el usuario tras una acción del servidor ("Actualizado"). Se deja en
 * una cookie de vida corta; el componente <Avisos /> la lee al refrescar/navegar,
 * muestra la notificación con su sonido y la borra. Llamar SOLO cuando la acción
 * tuvo éxito (antes del redirect/revalidate final).
 *  - sonido "ok":   ding suave (ediciones).
 *  - sonido "caja": caja registradora (ingreso / cliente nuevo → "¡Buen trabajo!").
 */
export async function flash(mensaje = "Actualizado", sonido: "ok" | "caja" = "ok") {
  (await cookies()).set("trd_flash", encodeURIComponent(JSON.stringify({ m: mensaje, s: sonido })), { path: "/", maxAge: 60, sameSite: "lax" });
}
