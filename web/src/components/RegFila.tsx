"use client";

import { useState } from "react";
import type { RenglonReg } from "@/lib/reg";
import { calcularRetenciones } from "@/lib/retenciones";
import { guardarPago, toggleCheck, eliminarPago, enviarCorreoPago } from "@/app/trd/reg/acciones";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/** Botón-check de un estado del proceso (post al server, revalida). */
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

/** Celda "Correo": envía el correo de pago (colaborador) y marca el check. */
function CorreoCell({ pagoId, enviado }: { pagoId: number | null; enviado: boolean }) {
  if (pagoId == null) {
    return <td className="center"><span className="ck ck-off" title="Guarda el pago primero">–</span></td>;
  }
  if (enviado) {
    return (
      <td className="center">
        <form action={toggleCheck}>
          <input type="hidden" name="pagoId" value={pagoId} />
          <input type="hidden" name="campo" value="ck_correo" />
          <input type="hidden" name="valor" value="0" />
          <button type="submit" className="ck ck-on" title="Correo enviado (clic para desmarcar)">✓</button>
        </form>
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
  const [valor, setValor] = useState(r.valorCuentaCobro || 0);
  const [tarifa, setTarifa] = useState(r.tarifaIcaMil || 0);
  const [salud, setSalud] = useState(r.aporteSalud || 0);
  const [pension, setPension] = useState(r.aportePension || 0);

  // Cálculo EN VIVO con la misma fórmula del backend (fuente única).
  const calc = calcularRetenciones({ valor, tarifaIcaMil: tarifa, aporteSalud: salud, aportePension: pension, uvt });
  const rowId = `reg-${r.colaboradorId ?? "f"}-${r.pagoId ?? "new"}`;

  // Freelance ya existente: solo lectura + checklist + eliminar (edición: borrar y recrear).
  if (r.esFreelance) {
    return (
      <tr>
        <td><span className="freelance-tag">freelance</span> {r.nombre}</td>
        <td className="muted">{r.actividadCiiu ?? "—"} · {r.tarifaIcaMil}‰</td>
        <td className="right">{cop(r.valorCuentaCobro)}</td>
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
      <td className="reg-actividad">
        <input form={rowId} name="actividad" defaultValue={r.actividadCiiu ?? ""} placeholder="CIIU" className="in-mini" />
        <input
          form={rowId} name="tarifa" type="number" step="0.01" value={tarifa || ""}
          onChange={(e) => setTarifa(Number(e.target.value) || 0)} placeholder="‰" className="in-tarifa"
        />
      </td>
      <td className="right">
        <input
          form={rowId} name="valor" type="number" step="1" value={valor || ""}
          onChange={(e) => setValor(Number(e.target.value) || 0)} className="in-valor" placeholder="0"
        />
      </td>
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
          <input type="hidden" name="salud" value={salud} />
          <input type="hidden" name="pension" value={pension} />
          <input type="hidden" name="identificacion" value={r.identificacion ?? ""} />
          <button type="submit" className="btn-secondary btn-guardar">Guardar</button>
        </form>
      </td>
    </tr>
  );
}
