import Link from "next/link";
import type { Colaborador } from "@/lib/colaboradores";

/**
 * Formulario compartido para crear/editar un colaborador. Sin JS de cliente:
 * la categoría incluye "ninguna" para admin/comercial; la fecha de fin de prueba
 * se calcula sola en el servidor (ingreso + 3 meses para "nuevo").
 */
export function ColaboradorForm({
  action,
  colaborador,
  error,
  textoBoton,
}: {
  action: (formData: FormData) => void;
  colaborador?: Colaborador;
  error?: string;
  textoBoton: string;
}) {
  return (
    <form action={action} className="form-vert">
      {colaborador && <input type="hidden" name="id" value={colaborador.id} />}

      <label>
        Nombre *
        <input type="text" name="nombre" required defaultValue={colaborador?.nombre ?? ""} autoFocus />
      </label>

      <label>
        Email de acceso al portal
        <input type="email" name="email" defaultValue={colaborador?.email ?? ""} placeholder="colaborador@correo.com" />
        <small>Debe ser el mismo email de su usuario en Supabase Auth. Con él entra directo a su portal de CS.</small>
      </label>

      <label>
        Rol
        <select name="rol" defaultValue={colaborador?.rol ?? "cs"}>
          <option value="cs">CS (customer success)</option>
          <option value="comercial">Comercial</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      <label>
        Categoría (solo CS que comisiona)
        <select name="categoria" defaultValue={colaborador?.categoria ?? ""}>
          <option value="">— Ninguna (admin/comercial)</option>
          <option value="fundador">Fundador</option>
          <option value="nuevo">Nuevo</option>
        </select>
        <small>Fundador comisiona desde el 1-mar-2026; Nuevo desde su fecha de ingreso.</small>
      </label>

      <label>
        Fecha de ingreso
        <input type="date" name="fechaIngreso" defaultValue={colaborador?.fechaIngreso ?? ""} />
        <small>Para “Nuevo”, la prueba de 3 meses se calcula sola desde esta fecha.</small>
      </label>

      {error && <p className="login-error">{error}</p>}

      <div className="form-actions">
        <Link href="/cs/colaboradores" className="btn-secondary">Cancelar</Link>
        <button type="submit" className="btn-primary">{textoBoton}</button>
      </div>
    </form>
  );
}
