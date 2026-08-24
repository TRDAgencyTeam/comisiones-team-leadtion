"use client";

import { useState } from "react";
import type { GastoFijo, CategoriaGasto } from "@/lib/gastos-tipos";
import { CATEGORIA_LABEL, RECURRENCIA_LABEL } from "@/lib/gastos-tipos";

export function GastoForm({
  action, gasto, error,
}: {
  action: (formData: FormData) => void;
  gasto?: GastoFijo;
  error?: string;
}) {
  const [categoria, setCategoria] = useState<CategoriaGasto>(gasto?.categoria ?? "otro");
  const esServicio = categoria === "servicio_publico";
  const esHerramienta = categoria === "herramienta";
  const esHosting = categoria === "hosting";
  const esPaso = categoria === "paso_dinero";

  return (
    <form action={action} className="persona-form">
      {gasto && <input type="hidden" name="id" value={gasto.id} />}
      {error && <p className="alerta">{error}</p>}

      <div className="pf-grid">
        <label>Tipo de gasto
          <select name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}>
            {(Object.keys(CATEGORIA_LABEL) as CategoriaGasto[]).map((c) => (
              <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>
            ))}
          </select>
        </label>
        <label className="pf-full">Nombre *
          <input name="nombre" defaultValue={gasto?.nombre ?? ""} required placeholder="Ej: Arriendo, Siigo, Hosting V1…" />
        </label>

        <label>Moneda
          <select name="moneda" defaultValue={gasto?.moneda ?? "COP"}>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label>Valor
          <input name="valor" type="number" step="0.01" defaultValue={gasto?.valor || ""} placeholder="0" />
        </label>
        <label>Recurrencia
          <select name="recurrencia" defaultValue={gasto?.recurrencia ?? "mensual"}>
            {(Object.keys(RECURRENCIA_LABEL) as (keyof typeof RECURRENCIA_LABEL)[]).map((r) => (
              <option key={r} value={r}>{RECURRENCIA_LABEL[r]}</option>
            ))}
          </select>
        </label>

        {esServicio && (
          <label>% que asume la empresa
            <input name="porcentajeReparto" type="number" step="0.01" min="0" max="100"
              defaultValue={gasto?.porcentajeReparto ?? 100} placeholder="100" />
          </label>
        )}
        {!esServicio && <input type="hidden" name="porcentajeReparto" value={gasto?.porcentajeReparto ?? 100} />}

        {esHerramienta && (
          <>
            <label>Día de cobro
              <input name="diaCobro" type="number" min="1" max="31" defaultValue={gasto?.diaCobro ?? ""} placeholder="15" />
            </label>
            <label>Método de pago
              <input name="metodoPago" defaultValue={gasto?.metodoPago ?? ""} placeholder="BOA, Bancolombia…" />
            </label>
          </>
        )}

        {esHosting && (
          <label className="pf-check">
            <input type="checkbox" name="amortizar" value="1" defaultChecked={gasto?.amortizar ?? true} />
            Amortizar mensualmente
          </label>
        )}

        {!esPaso && (
          <label className="pf-check">
            <input type="checkbox" name="afectaUtilidad" value="1" defaultChecked={gasto?.afectaUtilidad ?? true} />
            Cuenta como gasto (afecta la utilidad)
          </label>
        )}
        {!esServicio && !esPaso && <span />}

        <label className="pf-full">Notas
          <input name="notas" defaultValue={gasto?.notas ?? ""} placeholder="Opcional" />
        </label>
      </div>

      <div className="pf-acciones">
        <button type="submit" className="btn-primary">{gasto ? "Guardar cambios" : "Crear gasto"}</button>
      </div>
    </form>
  );
}
