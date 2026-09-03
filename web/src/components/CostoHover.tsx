"use client";

import { useState } from "react";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/**
 * Muestra el costo MENSUAL (USD) y, al pasar el cursor, el desglose hora/día/
 * mes/año en USD (y el mensual en COP si aplica). Para nómina y herramientas.
 */
export function CostoHover({ mensualUsd, mensualCop, conHora = false }: { mensualUsd: number; mensualCop: number | null; conHora?: boolean }) {
  const [show, setShow] = useState(false);
  const dia = mensualUsd / 30;
  const hora = dia / 8;
  const anio = mensualUsd * 12;
  return (
    <span style={{ position: "relative", cursor: "help" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="cf-mono">{usd(mensualUsd)}</span>
      {show && (
        <div style={{
          position: "absolute", right: 0, top: "100%", marginTop: 6, zIndex: 20,
          background: "var(--text)", color: "var(--panel)", borderRadius: 10, padding: "10px 12px",
          fontSize: "0.72rem", fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 8px 24px rgba(0,0,0,.3)", textAlign: "right",
        }}>
          {conHora && <div>Hora: {usd(hora)}</div>}
          <div>Día: {usd(dia)}</div>
          <div>Mes: {usd(mensualUsd)}</div>
          <div>Año: {usd(anio)}</div>
          {mensualCop != null && <div style={{ opacity: 0.7, marginTop: 4 }}>{cop(mensualCop)} /mes</div>}
        </div>
      )}
    </span>
  );
}
