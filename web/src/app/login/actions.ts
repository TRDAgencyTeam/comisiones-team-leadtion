"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Inicia sesión con email + contraseña vía Supabase Auth. */
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Ingresa email y contraseña."));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Distinguir "contraseña incorrecta" de un problema de configuración, para
    // no diagnosticar a ciegas.
    const msg = /invalid login credentials/i.test(error.message)
      ? "Email o contraseña incorrectos."
      : `Error de acceso: ${error.message}`;
    redirect("/login?error=" + encodeURIComponent(msg));
  }

  redirect("/");
}

/** Cierra la sesión. */
export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
