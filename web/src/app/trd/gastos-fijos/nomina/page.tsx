import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { listarNomina, diasParaVencer } from "@/lib/nomina";
import { cambiarEstadoPersona } from "./acciones";

export const metadata = { title: "Nómina" };
export const dynamic = "force-dynamic";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const fmt = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Etiqueta del estado del contrato según cuánto falta para vencer. */
function ContratoTag({ fin }: { fin: string | null }) {
  const dias = diasParaVencer(fin);
  if (dias == null) return <span className="ct-tag ct-none">Sin contrato</span>;
  if (dias < 0) return <span className="ct-tag ct-venc">Vencido</span>;
  if (dias <= 30) return <span className="ct-tag ct-pronto">Vence en {dias} d</span>;
  return <span className="ct-tag ct-ok">Vigente</span>;
}

export default async function NominaPage() {
  await soloAdmin();
  const personas = await listarNomina();
  const activos = personas.filter((p) => p.activo);
  const totalNomina = activos.reduce((s, p) => s + p.valorNomina, 0);

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Nómina</h1>
          <p className="sub">
            Personas de la empresa (parte de Gastos Fijos). {activos.length} activas · nómina mensual {cop(totalNomina)}.
          </p>
        </div>
        <Link href="/trd/gastos-fijos/nomina/nuevo" className="btn-primary">+ Agregar persona</Link>
      </div>

      <div className="reg-tabla-wrap">
        <table className="reg-tabla">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Área</th>
              <th className="right">Valor nómina</th>
              <th>Inicio</th>
              <th>Fin contrato</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.id} className={p.activo ? "" : "fila-inactiva"}>
                <td>
                  <Link href={`/trd/gastos-fijos/nomina/${p.id}`} className="link-ver">{p.nombre}</Link>
                  {!p.activo && <span className="freelance-tag" style={{ marginLeft: 6 }}>inactiva</span>}
                </td>
                <td className="muted">{p.area ?? "—"}</td>
                <td className="right">{p.valorNomina ? cop(p.valorNomina) : "—"}</td>
                <td className="muted">{fmt(p.fechaInicioContrato)}</td>
                <td className="muted">{fmt(p.fechaFinContrato)}</td>
                <td><ContratoTag fin={p.fechaFinContrato} /></td>
                <td>
                  <form action={cambiarEstadoPersona}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="activar" value={p.activo ? "0" : "1"} />
                    <button type="submit" className="btn-secondary btn-guardar">
                      {p.activo ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {personas.length === 0 && (
              <tr><td colSpan={7} className="vacio">Aún no hay personas. Agrega la primera.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="reg-nota">
        Las personas activas aparecen en <strong>Registro contable</strong> para pagarles cada mes. La fecha de fin se
        calcula sola (inicio + duración). Próximamente: adjuntar hoja de vida y contratos.
      </p>
    </main>
  );
}
