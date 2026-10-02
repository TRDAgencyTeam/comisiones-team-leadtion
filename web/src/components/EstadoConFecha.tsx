"use client";

import { useState } from "react";

/** Fecha de hoy (YYYY-MM-DD) en hora local del navegador (Colombia). */
function hoyLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Selector de estado de la membresía + fecha de cancelación que aparece SOLO al
 * elegir "Cancelado". Así nunca queda una cancelación sin fecha (el motor de
 * comisiones la necesita para saber qué hitos aplican).
 */
export function EstadoConFecha({
  estado, fechaCancelacion,
}: {
  estado: string;
  fechaCancelacion: string | null;
}) {
  const [val, setVal] = useState(estado);
  const [fecha, setFecha] = useState(fechaCancelacion ?? hoyLocal());

  return (
    <>
      <label>
        Estado
        <select name="estado" value={val} onChange={(e) => setVal(e.target.value)}>
          <option value="activo">Activo</option>
          <option value="pausado">Pausado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </label>
      {val === "cancelado" && (
        <label>
          Fecha de cancelación
          <input type="date" name="fechaCancelacion" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
          <small className="cf-hint">La comisión solo cuenta los hitos cumplidos antes de esta fecha.</small>
        </label>
      )}
    </>
  );
}
