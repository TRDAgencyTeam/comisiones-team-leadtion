import Link from "next/link";
import { crearMembresia } from "../acciones";
import { opcionesFormulario } from "@/lib/membresias";

export const dynamic = "force-dynamic";

export default async function NuevaMembresiaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { colaboradores, afiliados } = await opcionesFormulario();

  return (
    <main className="wrap">
      <p className="volver"><Link href="/membresias">← Clientes</Link></p>
      <header className="page">
        <h1>Nuevo cliente</h1>
        <p>Se crea en el maestro y queda disponible en Comisiones CS automáticamente.</p>
      </header>

      <section className="card">
        <form action={crearMembresia} className="form-vert">
          <div className="form-2col">
            <label>Nombre *<input type="text" name="nombre" required autoFocus placeholder="Nombre / empresa" /></label>
            <label>Fecha de activación *<input type="date" name="fechaActivacion" required /></label>
          </div>

          <label className="check-label">
            <input type="checkbox" name="esAgencia" value="1" />
            Cliente <b>agencia</b> (licencia incluida en su plan de Ads; no paga licencia aparte)
          </label>

          <div className="form-2col">
            <label>
              Plan de entrada
              <select name="planTipo" defaultValue="">
                <option value="">Estándar (solo licencia $69)</option>
                <option value="agente_ai">Agente AI ($847)</option>
                <option value="reactivacion">Reactivación ($597 + $197 + $197)</option>
                <option value="level_up">Level Up ($497)</option>
              </select>
            </label>
            <label>
              Soporte
              <select name="soporteValor" defaultValue="">
                <option value="">Básico (incluido en $69)</option>
                <option value="87">Estándar $87 (solo Level Up)</option>
                <option value="119">Avanzado $119 (AI / Reactivación)</option>
                <option value="157">Premium $157 (AI / Reactivación)</option>
              </select>
            </label>
          </div>

          <div className="form-2col">
            <label>
              API de WhatsApp
              <select name="apiEstado" defaultValue="incluida">
                <option value="incluida">Incluida (costo $10)</option>
                <option value="vendida">Vendida aparte ($12, gano $2)</option>
                <option value="ninguna">Sin API</option>
              </select>
              <small>Para medir costos. La licencia $69 ya incluye la API.</small>
            </label>
            <label>
              Bono reactivación (solo si Reactivación)
              <select name="bono" defaultValue="">
                <option value="">— Sin bono</option>
                <option value="50">$50</option>
                <option value="100">$100</option>
              </select>
              <small>Recarga de billetera, costo tuyo, una sola vez.</small>
            </label>
          </div>

          <label className="check-label">
            <input type="checkbox" name="reserva" value="1" />
            Entró por <b>reserva</b> ($100, protege precio; inicia al pagar el excedente)
          </label>
          <label>
            Fecha de inicio real (si es reserva, cuando pague el excedente)
            <input type="date" name="fechaInicioReal" />
          </label>

          <label>
            Valor de licencia mostrado ($)
            <input type="number" name="valorLicencia" step="0.01" placeholder="69 (0 si agencia)" />
          </label>

          <div className="nota-info"><b>Personas asignadas (comisión CS).</b> A quiénes se les paga comisión por esta cuenta.</div>
          <div className="check-group">
            {colaboradores.map((col) => (
              <label key={col.id} className="check-label">
                <input type="checkbox" name="asignados" value={col.id} />
                {col.nombre}
              </label>
            ))}
          </div>

          <label>
            ¿Vino recomendado por un afiliado? (sincroniza con Afiliados)
            <select name="afiliadoRef" defaultValue="">
              <option value="">— No / directo</option>
              {afiliados.map((a) => (
                <option key={a.ref} value={a.ref}>{a.nombre} ({a.tipo})</option>
              ))}
            </select>
          </label>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <Link href="/membresias" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-primary">Guardar cliente</button>
          </div>
        </form>
      </section>
    </main>
  );
}
