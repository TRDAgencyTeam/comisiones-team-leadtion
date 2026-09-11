"use client";

import { useEffect, useState } from "react";
import { analizarCierre, confirmarCierre, type AnalisisCierre } from "@/app/trd/clientes/acciones";

const LT_OPCIONES = [
  { v: "igual", label: "Sigue igual" },
  { v: "licencia", label: "Solo licencia ($69)" },
  { v: "soporte", label: "Plan de soporte" },
  { v: "pausar", label: "Pausar cuenta" },
  { v: "cancelar", label: "Cancelar cuenta" },
];

/**
 * Popup de anulación/cierre: al abrir analiza los servicios del cliente. Los de
 * agencia se desactivan por separado; para la membresía Leadtion se elige el
 * resultado (sigue / solo licencia / soporte / pausar / cancelar). Minimalista.
 */
export function CierreClienteModal({ facturaId, onCancel, onConfirm }: { facturaId: number; onCancel: () => void; onConfirm: () => void }) {
  const [data, setData] = useState<AnalisisCierre | null>(null);
  const [err, setErr] = useState(false);
  const [agOff, setAgOff] = useState<Record<string, boolean>>({});
  const [ltRes, setLtRes] = useState("igual");
  const [ltValor, setLtValor] = useState("");

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await analizarCierre(facturaId);
        if (!vivo) return;
        if (!d) { setErr(true); return; }
        const init: Record<string, boolean> = {};
        d.agencia.forEach((a) => { init[String(a.itemId ?? "single")] = true; }); // agencia OFF por defecto
        setAgOff(init);
        setData(d);
      } catch { if (vivo) setErr(true); }
    })();
    return () => { vivo = false; };
  }, [facturaId]);

  const moneda = data?.entidad === "COL" ? "COP" : "USD";
  const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(n);
  const keyOf = (a: AnalisisCierre["agencia"][number]) => String(a.itemId ?? "single");
  const isSingle = !!data && data.agencia.length === 1 && data.agencia[0]!.itemId == null;
  const allAgOff = !!data && data.agencia.every((a) => agOff[keyOf(a)]);
  const anularFactura = isSingle ? !!agOff.single : allAgOff;
  const offItemIds = data && !isSingle ? data.agencia.filter((a) => agOff[keyOf(a)]).map((a) => a.itemId!) : [];

  return (
    <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="cf-modal" style={{ maxWidth: 440 }}>
        <div className="cf-modal-head"><h3>Anular — {data?.clienteNombre ?? "…"}</h3><button type="button" className="x" onClick={onCancel}>✕</button></div>

        {!data && !err && (
          <div className="cf-modal-body">
            <div className="trd-loading" style={{ minHeight: 130 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="trd-loading-badge"><img src="/brand/trd/trd-symbol-white.png" alt="" width={34} height={34} /></div>
              <span>Analizando servicios…</span>
            </div>
          </div>
        )}

        {err && <div className="cf-modal-body"><p className="cf-hint">No se pudo analizar la factura. Intenta de nuevo.</p><div className="cf-modal-foot"><button type="button" className="cf-btn cf-btn-ghost" onClick={onCancel}>Cerrar</button></div></div>}

        {data && (
          <form action={confirmarCierre} onSubmit={onConfirm}>
            <input type="hidden" name="facturaId" value={facturaId} />
            <input type="hidden" name="anularFactura" value={anularFactura ? "1" : "0"} />
            {offItemIds.map((id) => <input key={id} type="hidden" name="offItem" value={id} />)}
            {data.leadtion && <><input type="hidden" name="clienteId" value={data.leadtion.clienteId} /><input type="hidden" name="leadtionResultado" value={ltRes} /><input type="hidden" name="leadtionValor" value={ltValor} /></>}
            <div className="cf-modal-body">
              <div className="cf-svc-label">Servicios identificados</div>
              {data.agencia.map((a) => {
                const k = keyOf(a); const off = !!agOff[k];
                return (
                  <div key={k} className="cf-svc-row">
                    <span className="nm">{a.concepto}<small>{money(a.monto)}</small></span>
                    <button type="button" className={`cf-toggle ${off ? "off" : "on"}`} onClick={() => setAgOff((s) => ({ ...s, [k]: !off }))}>{off ? "Desactivado" : "Activo"}</button>
                  </div>
                );
              })}
              {data.leadtion && (
                <div className="cf-svc-row">
                  <span className="nm">Leadtion · Membresía<small>{data.leadtion.esAgencia || data.leadtion.valorUsd === 0 ? "incluida" : money(data.leadtion.valorUsd)}</small></span>
                  <select className="cf-lt-sel" value={ltRes} onChange={(e) => setLtRes(e.target.value)}>
                    {LT_OPCIONES.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                  </select>
                </div>
              )}
              {data.leadtion && ltRes === "soporte" && (
                <div className="cf-f"><input inputMode="decimal" value={ltValor} onChange={(e) => setLtValor(e.target.value)} placeholder={`Valor del soporte / mes (${moneda})`} /></div>
              )}
              <div className="cf-f" style={{ marginTop: 12 }}><input name="motivo" placeholder="Motivo (opcional)" /></div>
            </div>
            <div className="cf-modal-foot">
              <button type="button" className="cf-btn cf-btn-ghost" onClick={onCancel}>Cancelar</button>
              <button type="submit" className="cf-btn cf-btn-primary">Confirmar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
