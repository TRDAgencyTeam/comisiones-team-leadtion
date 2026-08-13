import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerCliente, fechaPago, mesLargo, fechaLarga } from "@/lib/clientes";
import { guardarHistorial } from "../../acciones";

export const dynamic = "force-dynamic";

const ESTADOS: { v: string; t: string }[] = [
  { v: "activo", t: "Activo" },
  { v: "incluido_en_marketing", t: "Incluido en marketing" },
  { v: "en_riesgo_o_mora", t: "En riesgo / mora" },
  { v: "cancelado", t: "Cancelado" },
  { v: "previo_a_activacion", t: "Previo a activación" },
  { v: "sin_datos", t: "Sin datos" },
];

export default async function EditarHistorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await obtenerCliente(Number(id), "2026-08-05");
  if (!c) notFound();

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <main className="wrap">
      <p className="volver">
        <Link href={`/clientes/${c.id}`}>← {c.nombre}</Link>
      </p>
      <header className="page">
        <h1>Editar historial mensual</h1>
        <p>
          Cambia el valor o estado de cada mes. La fecha de pago es el día de la
          activación. Los meses <b>vencidos</b> posiblemente ya se cobraron —
          edítalos con cuidado.
        </p>
      </header>

      <form action={guardarHistorial}>
        <input type="hidden" name="id" value={c.id} />
        <section className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mes</th><th>Fecha de pago</th><th>Estado</th><th>Valor (USD)</th>
                </tr>
              </thead>
              <tbody>
                {c.pagos.map((p) => {
                  const fp = fechaPago(c.fechaActivacion, p.mes);
                  const vencido = fp < hoy;
                  return (
                    <tr key={p.mes} className={vencido ? "row-venc" : ""}>
                      <td>{mesLargo(p.mes)}</td>
                      <td>
                        {fechaLarga(fp)}{" "}
                        <span className={vencido ? "tag-venc" : "tag-prox"}>
                          {vencido ? "vencido" : "próximo"}
                        </span>
                      </td>
                      <td>
                        <select name={`estado::${p.mes}`} defaultValue={p.estadoMes} className="hist-select">
                          {ESTADOS.map((e) => (
                            <option key={e.v} value={e.v}>{e.t}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          name={`valor::${p.mes}`}
                          defaultValue={p.valor !== null ? String(p.valor) : ""}
                          className="hist-input"
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="form-actions" style={{ marginTop: 18 }}>
          <Link href={`/clientes/${c.id}`} className="btn-secondary">Cancelar</Link>
          <button type="submit" className="btn-primary">Guardar cambios</button>
        </div>
      </form>
    </main>
  );
}
