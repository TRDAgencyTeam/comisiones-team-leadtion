"use client";

import { useState } from "react";
import { guardarTasaCorte, usarTasaEnVivo } from "@/app/trd/reg/acciones";
import type { TasaCorte } from "@/lib/reg";
import type { PuntoFx } from "@/lib/fx-historial";

const cop2 = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 }).format(n);
const cop0 = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const fechaCorta = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });

/**
 * Tasa USD→COP del mes de REG. Muestra la tasa en vivo (o la pactada si se fijó
 * una), permite fijar una tasa pactada de otro día y ver el historial reciente.
 */
export function RegTasaWidget({ mes, tasa, historial }: { mes: string; tasa: TasaCorte; historial: PuntoFx[] }) {
  const [abierto, setAbierto] = useState<null | "hist" | "editar">(null);

  const estado = tasa.manual ? "pactada" : tasa.enVivo ? "vivo" : "respaldo";
  const badge = { vivo: "En vivo", pactada: "Pactada", respaldo: "Respaldo" }[estado];

  return (
    <div className={`tasa-widget est-${estado}`}>
      <div className="tasa-fila">
        <button
          type="button"
          className="tasa-main"
          onClick={() => setAbierto(abierto === "hist" ? null : "hist")}
          aria-expanded={abierto === "hist"}
        >
          <span className="tasa-cab">
            <span className="tasa-lbl">Tasa USD → COP</span>
            <span className={`tasa-badge ${estado}`}><i className="dot" />{badge}</span>
          </span>
          <span className="tasa-val">{cop2(tasa.cop)}</span>
          <span className="tasa-pie">
            {tasa.manual ? "pactada · fija para este mes" : fechaCorta(tasa.fecha)} · historial ▾
          </span>
        </button>

        <div className="tasa-acciones">
          <button type="button" className="btn-secondary tasa-btn" onClick={() => setAbierto(abierto === "editar" ? null : "editar")}>
            {tasa.manual ? "Cambiar tasa" : "Ajustar tasa"}
          </button>
          {tasa.manual && (
            <form action={usarTasaEnVivo}>
              <input type="hidden" name="mes" value={mes} />
              <button type="submit" className="tasa-link">Volver a la del día</button>
            </form>
          )}
        </div>
      </div>

      {abierto === "editar" && (
        <form action={guardarTasaCorte} className="tasa-editar" onSubmit={() => setAbierto(null)}>
          <input type="hidden" name="mes" value={mes} />
          <label htmlFor="cop-tasa">Tasa pactada (COP por 1 USD)</label>
          <div className="tasa-editar-row">
            <input
              id="cop-tasa"
              name="cop"
              inputMode="decimal"
              autoFocus
              placeholder="3.161,50"
              defaultValue={tasa.manual ? String(tasa.cop) : ""}
            />
            <button type="submit" className="btn-primary">Aplicar</button>
            <button type="button" className="tasa-link" onClick={() => setAbierto(null)}>Cancelar</button>
          </div>
          <p className="tasa-nota">
            Recalcula las comisiones <strong>no pagadas</strong> con esta tasa y las congela al marcar Pagado.
            Las ya pagadas no cambian. Ideal si se pactó pagar con la tasa de otro día.
          </p>
        </form>
      )}

      {abierto === "hist" && (
        <div className="tasa-pop" role="dialog" aria-label="Historial de la tasa">
          <div className="tasa-pop-tit">Últimos días · USD → COP</div>
          {historial.length === 0 && <div className="tasa-pop-vacio">Sin historial aún.</div>}
          {historial.map((p, i) => (
            <div key={p.fecha} className={`tasa-pop-row${i === 0 ? " hoy" : ""}`}>
              <span className="f">{fechaCorta(p.fecha)}{i === 0 ? " · hoy" : ""}</span>
              <span className="v">{cop0(p.cop)}</span>
              <span className={`d ${p.delta == null ? "" : p.delta >= 0 ? "up" : "down"}`}>
                {p.delta == null ? "—" : `${p.delta >= 0 ? "▲" : "▼"} ${cop0(Math.abs(p.delta))}`}
              </span>
            </div>
          ))}
          <p className="tasa-pop-nota">Fuente: tasa de referencia diaria. Para pagos, usa la tasa pactada.</p>
        </div>
      )}
    </div>
  );
}
