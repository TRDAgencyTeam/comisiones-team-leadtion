import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para el servidor (Server Components, Server Actions, Route
 * Handlers). Lee/escribe la sesión desde las cookies de la petición. Usa la
 * clave pública (anon), segura de exponer.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Llamado desde un Server Component: la escritura de cookies se hace
            // en el middleware (updateSession). Se puede ignorar aquí.
          }
        },
      },
    },
  );
}

/** Devuelve el usuario autenticado o null. Atajo usado por las páginas admin. */
export async function getUsuario() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
