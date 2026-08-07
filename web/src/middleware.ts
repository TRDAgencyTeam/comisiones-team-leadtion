import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas EXCEPTO estáticos, imágenes y fuentes:
     * - _next/static, _next/image, favicon, assets de /brand (imágenes/fuentes).
     * OJO: incluir las extensiones de fuente (otf/woff/woff2/ttf) o el middleware
     * redirige los archivos de fuente al login y no cargan.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|otf|ttf|woff|woff2|eot)$).*)",
  ],
};
