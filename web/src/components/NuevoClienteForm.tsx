"use client";

import { useState } from "react";
import { MEDIOS, ESTADOS, calcLLC, calcCOL } from "@/lib/facturacion-calc";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

const PLANES = [
  { value: "", label: "Ninguno (solo agencia / estándar)" },
  { value: "agente_ai", label: "Agente IA ($847)" },
  { value: "reactivacion", label: "Reactivación ($597 + $197 + $197)" },
  { value: "level_up", label: "Level Up ($497)" },
];

export function NuevoClienteForm({
  action, mes, tasa, afiliados, colaboradores, error,
}: {
  action: (fd: FormData) => void;
  mes: string;
  tasa: number;
  afiliados: { ref: string; nombre: string; tipo: string }[];
  colaboradores: { id: number; nombre: string }[];
  error?: string;
}) {
  const [entidad, setEntidad] = useState<"LLC" | "COL">("LLC");
  const [esAgencia, setEsAgencia] = useState(true);
  const [planTipo, setPlanTipo] = useState("");
  const [facturado, setFacturado] = useState(0);
  const [medio, setMedio] = useState("stripe");
  const [ivaPct, setIvaPct] = useState(19);

  const esLLC = entidad === "LLC";
  const llc = calcLLC(facturado, medio);
  const col = calcCOL(facturado, ivaPct, tasa);

  return (
    <form action={action} className="persona-form">
      <input type="hidden" name="mes" value={mes} />
      {error && <p className="alerta">{error}</p>}

      <h3 className="nc-sec">Datos del cliente</h3>
      <div className="pf-grid">
        <label className="pf-full">Nombre *
          <input name="nombre" required placeholder="Nombre del cliente" />
        </label>
        <label>Entidad
          <select name="entidad" value={entidad} onChange={(e) => setEntidad(e.target.value as "LLC" | "COL")}>
            <option value="LLC">LLC (EE.UU. · USD)</option>
            <option value="COL">Colombia (Ebenezer · COP)</option>
          </select>
        </label>
        <label>Fecha de activación
          <input name="fechaActivacion" type="date" defaultValue={`${mes}-01`} />
        </label>
        <label className="pf-check" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="esAgencia" value="1" checked={esAgencia} onChange={(e) => setEsAgencia(e.target.checked)} style={{ width: "auto" }} /> Cliente de agencia (licencia incluida)
        </label>
        <label>Plan / servicio Leadtion
          <select name="planTipo" value={planTipo} onChange={(e) => setPlanTipo(e.target.value)}>
            {PLANES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        {planTipo && (
          <label>Precio mes 1 (opcional)
            <input name="precioMes1" type="number" step="0.01" placeholder="Estándar si vacío" />
          </label>
        )}
        <label>Soporte ($/mes, opcional)
          <input name="soporteValor" type="number" step="0.01" placeholder="—" />
        </label>
        <label className="pf-check" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="reserva" value="1" style={{ width: "auto" }} /> Vino con reserva
        </label>
      </div>

      <h3 className="nc-sec">Conexiones</h3>
      <div className="pf-grid">
        <label>Referido por (afiliado)
          <select name="afiliadoRef" defaultValue="">
            <option value="">— Ninguno —</option>
            {afiliados.map((a) => <option key={a.ref} value={a.ref}>{a.nombre} ({a.tipo})</option>)}
          </select>
        </label>
        <div className="pf-full">
          <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Customer Success (quién comisiona)</span>
          <div className="nc-checks">
            {colaboradores.map((c) => (
              <label key={c.id} className="nc-chk"><input type="checkbox" name="asignados" value={c.id} /> {c.nombre}</label>
            ))}
          </div>
        </div>
      </div>

      <h3 className="nc-sec">Primera factura ({mes})</h3>
      <div className="pf-grid">
        <label className="pf-full">Servicios contratados
          <input name="servicios" placeholder="Meta Ads, LEADTION Text AI…" />
        </label>
        <label>Precio (desglose)
          <input name="precioDesglose" placeholder="$597 + $397 (MES 1)" />
        </label>
        <label>{esLLC ? "Facturado (USD)" : "Facturado COP (antes de IVA)"}
          <input name="facturado" type="number" step="0.01" value={facturado || ""} onChange={(e) => setFacturado(Number(e.target.value) || 0)} placeholder="0" />
        </label>
        <label>Medio de pago
          <select name="medio" value={medio} onChange={(e) => setMedio(e.target.value)}>
            {MEDIOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        {!esLLC && (
          <label>IVA %
            <input name="ivaPct" type="number" step="0.01" value={ivaPct} onChange={(e) => setIvaPct(Number(e.target.value) || 0)} />
          </label>
        )}
        <label>Estado
          <select name="estado" defaultValue="por_facturar">
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </label>
      </div>

      <div className="factura-preview">
        {esLLC ? <>Pasarela: <b>{usd(llc.pasarela)}</b> · Neto: <b>{usd(llc.neto)}</b></>
          : <>IVA: <b>{cop(col.iva)}</b> · Neto agencia: <b>{usd(col.netoUsd)}</b></>}
      </div>

      <div className="pf-acciones">
        <button type="submit" className="btn-primary">Crear cliente (cascada)</button>
      </div>
    </form>
  );
}
