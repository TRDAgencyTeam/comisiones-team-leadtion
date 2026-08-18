import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/supabase/server";
import { consulta } from "@/lib/db";

/**
 * Rol del usuario autenticado:
 *  - admin: el/los ADMIN_EMAIL (acceso total, elige módulo).
 *  - colaborador: su email coincide con un colaborador activo → portal CS limitado.
 *  - sin_acceso: autenticado pero sin colaborador vinculado (contactar admin).
 *  - anonimo: sin sesión (lo maneja el middleware → /login).
 */
export type Rol = "admin" | "colaborador" | "sin_acceso" | "anonimo";

export interface Sesion {
  email: string | null;
  rol: Rol;
  colaboradorId: number | null;
  nombre: string | null;
}

/** Email(es) de administrador. Configurable por env ADMIN_EMAIL (coma-separado). */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL || "cuentas.trd@gmail.com";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function esAdmin(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}

/** Resuelve el rol del usuario actual (consulta colaboradores por email).
 *  Memoizado por request para no repetir el getUser() de Supabase. */
export const sesionActual = cache(async (): Promise<Sesion> => {
  const user = await getUsuario();
  const email = user?.email?.toLowerCase() ?? null;
  if (!email) return { email: null, rol: "anonimo", colaboradorId: null, nombre: null };
  if (esAdmin(email)) return { email, rol: "admin", colaboradorId: null, nombre: null };

  const rows = await consulta(
    `select id, nombre from public.colaboradores
      where lower(email) = lower($1) and activo limit 1`,
    [email],
  );
  if (rows.length) {
    return { email, rol: "colaborador", colaboradorId: Number(rows[0]!.id), nombre: String(rows[0]!.nombre) };
  }
  return { email, rol: "sin_acceso", colaboradorId: null, nombre: null };
});

/**
 * Guard para áreas de administración: si el usuario no es admin, lo saca a su
 * portal (`/cs`). Los anónimos van a /login (aunque el middleware ya los corta).
 */
export async function soloAdmin(): Promise<Sesion> {
  const s = await sesionActual();
  if (s.rol !== "admin") redirect(s.rol === "anonimo" ? "/login" : "/cs");
  return s;
}
