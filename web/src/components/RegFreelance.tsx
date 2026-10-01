import { agregarFreelance } from "@/app/trd/reg/acciones";
import { InputMonto } from "@/components/InputMonto";

/**
 * Alta de un pago a freelance ocasional (no está en nómina). Se guarda como un
 * renglón del mes sin colaborador. Las retenciones se calculan en el servidor.
 */
export function FreelanceForm({ mes }: { mes: string }) {
  return (
    <details className="reg-freelance">
      <summary>+ Agregar pago a freelance</summary>
      <form action={agregarFreelance} className="reg-freelance-form">
        <input type="hidden" name="mes" value={mes} />
        <div className="ff-grid">
          <label>Nombre<input name="nombre" required placeholder="Nombre del freelance" /></label>
          <label>Identificación<input name="identificacion" placeholder="C.C." /></label>
          <label>Actividad CIIU<input name="actividad" placeholder="7410" /></label>
          <label>Tarifa ICA ‰<InputMonto name="tarifa" placeholder="8,66" /></label>
          <label>Cuenta de cobro<InputMonto name="valor" decimales={false} placeholder="0" required /></label>
          <label>Aporte salud<InputMonto name="salud" decimales={false} placeholder="0" /></label>
          <label>Aporte pensión<InputMonto name="pension" decimales={false} placeholder="0" /></label>
        </div>
        <button type="submit" className="btn-primary">Agregar</button>
      </form>
    </details>
  );
}
