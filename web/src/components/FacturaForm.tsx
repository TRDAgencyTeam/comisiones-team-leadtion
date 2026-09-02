"use client";

import { useState } from "react";
import type { FacturaRow } from "@/lib/facturacion";
import { MEDIOS, ESTADOS, calcLLC, calcCOL } from "@/lib/facturacion-calc";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

export function FacturaForm({
  action, mes, tasa, factura, clientes, error,
}: {
  action: (fd: FormData) => void;
  mes: string;
  tasa: number;
  factura?: FacturaRow;
  clientes: { id: number; nombre: string }[];
  error?: string;
}) {
  const [entidad, setEntidad] = useState<"LLC" | "COL">(factura?.entidad ?? "LLC");
  const [facturado, setFacturado] = useState(factura?.facturado ?? 0);
  const [medio, setMedio] = useState(factura?.medio ?? "stripe");
  const [ivaPct, setIvaPct] = useState(factura?.ivaPct ?? (factura ? factura.ivaPct : 19));

  const esLLC = entidad === "LLC";
  const llc = calcLLC(facturado, medio);
  const col = calcCOL(facturado, ivaPct, tasa);

  return (
    <form action={action} className="persona-form">
      {factura && <input type="hidden" name="id" value={factura.id} />}
      <input type="hidden" name="mes" value={factura?.mes ?? mes} />
      {factura?.clienteId && <input type="hidden" name="clienteId" value={factura.clienteId} />}
      {error && <p className="alerta">{error}</p>}

      <div className="pf-grid">
        <label>Entidad
          <select name="entidad" value={entidad} onChange={(e) => setEntidad(e.target.value as "LLC" | "COL")}>
            <option value="LLC">LLC (EE.UU. · USD)</option>
            <option value="COL">Colombia (Ebenezer · COP + IVA)</option>
          </select>
        </label>
        <label>Cliente *
          <input name="clienteNombre" defaultValue={factura?.clienteNombre ?? ""} list="clientes-dl" required placeholder="Nombre del cliente" />
          <datalist id="clientes-dl">{clientes.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
        </label>
        <label>MRR # (opcional)
          <input name="mrr" type="number" min="1" defaultValue={factura?.mrr ?? ""} placeholder="—" />
        </label>

        <label className="pf-full">Servicios contratados
          <input name="servicios" defaultValue={factura?.servicios ?? ""} placeholder="Meta Ads, LEADTION Text AI…" />
        </label>
        <label>Precio (desglose)
          <input name="precioDesglose" defaultValue={factura?.precioDesglose ?? ""} placeholder="$597 + $397 (MES 6)" />
        </label>
        <label>{esLLC ? "Facturado (USD)" : "Facturado COP (antes de IVA)"}
          <input name="facturado" type="number" step="0.01" value={facturado || ""} onChange={(e) => setFacturado(Number(e.target.value) || 0)} placeholder="0" />
        </label>

        <label>Medio de pago
          <select name="medio" value={medio ?? ""} onChange={(e) => setMedio(e.target.value)}>
            {MEDIOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        {!esLLC && (
          <label>IVA %
            <input name="ivaPct" type="number" step="0.01" value={ivaPct} onChange={(e) => setIvaPct(Number(e.target.value) || 0)} />
          </label>
        )}
        {esLLC && <input type="hidden" name="ivaPct" value="0" />}

        <label>Fecha de facturación
          <input name="fechaFactura" type="date" defaultValue={factura?.fechaFactura ?? ""} />
        </label>
        <label>Fecha de pago
          <input name="fechaPago" type="date" defaultValue={factura?.fechaPago ?? ""} />
        </label>
        <label>Estado
          <select name="estado" defaultValue={factura?.estado ?? "por_facturar"}>
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </label>
        <label className="pf-check" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="reserva" value="1" defaultChecked={factura?.reserva} style={{ width: "auto" }} /> Vino con reserva
        </label>
        <label className="pf-check" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="recurrente" value="1" defaultChecked={factura?.recurrente} style={{ width: "auto" }} /> Recurrente (plan mensual, se autogenera)
        </label>
      </div>

      <div className="factura-preview">
        {esLLC ? (
          <>Pasarela: <b>{usd(llc.pasarela)}</b> · Neto: <b>{usd(llc.neto)}</b></>
        ) : (
          <>IVA: <b>{cop(col.iva)}</b> · COP con IVA: <b>{cop(col.copConIva)}</b> · Neto agencia: <b>{usd(col.netoUsd)}</b></>
        )}
      </div>

      <div className="pf-acciones">
        <button type="submit" className="btn-primary">{factura ? "Guardar cambios" : "Agregar factura"}</button>
      </div>
    </form>
  );
}
