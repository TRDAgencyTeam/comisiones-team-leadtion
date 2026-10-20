import { agregarCobroProveedor } from "@/app/trd/reg/acciones";
import { InputMonto } from "@/components/InputMonto";

/**
 * Agrega un cobro puntual a un proveedor que YA existe en la lista (freelance, sin
 * nómina fija: p. ej. Úrsula). Pide valor, concepto y si aplica solo este mes o
 * varios. Se guarda como registro del mes en REG y se sincroniza con el cuadro
 * contable. Las retenciones (ICA/renta) las calcula el servidor.
 */
export function CobroProveedorForm({
  mes,
  proveedores,
}: {
  mes: string;
  proveedores: { id: number; nombre: string }[];
}) {
  return (
    <details className="reg-freelance">
      <summary>+ Agregar cobro a un proveedor existente (freelance)</summary>
      <form action={agregarCobroProveedor} className="reg-freelance-form">
        <input type="hidden" name="mes" value={mes} />
        <div className="ff-grid">
          <label>
            Proveedor
            <select name="colaboradorId" required defaultValue="">
              <option value="" disabled>Elige…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <label>Valor del cobro<InputMonto name="valor" decimales={false} placeholder="0" required /></label>
          <label>Concepto<input name="concepto" placeholder="Ej: 3 videos" required /></label>
          <label>
            Aplica para
            <select name="meses" defaultValue="1">
              <option value="1">Solo este mes</option>
              <option value="2">Este y el siguiente (2 meses)</option>
              <option value="3">3 meses</option>
              <option value="4">4 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </label>
        </div>
        <p className="reg-nota" style={{ margin: "2px 0 10px" }}>
          Si eliges varios meses, se crea el mismo cobro en cada mes a partir de este.
          El proveedor aparecerá en la tabla de arriba con su concepto; puedes ajustarlo o eliminarlo luego.
        </p>
        <button type="submit" className="btn-primary">Agregar cobro</button>
      </form>
    </details>
  );
}
