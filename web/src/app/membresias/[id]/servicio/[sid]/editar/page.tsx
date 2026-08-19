import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerServicio, SERVICIO_LABEL, PRECIO_MES1_ESTANDAR } from "@/lib/servicios";
import { editarServicio } from "../../../../acciones";

export const dynamic = "force-dynamic";

export default async function EditarServicioPage({
  params, searchParams,
}: {
  params: Promise<{ id: string; sid: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, sid } = await params;
  const { error } = await searchParams;
  const s = await obtenerServicio(Number(sid));
  if (!s || s.clienteId !== Number(id)) notFound();

  return (
    <main className="wrap">
      <p className="volver"><Link href={`/membresias/${id}`}>← Volver a la ficha</Link></p>
      <header className="page">
        <h1>Editar servicio</h1>
        <p>Corrige el mes de compra, el precio u otros datos. Al guardar, el historial mensual
          se recalcula (los meses que el servicio deje de ocupar se limpian solos).</p>
      </header>

      {error && <div className="card error-box">{error}</div>}

      <section className="card">
        <form action={editarServicio} className="form-vert">
          <input type="hidden" name="servicioId" value={s.id} />
          <input type="hidden" name="clienteId" value={s.clienteId} />

          <div className="form-2col">
            <label>
              Servicio *
              <select name="tipoServicio" defaultValue={s.tipoServicio} required>
                <option value="agente_ai">Agente IA</option>
                <option value="reactivacion">Reactivación</option>
                <option value="level_up">Level Up</option>
              </select>
            </label>
            <label>Mes de compra *<input type="month" name="mesInicio" defaultValue={s.mesInicio.slice(0, 7)} required /></label>
          </div>

          <div className="form-2col">
            <label>
              Precio del mes 1 ($)
              <input type="number" name="precioMes1" step="0.01" defaultValue={s.precioMes1 ?? ""} placeholder={`Estándar $${PRECIO_MES1_ESTANDAR[s.tipoServicio]}`} />
              <small>Vacío = precio estándar; o el negociado (descuento).</small>
            </label>
            <label>
              Soporte del mes 3 ($)
              <select name="soporteValor" defaultValue={s.soporteValor != null ? String(s.soporteValor) : ""}>
                <option value="">Sin definir aún</option>
                <option value="119">$119</option>
                <option value="157">$157</option>
                <option value="87">$87 (Level Up)</option>
              </select>
            </label>
          </div>

          <div className="form-2col">
            <label>Bono de reactivación ($)<input type="number" name="bono" step="0.01" defaultValue={s.bono ?? ""} placeholder="opcional (50 / 100)" /></label>
            <label>Nota (opcional)<input type="text" name="nota" defaultValue={s.nota ?? ""} placeholder="Detalle o acuerdo" /></label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Guardar cambios</button>
            <Link href={`/membresias/${id}`} className="btn-secondary">Cancelar</Link>
          </div>
        </form>
        <p className="foot" style={{ marginTop: 4 }}>Servicio actual: <b>{SERVICIO_LABEL[s.tipoServicio]}</b>, compra {s.mesInicio.slice(0, 7)}.</p>
      </section>
    </main>
  );
}
