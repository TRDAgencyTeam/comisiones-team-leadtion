"use client";

import { useState } from "react";
import Link from "next/link";

const hoyDia = () => new Date().toISOString().slice(0, 10);

/** Formulario de un período de soporte (nivel + rango; hasta o indefinido). */
export function SoporteForm({
  clienteId,
  action,
  soporte,
  textoBoton = "Registrar soporte",
}: {
  clienteId: number;
  action: (formData: FormData) => void;
  soporte?: { id: number; valor: number; desde: string; hasta: string | null; nota: string | null };
  textoBoton?: string;
}) {
  const [indefinido, setIndefinido] = useState<boolean>(soporte ? soporte.hasta == null : false);

  return (
    <form action={action} className="form-vert">
      <input type="hidden" name="clienteId" value={clienteId} />
      {soporte && <input type="hidden" name="soporteId" value={soporte.id} />}

      <div className="form-2col">
        <label>
          Nivel de soporte *
          <select name="valor" defaultValue={soporte ? String(soporte.valor) : "119"} required>
            <option value="87">Estándar — $87</option>
            <option value="119">Avanzado — $119</option>
            <option value="157">Premium — $157</option>
          </select>
          <small>El soporte ya incluye la licencia; ese es el cobro del mes.</small>
        </label>
        <label>Desde *<input type="date" name="desde" defaultValue={soporte?.desde.slice(0, 10) ?? hoyDia()} required /></label>
      </div>

      <label className="check-label">
        <input type="checkbox" name="indefinido" value="1" checked={indefinido} onChange={(e) => setIndefinido(e.target.checked)} />
        Indefinido (sigue hasta que lo apagues; cubre hasta el mes en curso y se extiende)
      </label>

      {!indefinido && (
        <label>Hasta *<input type="date" name="hasta" defaultValue={soporte?.hasta?.slice(0, 10) ?? hoyDia()} /></label>
      )}

      <label>Nota (opcional)<input type="text" name="nota" defaultValue={soporte?.nota ?? ""} placeholder="Motivo o acuerdo del soporte" /></label>

      <div className="dato-nota">
        <b>Qué pasará:</b> los meses del rango quedan con el valor del soporte; los meses de
        fuera vuelven <b>solos</b> a su valor normal. Se refleja en la ficha y en el historial.
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">{textoBoton}</button>
        <Link href={`/membresias/${clienteId}`} className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
