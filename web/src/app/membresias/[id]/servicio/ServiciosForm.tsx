"use client";

import { useState } from "react";
import Link from "next/link";

/** Precios estándar del mes 1 (placeholder; el usuario puede sobrescribir). */
const ESTANDAR: Record<string, number> = { agente_ai: 847, reactivacion: 597, level_up: 497 };
const hoyMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

let uid = 0;
type Fila = { key: number; tipo: string };

export function ServiciosForm({
  clienteId,
  action,
}: {
  clienteId: number;
  action: (formData: FormData) => void;
}) {
  const [filas, setFilas] = useState<Fila[]>([{ key: uid++, tipo: "agente_ai" }]);

  const agregar = () => setFilas((f) => [...f, { key: uid++, tipo: "agente_ai" }]);
  const quitar = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));
  const cambiarTipo = (key: number, tipo: string) =>
    setFilas((f) => f.map((x) => (x.key === key ? { ...x, tipo } : x)));

  return (
    <form action={action} className="form-vert">
      <input type="hidden" name="clienteId" value={clienteId} />

      {filas.map((fila, i) => (
        <fieldset key={fila.key} className="servicio-fila">
          <div className="servicio-fila-head">
            <span className="servicio-fila-num">Servicio {i + 1}</span>
            {filas.length > 1 && (
              <button type="button" className="btn-quitar" onClick={() => quitar(fila.key)}>
                Quitar
              </button>
            )}
          </div>

          <div className="form-2col">
            <label>
              Servicio *
              <select
                name="tipoServicio"
                value={fila.tipo}
                onChange={(e) => cambiarTipo(fila.key, e.target.value)}
                required
              >
                <option value="agente_ai">Agente IA</option>
                <option value="reactivacion">Reactivación</option>
                <option value="level_up">Level Up</option>
              </select>
            </label>
            <label>Mes de compra *<input type="month" name="mesInicio" defaultValue={hoyMes()} required /></label>
          </div>

          <div className="form-2col">
            <label>
              Precio del mes 1 ($)
              <input type="number" name="precioMes1" step="0.01" placeholder={`Estándar $${ESTANDAR[fila.tipo]}`} />
              <small>Déjalo vacío para el precio estándar, o escribe el negociado (ej. descuento).</small>
            </label>
            <label>
              Soporte del mes 3 ($)
              <select name="soporteValor" defaultValue="">
                <option value="">Sin definir aún</option>
                <option value="119">$119</option>
                <option value="157">$157</option>
                <option value="87">$87 (Level Up)</option>
              </select>
            </label>
          </div>

          <div className="form-2col">
            <label>Bono de reactivación ($)<input type="number" name="bono" step="0.01" placeholder="opcional (50 / 100)" /></label>
            <label>Nota (opcional)<input type="text" name="nota" placeholder="Detalle o acuerdo del servicio" /></label>
          </div>
        </fieldset>
      ))}

      <button type="button" className="btn-secondary" onClick={agregar}>+ Agregar otro servicio</button>

      <div className="dato-nota">
        <b>Qué se generará:</b> mes 1, mes 2 y mes 3 de cada servicio desde su mes de compra.
        Si dos servicios caen en el mismo mes, sus cobros se <b>suman</b>. Del mes 4 en adelante
        no se cobra nada automático (se decide manualmente).
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">Registrar servicio(s)</button>
        <Link href={`/membresias/${clienteId}`} className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
