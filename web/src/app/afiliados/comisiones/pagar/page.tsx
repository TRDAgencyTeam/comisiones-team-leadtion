import Link from "next/link";
import { notFound } from "next/navigation";
import { dashboardAfiliados } from "@/lib/afiliados";
import { registrarPagoAfiliado } from "../../acciones";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesLargo = (mesISO: string) => { const [y, m] = mesISO.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${y}`; };

export default async function RegistrarPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; m?: string }>;
}) {
  const { c, m } = await searchParams;
  const { filas } = await dashboardAfiliados();
  const fila = filas.find((f) => f.clienteRef === c && String(f.mesIdx) === m);
  if (!fila) notFound();

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <main className="wrap">
      <p className="volver"><Link href="/afiliados/comisiones">← Comisiones</Link></p>
      <header className="page">
        <h1>Registrar pago</h1>
      </header>

      <section className="card">
        <div className="pago-resumen">
          <div><b>{fila.afiliadoNombre}</b> · {fila.clienteNombre}</div>
          <div className="td-concepto">{fila.concepto} · {mesLargo(fila.mes)}</div>
          <div>Monto sugerido: <b>{usd(fila.monto)}</b></div>
        </div>

        <form action={registrarPagoAfiliado} className="form-vert">
          <input type="hidden" name="clienteRef" value={fila.clienteRef} />
          <input type="hidden" name="mesNum" value={fila.mesIdx} />
          <div className="form-2col">
            <label>
              Fecha de pago
              <input type="date" name="fecha" defaultValue={hoy} required />
            </label>
            <label>
              Monto pagado ($)
              <input type="number" step="0.01" name="monto" defaultValue={fila.monto} required />
            </label>
          </div>
          <label>
            Comprobante (referencia / nº de transacción)
            <input type="text" name="comprobante" placeholder="Ej: Nequi 123456, Bancolombia…" />
            <small>Adjuntar el archivo del comprobante llega en la siguiente iteración (requiere almacenamiento).</small>
          </label>
          <label>
            Notas
            <input type="text" name="notas" placeholder="Opcional" />
          </label>
          <div className="form-actions">
            <Link href="/afiliados/comisiones" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-primary">Confirmar pago</button>
          </div>
        </form>
      </section>
    </main>
  );
}
