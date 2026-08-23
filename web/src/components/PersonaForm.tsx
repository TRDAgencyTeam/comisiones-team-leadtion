"use client";

import { useState } from "react";
import type { PersonaNomina } from "@/lib/nomina";

/** Suma meses a una fecha YYYY-MM-DD (solo para mostrar en vivo; el server recalcula). */
function addMonthsISO(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  if (!a || !m || !d) return "";
  const base = new Date(a, m - 1, d);
  const dia = base.getDate();
  base.setMonth(base.getMonth() + meses);
  if (base.getDate() < dia) base.setDate(0); // ajuste fin de mes
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

const fmtFecha = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }) : "";

export function PersonaForm({
  action,
  persona,
  error,
}: {
  action: (formData: FormData) => void;
  persona?: PersonaNomina;
  error?: string;
}) {
  const [fechaInicio, setFechaInicio] = useState(persona?.fechaInicioContrato ?? "");
  const [duracion, setDuracion] = useState(persona?.duracionMeses?.toString() ?? "");

  const fechaFin =
    fechaInicio && Number(duracion) > 0 ? addMonthsISO(fechaInicio, Math.round(Number(duracion))) : "";

  return (
    <form action={action} className="persona-form">
      {persona && <input type="hidden" name="id" value={persona.id} />}
      {error && <p className="alerta">{error}</p>}

      <div className="pf-grid">
        <label className="pf-full">Nombre completo *
          <input name="nombre" defaultValue={persona?.nombre ?? ""} required placeholder="Nombre y apellidos" />
        </label>
        <label>Área
          <input name="area" defaultValue={persona?.area ?? ""} placeholder="LT, AV, SM, MB, ADM…" />
        </label>
        <label>Identificación
          <input name="identificacion" defaultValue={persona?.identificacion ?? ""} placeholder="C.C." />
        </label>
        <label>Correo
          <input name="email" type="email" defaultValue={persona?.email ?? ""} placeholder="correo@dominio.com" />
        </label>
        <label>Fecha de nacimiento
          <input name="fechaNacimiento" type="date" defaultValue={persona?.fechaNacimiento ?? ""} />
        </label>
        <label>Fecha de inicio (contrato)
          <input name="fechaInicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </label>
        <label>Duración del contrato (meses)
          <input name="duracionMeses" type="number" min="1" step="1" value={duracion}
            onChange={(e) => setDuracion(e.target.value)} placeholder="4" />
        </label>
        <label>Fecha de finalización (automática)
          <input type="text" value={fechaFin ? fmtFecha(fechaFin) : "—"} readOnly className="pf-readonly" />
        </label>
        <label>Valor de nómina (COP)
          <input name="valorNomina" type="number" step="1" defaultValue={persona?.valorNomina || ""} placeholder="0" />
        </label>
      </div>

      <div className="pf-acciones">
        <button type="submit" className="btn-primary">{persona ? "Guardar cambios" : "Crear persona"}</button>
      </div>
    </form>
  );
}
