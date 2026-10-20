import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMembresia } from "@/lib/membresias";
import { actualizarMembresia } from "../../acciones";
import { EstadoConFecha } from "@/components/EstadoConFecha";

export const dynamic = "force-dynamic";

export default async function EditarMembresiaPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const c = await obtenerMembresia(Number(id));
  if (!c) notFound();

  const apiOp = c.apiEstado === "incluida" ? "incluida"
    : c.apiEstado === "vendida" && c.apiValor === 12 ? "vendida_12"
    : c.apiEstado === "vendida" ? "vendida_10" : "";

  return (
    <main className="wrap">
      <p className="volver"><Link href={`/membresias/${c.id}`}>← {c.nombre}</Link></p>
      <header className="page"><h1>Editar cliente</h1></header>

      <section className="card">
        <form action={actualizarMembresia} className="form-vert">
          <input type="hidden" name="id" value={c.id} />
          <div className="form-2col">
            <label>Nombre *<input type="text" name="nombre" required defaultValue={c.nombre} /></label>
            <EstadoConFecha estado={c.estado} fechaCancelacion={c.fechaCancelacion} />
          </div>

          <label>
            Tipo base del cliente
            <select name="tipoCliente" defaultValue={c.tipoCliente === "agencia" ? "estandar" : (c.tipoCliente ?? "estandar")}>
              <option value="estandar">Estándar (solo licencia $69)</option>
              <option value="servicio">Servicio Leadtion (Agente IA / Reactivación / Level Up)</option>
            </select>
          </label>

          <label className="pf-check" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="esAgencia" value="1" defaultChecked={c.esAgencia} style={{ width: "auto" }} />
            Cliente de agencia (plan de marketing; licencia incluida). Es independiente: no borra el servicio Leadtion.
          </label>

          <div className="form-2col">
            <label>
              Plan de entrada
              <select name="planTipo" defaultValue={c.planTipo ?? ""}>
                <option value="">Estándar (solo licencia $69)</option>
                <option value="agente_ai">Agente AI ($847)</option>
                <option value="reactivacion">Reactivación ($597 + $197 + $197)</option>
                <option value="level_up">Level Up ($497)</option>
              </select>
            </label>
            <label>
              Soporte mensual ($) — valor libre
              <input
                type="number" name="soporteValor" step="0.01" min="0" list="niveles-soporte-edit"
                defaultValue={c.soporteValor?.toString() ?? ""}
                placeholder="Vacío = básico (incluido en la licencia)"
              />
              <datalist id="niveles-soporte-edit">
                <option value="87">Estándar</option>
                <option value="119">Avanzado</option>
                <option value="157">Premium</option>
              </datalist>
              <small>Cobro base del mes si el cliente NO está en un servicio ni en un período de soporte. Vacío = solo licencia.</small>
            </label>
          </div>

          <div className="form-2col">
            <label>
              API de WhatsApp
              <select name="apiOpcion" defaultValue={apiOp}>
                <option value="">Sin API</option>
                <option value="incluida">Incluida (costo $10)</option>
                <option value="vendida_12">Vendida $12 (gano $2)</option>
                <option value="vendida_10">Vendida $10 (al costo)</option>
              </select>
              <small>Cambia esto cuando la situación del cliente cambie (ej. pasa a incluida).</small>
            </label>
            <label>
              Bono reactivación
              <select name="bono" defaultValue={c.bono?.toString() ?? ""}>
                <option value="">— Sin bono</option>
                <option value="50">$50</option>
                <option value="100">$100</option>
              </select>
            </label>
          </div>

          <label>Licencia / membresía mensual ($)
            <input type="number" name="valorLicencia" step="0.01" defaultValue={c.valorLicencia?.toString() ?? ""} />
            <small>Cobro base de membresía (estándar $69). Puedes personalizarlo (ej. $77). La API se cobra aparte con el selector de arriba.</small>
          </label>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <Link href={`/membresias/${c.id}`} className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </section>
    </main>
  );
}
