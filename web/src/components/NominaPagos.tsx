import { InputMonto } from "@/components/InputMonto";
import { agregarPagoNomina, eliminarPagoNomina } from "@/app/trd/gastos-fijos/nomina/acciones";
import { IconoBorrar } from "@/components/Iconos";
import type { PagoNominaHist } from "@/lib/nomina";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const nombreMes = (ym: string) => {
  const [a, m] = ym.split("-").map(Number);
  return new Date(a!, (m! - 1), 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
};

/**
 * Pagos puntuales a una persona SIN salario fijo (freelance, p. ej. Úrsula) desde
 * la ficha de Nómina. Agregar un pago lo sincroniza con el Registro contable (REG)
 * y con la tabla de Egresos del mes elegido. Incluye el historial de pagos.
 */
export function NominaPagos({
  personaId,
  esFreelance,
  historial,
  mesActual,
}: {
  personaId: number;
  esFreelance: boolean;
  historial: PagoNominaHist[];
  mesActual: string; // YYYY-MM
}) {
  return (
    <section className="card" style={{ marginTop: 22 }}>
      <div className="card-head"><span className="who">Pagos y freelance</span></div>

      {esFreelance ? (
        <>
          <p className="foot" style={{ margin: "4px 0 12px" }}>
            Esta persona no tiene salario fijo. Agrega un pago para un mes: se registra en el
            cuadro contable (REG) y en los Egresos de ese mes. Repetir el mismo mes reemplaza el valor.
          </p>
          <form action={agregarPagoNomina} className="reg-freelance-form">
            <input type="hidden" name="id" value={personaId} />
            <div className="ff-grid">
              <label>Mes<input type="month" name="mes" defaultValue={mesActual} required /></label>
              <label>Valor del pago<InputMonto name="valor" decimales={false} placeholder="0" required /></label>
              <label>Concepto<input name="concepto" placeholder="Ej: 3 videos" required /></label>
            </div>
            <button type="submit" className="btn-primary">Agregar pago</button>
          </form>
        </>
      ) : (
        <p className="foot" style={{ margin: "4px 0 0" }}>
          Tiene salario fijo: su pago entra automáticamente cada mes en REG y Egresos. Abajo, el historial.
        </p>
      )}

      <h3 style={{ fontSize: "0.95rem", margin: "20px 0 8px" }}>Historial de pagos</h3>
      {historial.length === 0 ? (
        <p className="empty">Todavía no hay pagos registrados.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Mes</th><th>Concepto</th><th className="num">Valor</th><th className="num">A girar</th><th>Estado</th>{esFreelance && <th></th>}</tr>
            </thead>
            <tbody>
              {historial.map((p) => (
                <tr key={p.mes}>
                  <td>{nombreMes(p.mes).replace(/^\w/, (ch) => ch.toUpperCase())}</td>
                  <td className="td-concepto">{p.concepto ?? "—"}</td>
                  <td className="num">{cop(p.valor)}</td>
                  <td className="num">{cop(p.valorGirar)}</td>
                  <td>{p.pagado ? <span className="estado-pagado">Pagado</span> : <span className="estado-pausado">Pendiente</span>}</td>
                  {esFreelance && (
                    <td className="col-accion">
                      <form action={eliminarPagoNomina}>
                        <input type="hidden" name="id" value={personaId} />
                        <input type="hidden" name="mes" value={p.mes} />
                        <button type="submit" className="btn-borrar icon-btn danger" title="Eliminar este pago"><IconoBorrar /></button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
