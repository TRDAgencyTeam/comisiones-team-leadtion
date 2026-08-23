"use client";

import { useState } from "react";
import type { RenglonReg } from "@/lib/reg";
import { calcularRetenciones, TARIFA_ICA_DEFAULT } from "@/lib/retenciones";
import { guardarPago, toggleCheck, eliminarPago, enviarCorreoPago } from "@/app/trd/reg/acciones";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/** Formatea dígitos con puntos de miles para mostrar en el input. */
const fmtMiles = (v: string | number) => {
  const d = String(v).replace(/[^\d]/g, "");
  return d ? Number(d).toLocaleString("es-CO") : "";
};
const soloNum = (v: string) => Number(v.replace(/[^\d]/g, "")) || 0;

function CheckCell({ pagoId, campo, valor }: { pagoId: number | null; campo: string; valor: boolean }) {
  if (pagoId == null) {
    return <td className="center"><span className="ck ck-off" title="Guarda el pago primero">–</span></td>;
  }
  return (
    <td className="center">
      <form action={toggleCheck}>
        <input type="hidden" name="pagoId" value={pagoId} />
        <input type="hidden" name="campo" value={campo} />
        <input type="hidden" name="valor" value={valor ? "0" : "1"} />
        <button type="submit" className={`ck ${valor ? "ck-on" : "ck-off"}`} aria-pressed={valor}>
          {valor ? "✓" : ""}
        </button>
      </form>
    </td>
  );
}

function CorreoCell({ pagoId, enviado }: { pagoId: number | null; enviado: boolean }) {
  if (pagoId == null) {
    return <td className="center"><span className="ck ck-off" title="Guarda el pago primero">–</span></td>;
  }
  if (enviado) {
    return (
      <td className="center">
        <div className="ck-group">
          <form action={toggleCheck}>
            <input type="hidden" name="pagoId" value={pagoId} />
            <input type="hidden" name="campo" value="ck_correo" />
            <input type="hidden" name="valor" value="0" />
            <button type="submit" className="ck ck-on" title="Enviado — clic para desmarcar">✓</button>
          </form>
          <form action={enviarCorreoPago}>
            <input type="hidden" name="pagoId" value={pagoId} />
            <button type="submit" className="ck-mini" title="Reenviar correo">↻</button>
          </form>
        </div>
      </td>
    );
  }
  return (
    <td className="center">
      <form action={enviarCorreoPago}>
        <input type="hidden" name="pagoId" value={pagoId} />
        <button type="submit" className="ck ck-send" title="Enviar correo de pago al colaborador">✉</button>
      </form>
    </td>
  );
}

export function RegFila({ r, mes, uvt }: { r: RenglonReg; mes: string; uvt: number }) {
  const [pagoFijo, setPagoFijo] = useState(r.pagoFijo || 0);
  const [adicional, setAdicional] = useState(r.adicional || 0);

  const total = pagoFijo + adicional + r.comision;
  const calc = calcularRetenciones({ valor: total, tarifaIcaMil: TARIFA_ICA_DEFAULT, uvt });
  const rowId = `reg-${r.colaboradorId ?? "f"}-${r.pagoId ?? "new"}`;

  if (r.esFreelance) {
    return (
      <tr>
        <td><span className="freelance-tag">freelance</span> {r.nombre}</td>
        <td className="right muted">—</td>
        <td className="right">{cop(r.valorCuentaCobro)}</td>
        <td className="right muted">—</td>
        <td className="right muted">—</td>
        <td className="right strong">{cop(r.valorCuentaCobro)}</td>
        <td className="right neg">{cop(r.reteIca)}</td>
        <td className="right neg">{cop(r.reteRenta)}</td>
        <td className="right strong">{cop(r.valorGirar)}</td>
        <CheckCell pagoId={r.pagoId} campo="ck_correo" valor={r.ckCorreo} />
        <CheckCell pagoId={r.pagoId} campo="ck_drive" valor={r.ckDrive} />
        <CheckCell pagoId={r.pagoId} campo="ck_registro" valor={r.ckRegistro} />
        <CheckCell pagoId={r.pagoId} campo="ck_pagado" valor={r.ckPagado} />
        <td>
          <form action={eliminarPago}>
            <input type="hidden" name="pagoId" value={r.pagoId ?? ""} />
            <button type="submit" className="btn-borrar" title="Eliminar">🗑️</button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{r.nombre}</td>
      <td className="right muted" title="Total pagado el mes anterior">
        {r.valorMesAnterior ? cop(r.valorMesAnterior) : "—"}
      </td>
      <td className="right">
        <input form={rowId} name="pagoFijo" inputMode="numeric" value={pagoFijo ? fmtMiles(pagoFijo) : ""}
          onChange={(e) => setPagoFijo(soloNum(e.target.value))} className="in-valor" placeholder="0" />
      </td>
      <td>
        <input form={rowId} name="adicional" inputMode="numeric" value={adicional ? fmtMiles(adicional) : ""}
          onChange={(e) => setAdicional(soloNum(e.target.value))} className="in-valor" placeholder="0" />
        <input form={rowId} name="adicionalDesc" defaultValue={r.adicionalDesc ?? ""} placeholder="concepto"
          className="in-desc" />
      </td>
      <td className="right muted" title="Comisión CS del mes (sincronizada con Leadtion)">
        {r.comision ? cop(r.comision) : "—"}
      </td>
      <td className="right strong">{cop(total)}</td>
      <td className="right neg">{cop(calc.reteIca)}</td>
      <td className="right neg">{cop(calc.reteRenta)}</td>
      <td className="right strong">{cop(calc.valorGirar)}</td>
      <CorreoCell pagoId={r.pagoId} enviado={r.ckCorreo} />
      <CheckCell pagoId={r.pagoId} campo="ck_drive" valor={r.ckDrive} />
      <CheckCell pagoId={r.pagoId} campo="ck_registro" valor={r.ckRegistro} />
      <CheckCell pagoId={r.pagoId} campo="ck_pagado" valor={r.ckPagado} />
      <td>
        <form id={rowId} action={guardarPago}>
          <input type="hidden" name="colaboradorId" value={r.colaboradorId ?? ""} />
          <input type="hidden" name="mes" value={mes} />
          <button type="submit" className="btn-secondary btn-guardar">{r.pagoId ? "Actualizar" : "Guardar"}</button>
        </form>
      </td>
    </tr>
  );
}
