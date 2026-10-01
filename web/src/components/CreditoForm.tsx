"use client";

import { useState } from "react";
import type { Credito } from "@/lib/credito";
import { InputMonto } from "@/components/InputMonto";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function cuotasRestantes(saldo: number, cuota: number, tasaEa: number): number | null {
  const i = Math.pow(1 + tasaEa / 100, 1 / 12) - 1;
  if (cuota <= saldo * i) return null;
  return Math.ceil(-Math.log(1 - (i * saldo) / cuota) / Math.log(1 + i));
}

export function CreditoForm({ action, credito }: { action: (fd: FormData) => void; credito: Credito }) {
  const [saldo, setSaldo] = useState(credito.saldo);
  const [cuota, setCuota] = useState(credito.cuota);
  const [tasaEa, setTasaEa] = useState(credito.tasaEa);
  const [abono, setAbono] = useState(0);

  const nActual = cuotasRestantes(saldo, cuota, tasaEa);
  const nConAbono = cuotasRestantes(Math.max(0, saldo - abono), cuota, tasaEa);
  const ahorroMeses = nActual != null && nConAbono != null ? nActual - nConAbono : null;

  return (
    <>
      <form action={action} className="persona-form">
        <input type="hidden" name="id" value={credito.id} />
        <div className="pf-grid">
          <label>Saldo actual (COP)
            <InputMonto name="saldo" decimales={false} valor={saldo} onValor={setSaldo} />
          </label>
          <label>Cuota mensual (COP)
            <InputMonto name="cuota" decimales={false} valor={cuota} onValor={setCuota} />
          </label>
          <label>Tasa E.A. (%)
            <input name="tasaEa" type="number" step="0.01" value={tasaEa} onChange={(e) => setTasaEa(Number(e.target.value) || 0)} />
          </label>
          <label>Interés corriente última cuota (COP)
            <InputMonto name="interesCorriente" decimales={false} defaultValue={credito.interesCorriente || ""} />
          </label>
        </div>
        <div className="pf-acciones">
          <button type="submit" className="btn-primary">Guardar</button>
        </div>
      </form>

      <div className="credito-sim">
        <h3>Simulador de prepago</h3>
        <p className="sub">Con los valores de arriba, faltan <strong>{nActual ?? "—"}</strong> cuotas
          {nActual != null && <> (~{Math.ceil(nActual / 12)} años)</>}.</p>
        <label className="sim-abono">Abono extra a capital
          <InputMonto decimales={false} valor={abono} onValor={setAbono} placeholder="0" />
        </label>
        {abono > 0 && nConAbono != null && (
          <p className="sim-res">
            Con un abono de <strong>{cop(abono)}</strong>: el saldo baja a <strong>{cop(Math.max(0, saldo - abono))}</strong> y
            quedarían <strong>{nConAbono}</strong> cuotas
            {ahorroMeses != null && ahorroMeses > 0 && <> — te ahorras <strong>{ahorroMeses}</strong> cuotas.</>}
          </p>
        )}
      </div>
    </>
  );
}
