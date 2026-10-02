"use client";

import { useState } from "react";
import { InputMonto } from "@/components/InputMonto";
import { calcularRetenciones, TARIFA_ICA_DEFAULT } from "@/lib/retenciones";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/**
 * Calculadora suelta de retenciones (ICA + renta) para pagos a personas que NO
 * están en el cuadro. Usa la MISMA lógica del REG (`calcularRetenciones`,
 * tabla Art. 383 ET) con la UVT del mes. Se abre como pop-up.
 */
export function RegCalculadora({ uvt }: { uvt: number }) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState<number | null>(null);
  const [ica, setIca] = useState<number>(TARIFA_ICA_DEFAULT);
  const [aportes, setAportes] = useState<number | null>(null);

  const r = calcularRetenciones({ valor: valor ?? 0, tarifaIcaMil: ica, aporteSalud: aportes ?? 0, uvt });

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
              <p className="cf-hint" style={{ marginTop: 0 }}>Para pagos a alguien que no está en el cuadro. UVT {cop(uvt)} (año en curso).</p>

              <label className="calc-f">Valor a pagar (cuenta de cobro)
                <InputMonto valor={valor} onValor={setValor} decimales={false} placeholder="Ej. 2.000.000" />
              </label>
              <div className="calc-grid2">
                <label className="calc-f">Tarifa ICA (por mil)
                  <input type="number" step="0.01" min="0" value={ica} onChange={(e) => setIca(Number(e.target.value) || 0)} placeholder="8.66" />
                </label>
                <label className="calc-f">Aportes salud + pensión <small>opcional</small>
                  <InputMonto valor={aportes} onValor={setAportes} decimales={false} placeholder="0" />
                </label>
              </div>

              <div className="calc-res">
                <div className="calc-row"><span>Base gravable renta</span><b>{r.baseUvt.toFixed(2)} UVT</b></div>
                <div className="calc-row"><span>ReteICA ({ica.toLocaleString("es-CO")}‰)</span><b className="neg">{cop(r.reteIca)}</b></div>
                <div className="calc-row"><span>ReteRenta (Art. 383)</span><b className="neg">{cop(r.reteRenta)}</b></div>
                <div className="calc-row total"><span>Valor a girar</span><b>{cop(r.valorGirar)}</b></div>
              </div>
              {valor != null && valor > 0 && r.reteRenta === 0 && (
                <p className="cf-hint">La base ({r.baseUvt.toFixed(2)} UVT) no supera las 95 UVT → no hay retención de renta.</p>
              )}
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
