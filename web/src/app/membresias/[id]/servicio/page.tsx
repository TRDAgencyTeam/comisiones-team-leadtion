import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMembresia } from "@/lib/membresias";
import { registrarServicio } from "../../acciones";

export const dynamic = "force-dynamic";

const hoyMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

export default async function RegistrarServicioPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const c = await obtenerMembresia(Number(id));
  if (!c) notFound();

  return (
    <main className="wrap">
      <p className="volver"><Link href={`/membresias/${c.id}`}>← {c.nombre}</Link></p>
      <header className="page">
        <h1>Registrar servicio</h1>
        <p>Cuando un cliente compra un servicio especial después de estar activo. Genera
          automáticamente los cobros de los meses de su dinámica, sin tocar el historial anterior.</p>
      </header>

      {error && <div className="card error-box">{error}</div>}

      <section className="card">
        <form action={registrarServicio} className="form-vert">
          <input type="hidden" name="clienteId" value={c.id} />

          <div className="form-2col">
            <label>
              Servicio *
              <select name="tipoServicio" defaultValue="agente_ai" required>
                <option value="agente_ai">Agente IA ($847 · $0 garantía · soporte)</option>
                <option value="reactivacion">Reactivación ($597 · $197 · $197)</option>
                <option value="level_up">Level Up ($497 · soporte)</option>
              </select>
            </label>
            <label>Mes de compra *<input type="month" name="mesInicio" defaultValue={hoyMes()} required /></label>
          </div>

          <div className="form-2col">
            <label>
              Soporte del mes 3 ($)
              <select name="soporteValor" defaultValue="">
                <option value="">Sin definir aún</option>
                <option value="119">$119</option>
                <option value="157">$157</option>
                <option value="87">$87 (Level Up)</option>
              </select>
            </label>
            <label>Bono de reactivación ($)<input type="number" name="bono" step="0.01" placeholder="opcional (50 / 100)" /></label>
          </div>

          <label>Nota (opcional)<input type="text" name="nota" placeholder="Detalle del servicio o acuerdo" /></label>

          <div className="dato-nota">
            <b>Qué se generará:</b> mes 1, mes 2 y mes 3 desde el mes de compra según el servicio.
            Del mes 4 en adelante no se cobra nada automático (se decide manualmente).
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Registrar servicio</button>
            <Link href={`/membresias/${c.id}`} className="btn-secondary">Cancelar</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
