"use client";

import { useEffect, useState } from "react";
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
  const [valorPrimerMes, setValorPrimerMes] = useState(persona?.valorPrimerMes ? fmtMiles(String(persona.valorPrimerMes)) : "");
  const [primerMesTocado, setPrimerMesTocado] = useState(!!persona?.valorPrimerMes);

  const tieneDuracion = Number(duracion) > 0;
  const fechaFin = fechaInicio && tieneDuracion ? addMonthsISO(fechaInicio, Math.round(Number(duracion))) : "";

  // Prorrateo del primer mes (base 30 días, como nómina CO): del día de inicio al 30.
  const diaInicio = fechaInicio ? Number(fechaInicio.split("-")[2]) : 0;
  const diasPrimerMes = diaInicio ? Math.max(0, Math.min(30, 30 - diaInicio + 1)) : 30;
  const valorNum = Number(valor.replace(/[^\d]/g, ""));
  const esParcial = diaInicio > 1 && diasPrimerMes < 30;
  const sugerido = esParcial && valorNum ? Math.round((valorNum * diasPrimerMes) / 30) : 0;

  // Autocompleta la sugerencia del primer mes mientras el usuario no lo edite a mano.
  useEffect(() => {
    if (primerMesTocado) return;
    setValorPrimerMes(sugerido ? fmtMiles(String(sugerido)) : "");
  }, [sugerido, primerMesTocado]);

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

        <label>Valor de nómina (COP) <small style={{ color: "var(--faint)" }}>— mensual fijo (mes 2 en adelante)</small>
          <input name="valorNomina" inputMode="numeric" value={valor}
            onChange={(e) => setValor(fmtMiles(e.target.value))} placeholder="0" />
        </label>

        <label>Valor del primer mes (parcial) <small style={{ color: "var(--faint)" }}>opcional</small>
          <input name="valorPrimerMes" inputMode="numeric" value={valorPrimerMes}
            onChange={(e) => { setPrimerMesTocado(true); setValorPrimerMes(fmtMiles(e.target.value)); }}
            placeholder={esParcial ? "0" : "Mes completo"} />
          {esParcial
            ? <small className="pf-hint">Entra el día {diaInicio} → se liquidan {diasPrimerMes} días. Sugerido: {fmtMiles(String(sugerido))} COP (prorrateo /30). Editable. Desde el mes 2 se cobra el valor mensual completo.</small>
            : <small className="pf-hint">Si entra a mitad de mes, aquí va el valor parcial de ese primer mes. Déjalo vacío = primer mes completo.</small>}
        </label>
      </div>

      <div className="pf-acciones">
        <button type="submit" className="btn-primary">{persona ? "Guardar cambios" : "Crear persona"}</button>
      </div>
    </form>
  );
}
