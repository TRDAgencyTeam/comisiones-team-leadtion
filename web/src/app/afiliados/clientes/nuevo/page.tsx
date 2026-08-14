import Link from "next/link";
import { cargarBase } from "@/lib/afiliados";
import { crearClienteAfiliado } from "../../acciones";

export const dynamic = "force-dynamic";

export default async function NuevoClienteAfiliadoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const base = await cargarBase();

  return (
    <main className="wrap">
      <p className="volver"><Link href="/afiliados/clientes">← Clientes</Link></p>
      <header className="page"><h1>Nuevo cliente referido</h1></header>

      <section className="card">
        <form action={crearClienteAfiliado} className="form-vert">
          <div className="form-2col">
            <label>Nombre *<input type="text" name="nombre" required autoFocus placeholder="Nombre completo" /></label>
            <label>Email<input type="email" name="email" placeholder="correo@email.com" /></label>
          </div>
          <div className="form-2col">
            <label>
              Afiliado que lo trajo *
              <select name="afiliadoRef" required defaultValue="">
                <option value="" disabled>Selecciona…</option>
                {base.afiliados.map((a) => (
                  <option key={a.ref} value={a.ref}>{a.nombre} ({a.tipo})</option>
                ))}
              </select>
            </label>
            <label>
              Fecha inicio membresía *
              <input type="date" name="fechaInicio" required />
            </label>
          </div>
          <label>
            Precio de la licencia mensual ($)
            <input type="number" name="precioLicencia" step="0.01" defaultValue={69} />
          </label>

          <div className="nota-info"><b>Servicio contratado (mes 1, opcional).</b> Para agencias, el % de mes 1 se calcula sobre el servicio.</div>
          <div className="form-2col">
            <label>
              Tipo de servicio
              <select name="servicioTipo" defaultValue="">
                <option value="">— Ninguno</option>
                <option value="reactivacion">Reactivación</option>
                <option value="agente_ai">Agente AI</option>
                <option value="text_ai">Text AI</option>
                <option value="voz_ai">Voz AI</option>
              </select>
            </label>
            <label>Precio del servicio ($)<input type="number" name="servicioPrecio" step="0.01" placeholder="Ej: 797" /></label>
          </div>
          <small className="nota-small">Añadir varios servicios llega en la siguiente iteración.</small>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <Link href="/afiliados/clientes" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-primary">Guardar cliente</button>
          </div>
        </form>
      </section>
    </main>
  );
}
