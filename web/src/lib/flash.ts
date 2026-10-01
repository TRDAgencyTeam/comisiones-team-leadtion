import "server-only";
import { cookies } from "next/headers";

/**
 * Aviso para el usuario tras una acción del servidor ("Actualizado"). Se deja en
 * una cookie de vida corta; el componente <Avisos /> la lee al refrescar/navegar,
 * muestra la notificación y la borra. Llamar SOLO cuando la acción tuvo éxito
 * (antes del redirect/revalidate final).
 */
export async function flash(mensaje = "Actualizado") {
  (await cookies()).set("trd_flash", encodeURIComponent(mensaje), { path: "/", maxAge: 60, sameSite: "lax" });
}
