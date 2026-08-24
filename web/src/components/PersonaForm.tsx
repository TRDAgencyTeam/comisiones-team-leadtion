"use client";

import { useState } from "react";
import type { PersonaNomina } from "@/lib/nomina";
import { AREAS, BANCOS } from "@/lib/catalogos";

/** Suma meses a una fecha YYYY-MM-DD (solo para mostrar en vivo; el server recalcula). */
function addMonthsISO(fecha: string, meses: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  if (!a || !m || !d) return "";
  const base = new Date(a, m - 1, d);
  const dia = base.getDate();
  base.setMonth(base.getMonth() + meses);
  if (base.getDate() < dia) base.setDate(0);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}

const fmtFecha = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }) : "";

/** Formatea dígitos con puntos de miles (1234567 → 1.234.567). */
const fmtMiles = (v: string) => {
  const d = v.replace(/[^\d]/g, "");
  return d ? Number(d).toLocaleString("es-CO") : "";
};

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
  const [cedula, setCedula] = useState(fmtMiles(persona?.identificacion ?? ""));
  const [valor, setValor] = useState(persona?.valorNomina ? fmtMiles(String(persona.valorNomina)) : "");

  const tieneDuracion = Number(duracion) > 0;
  const fechaFin = fechaInicio && tieneDuracion ? addMonthsISO(fechaInicio, Math.round(Number(duracion))) : "";

  return (
    <form action={action} className="persona-form">
      {persona && <input type="hidden" name="id" value={persona.id} />}
      {error && <p className="alerta">{error}</p>}

      <div className="pf-grid">
        <label className="pf-full">Nombre completo *
          <input name="nombre" defaultValue={persona?.nombre ?? ""} required placeholder="Nombre y apellidos" />
        </label>

        <label>Área
          <select name="area" defaultValue={persona?.area ?? ""}>
            <option value="">— Selecciona —</option>
            {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>

        <label>Banco
          <select name="banco" defaultValue={persona?.banco ?? ""}>
            <option value="">— Selecciona —</option>
            {BANCOS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}{b.sinCosto ? " (sin costo)" : ""}</option>
            ))}
          </select>
        </label>

        <label>Cédula / identificación
          <input name="identificacion" inputMode="numeric" value={cedula}
            onChange={(e) => setCedula(fmtMiles(e.target.value))} placeholder="1.234.567" />
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
            onChange={(e) => setDuracion(e.target.value)} placeholder="Vacío = indefinido" />
        </label>
        <label>Fecha de finalización (automática)
          <input type="text" readOnly className="pf-readonly"
            value={tieneDuracion ? (fechaFin ? fmtFecha(fechaFin) : "—") : "Indefinido"} />
        </label>

        <label>Valor de nómina (COP)
          <input name="valorNomina" inputMode="numeric" value={valor}
            onChange={(e) => setValor(fmtMiles(e.target.value))} placeholder="0" />
        </label>
      </div>

      <div className="pf-acciones">
        <button type="submit" className="btn-primary">{persona ? "Guardar cambios" : "Crear persona"}</button>
      </div>
    </form>
  );
}
