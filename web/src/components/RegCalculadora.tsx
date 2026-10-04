"use client";

import { useState } from "react";
import { InputMonto } from "@/components/InputMonto";
import { calcularRetenciones, aportesSeguridadSocial, TARIFA_ICA_DEFAULT } from "@/lib/retenciones";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/**
 * Calculadora suelta de retenciones (ICA + renta) para pagos a personas que NO
 * están en el cuadro. Usa la MISMA lógica del REG (`calcularRetenciones`,
 * tabla Art. 383 ET) con la UVT del mes. La tarifa de ICA es FIJA (8,66‰) y la
 * seguridad social (salud+pensión) se ASUME siempre (depura la base de renta).
 */
export function RegCalculadora({ uvt }: { uvt: number }) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState<number | null>(null);

  const v = valor ?? 0;
  const aportes = aportesSeguridadSocial(v);
  const r = calcularRetenciones({ valor: v, tarifaIcaMil: TARIFA_ICA_DEFAULT, aporteSalud: aportes, uvt });

  return (
    <>
      <button type="button" className="btn-secondary reg-calc-btn" onClick={() => setAbierto(true)}>
        🧮 Calculadora ICA / renta
      </button>

      {abierto && (
        <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <div className="cf-modal" style={{ maxWidth: 440 }}>
            <div className="cf-modal-head">
              <h3>Calculadora de retenciones</h3>
              <button type="button" className="x" onClick={() => setAbierto(false)}>✕</button>
            </div>
            <div className="cf-modal-body">
              <p className="cf-hint" style={{ marginTop: 0 }}>
                Para pagos a alguien que no está en el cuadro. UVT {cop(uvt)}. ICA fijo 8,66‰.
                Se asume que la persona paga su seguridad social (salud + pensión).
              </p>

              <label className="calc-f">Valor a pagar (cuenta de cobro)
                <InputMonto valor={valor} onValor={setValor} decimales={false} placeholder="Ej. 2.000.000" />
              </label>

              <div className="calc-res">
                <div className="calc-row"><span>Seguridad social asumida <small>28,5% × 40% (IBC)</small></span><b className="neg">−{cop(aportes)}</b></div>
                <div className="calc-row"><span>Base gravable renta</span><b>{r.baseUvt.toFixed(2)} UVT</b></div>
                <div className="calc-row"><span>ReteICA (8,66‰)</span><b className="neg">{cop(r.reteIca)}</b></div>
                <div className="calc-row"><span>ReteRenta (Art. 383)</span><b className="neg">{cop(r.reteRenta)}</b></div>
                <div className="calc-row total"><span>Valor a girar</span><b>{cop(r.valorGirar)}</b></div>
              </div>
              {v > 0 && r.reteRenta === 0 && (
                <p className="cf-hint">La base ({r.baseUvt.toFixed(2)} UVT) no supera las 95 UVT → no hay retención de renta.</p>
              )}
              <p className="cf-hint" style={{ marginTop: 8 }}>
                La seguridad social no se descuenta del giro (la paga la persona); solo baja la base para calcular la retención de renta.
              </p>
            </div>
            <div className="cf-modal-foot">
              <button type="button" className="cf-btn cf-btn-ghost" onClick={() => setAbierto(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
