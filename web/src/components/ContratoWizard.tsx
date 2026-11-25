"use client";

import { useMemo, useState, useTransition } from "react";
import { renderContrato, PLANTILLAS, MONEDAS, varsPlanMarketingVacias, fmtMoneda, totalContrato, type VarsPlanMarketing, type PagoLinea } from "@/lib/contrato-plantilla";
import { guardarContrato } from "@/app/trd/contratos/acciones";
import { conCarga } from "@/lib/carga";

export function ContratoWizard({ id, inicial, plantilla: plantillaIni }: { id?: number; inicial?: VarsPlanMarketing; plantilla?: string }) {
  const [v, setV] = useState<VarsPlanMarketing>(inicial ?? varsPlanMarketingVacias());
  const [plantilla, setPlantilla] = useState(plantillaIni ?? "plan_marketing");
  const extras = v.plantillasExtra ?? [];
  const [pending, start] = useTransition();
  const set = (patch: Partial<VarsPlanMarketing>) => setV((x) => ({ ...x, ...patch }));
  const setPago = (i: number, patch: Partial<PagoLinea>) =>
    setV((x) => ({ ...x, pagos: x.pagos.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const toggleExtra = (clave: string) =>
    setV((x) => { const cur = x.plantillasExtra ?? []; return { ...x, plantillasExtra: cur.includes(clave) ? cur.filter((c) => c !== clave) : [...cur, clave] }; });

  const html = useMemo(() => renderContrato(plantilla, v, { resaltar: true }), [plantilla, v]);

  const guardar = (enviar: boolean) => {
    if (!v.clienteNombre.trim()) { alert("Escribe el nombre del cliente."); return; }
    start(async () => {
      await conCarga(guardarContrato({
        id, clienteNombre: v.clienteNombre, clienteEmail: v.clienteEmail, clienteDomicilio: v.clienteDomicilio,
        plantilla, variables: v, enviar,
      }));
    });
  };

  return (
    <div className="ctr-wiz">
      <div className="ctr-form">
        <div className="grp"><h3><span className="dot">1</span> Plantilla y cliente</h3>
          <label>Contrato principal <small>(trae el intro y la firma)</small>
            <select value={plantilla} onChange={(e) => { const nv = e.target.value; setPlantilla(nv); setV((x) => ({ ...x, plantillasExtra: (x.plantillasExtra ?? []).filter((c) => c !== nv) })); }}>
              {PLANTILLAS.filter((p) => p.disponible).map((p) => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}
            </select>
          </label>
          <div className="field">
            <label style={{ marginBottom: 6 }}>Servicios adicionales en el mismo documento <small>(opcional)</small></label>
            <div className="ctr-extras">
              {PLANTILLAS.filter((p) => p.disponible && p.clave !== plantilla).map((p) => (
                <label key={p.clave} className="chk">
                  <input type="checkbox" checked={extras.includes(p.clave)} onChange={() => toggleExtra(p.clave)} /> {p.nombre}
                </label>
              ))}
            </div>
            <p className="ctr-hint" style={{ marginTop: 6 }}>Se agregan en un <b>solo documento</b> con <b>una sola firma</b>. El intro (“Entre TRD INVESTMENT LLC… y EL CLIENTE…”) no se repite.</p>
          </div>
          <label>Nombre del cliente *
            <input value={v.clienteNombre} onChange={(e) => set({ clienteNombre: e.target.value })} placeholder="Nombre del cliente" />
          </label>
          <div className="dos">
            <label>Correo del cliente
              <input value={v.clienteEmail ?? ""} onChange={(e) => set({ clienteEmail: e.target.value })} placeholder="correo@dominio.com" />
            </label>
            <label>Domicilio
              <input value={v.clienteDomicilio ?? ""} onChange={(e) => set({ clienteDomicilio: e.target.value })} />
            </label>
          </div>
        </div>

        <div className="grp"><h3><span className="dot">2</span> Vigencia y fechas</h3>
          <div className="dos">
            <label>Permanencia (meses)
              <input value={v.meses} onChange={(e) => set({ meses: e.target.value })} />
            </label>
            <label>Moneda
              <select value={v.moneda} onChange={(e) => set({ moneda: e.target.value })}>
                {MONEDAS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <div className="dos">
            <label>Fecha de inicio
              <input type="date" value={v.fechaInicio ?? ""} onChange={(e) => set({ fechaInicio: e.target.value })} />
            </label>
            <label>Inicio de campañas <small>(opc.)</small>
              <input type="date" value={v.fechaCampanas ?? ""} onChange={(e) => set({ fechaCampanas: e.target.value })} />
            </label>
          </div>
          <div className="dos">
            <label>Finalización
              <input type="date" value={v.fechaFin ?? ""} onChange={(e) => set({ fechaFin: e.target.value })} />
            </label>
            <label>Nota especial <small>(opc.)</small>
              <input value={v.notaEspecial ?? ""} onChange={(e) => set({ notaEspecial: e.target.value })} placeholder="Ej. Diciembre es bono…" />
            </label>
          </div>
        </div>

        <div className="grp"><h3><span className="dot">3</span> Inversión y forma de pago</h3>
          <p className="ctr-hint">Monto numérico ({v.moneda}) para poder sumar el valor del contrato. La “nota” es texto libre opcional (ej. “o $1.500/mes”).</p>
          {v.pagos.map((p, i) => (
            <div className="ctr-payline3" key={i}>
              <input value={p.concepto} onChange={(e) => setPago(i, { concepto: e.target.value })} placeholder="Concepto" />
              <input type="number" step="0.01" inputMode="decimal" value={p.monto || ""} onChange={(e) => setPago(i, { monto: parseFloat(e.target.value) || 0 })} placeholder="Monto" />
              <input value={p.nota ?? ""} onChange={(e) => setPago(i, { nota: e.target.value })} placeholder="Nota (opc.)" />
              <button type="button" className="ctr-delx" onClick={() => set({ pagos: v.pagos.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="ctr-addline" onClick={() => set({ pagos: [...v.pagos, { concepto: "", monto: 0 }] })}>+ Agregar línea de pago</button>
          <div className="ctr-total">Total del contrato: <b>{fmtMoneda(totalContrato(v), v.moneda)}</b></div>
          <label className="chk" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={v.cobrosAuto} onChange={(e) => set({ cobrosAuto: e.target.checked })} /> Cobros automáticos por Stripe tras el primer pago
          </label>
        </div>

        <div className="grp"><h3><span className="dot">4</span> Anotaciones</h3>
          <label>Condiciones especiales negociadas <small>(opc.)</small>
            <textarea value={v.anotaciones ?? ""} onChange={(e) => set({ anotaciones: e.target.value })} rows={3} />
          </label>
        </div>

        <div className="ctr-acc">
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => guardar(false)}>Guardar borrador</button>
          <button type="button" className="btn-primary" disabled={pending} onClick={() => guardar(true)}>Enviar a firmar →</button>
        </div>
      </div>

      <div className="ctr-preview">
        <div className="ctr-preview-top">
          <span className="ctr-lbl">Vista previa en vivo</span>
          <span className="ctr-legend"><span className="sw sw-var"></span> Variable (editable) &nbsp; <span className="sw sw-fix"></span> Cláusula fija</span>
        </div>
        <div className="ctr-paper" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
