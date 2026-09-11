"use client";

import { useEffect, useState } from "react";
import { analizarCierre, confirmarCierre, type AnalisisCierre } from "@/app/trd/clientes/acciones";

/**
 * Popup de anulación/cierre: al abrir analiza los servicios del cliente (agencia y
 * membresía Leadtion) y deja desactivar cada uno por separado. Minimalista.
 */
export function CierreClienteModal({ facturaId, onCancel, onConfirm }: { facturaId: number; onCancel: () => void; onConfirm: () => void }) {
  const [data, setData] = useState<AnalisisCierre | null>(null);
  const [err, setErr] = useState(false);
  const [agOff, setAgOff] = useState<Record<string, boolean>>({});
  const [ltOff, setLtOff] = useState(false);
  const [estado, setEstado] = useState<"cancelado" | "pausado">("cancelado");

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await analizarCierre(facturaId);
        if (!vivo) return;
        if (!d) { setErr(true); return; }
        const init: Record<string, boolean> = {};
        d.agencia.forEach((a) => { init[String(a.itemId ?? "single")] = true; }); // agencia OFF por defecto (se anula)
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
            {ltOff && data.leadtion && <><input type="hidden" name="leadtionOff" value="1" /><input type="hidden" name="clienteId" value={data.leadtion.clienteId} /><input type="hidden" name="estadoLeadtion" value={estado} /></>}
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
                  <button type="button" className={`cf-toggle ${ltOff ? "off" : "on"}`} onClick={() => setLtOff((v) => !v)}>{ltOff ? "Desactivado" : "Activo"}</button>
                </div>
              )}
              {ltOff && data.leadtion && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="button" className={`cf-chipbtn${estado === "cancelado" ? " on" : ""}`} onClick={() => setEstado("cancelado")}>Cancelar</button>
                  <button type="button" className={`cf-chipbtn${estado === "pausado" ? " on" : ""}`} onClick={() => setEstado("pausado")}>Pausar</button>
                </div>
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
