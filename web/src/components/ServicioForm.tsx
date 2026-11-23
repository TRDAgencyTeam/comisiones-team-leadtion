"use client";

import { useState } from "react";
import type { ServicioAdmin } from "@/lib/servicios-catalogo";
import { CATEGORIA_LABEL } from "@/lib/catalogo-tipos";
import { InputMonto } from "@/components/InputMonto";
import { InfoTip } from "@/components/InfoTip";

const CATS = ["agencia", "leadtion", "ghl", "puntual"] as const;
const MARCAS: { v: string; label: string }[] = [
  { v: "agencia", label: "TRD Agency" },
  { v: "leadtion", label: "Leadtion" },
  { v: "ambas", label: "Agency + Leadtion" },
];

/** Formulario para crear/editar un servicio del catálogo (Nueva factura). */
export function ServicioForm({ action, servicio, error }: {
  action: (fd: FormData) => void;
  servicio?: ServicioAdmin;
  error?: string;
}) {
  const [recurrente, setRecurrente] = useState<boolean>(servicio?.recurrente ?? false);
  const [porPersona, setPorPersona] = useState<boolean>(servicio?.porPersona ?? false);
  const [precioVariable, setPrecioVariable] = useState<boolean>(servicio?.precioVariable ?? false);
  const [unidad, setUnidad] = useState<string>(servicio?.unidad ?? "persona");

  return (
    <form action={action} className="persona-form">
      {servicio && <input type="hidden" name="clave" value={servicio.clave} />}
      {error && <p className="alerta">{error}</p>}

      <div className="pf-grid">
        <label className="pf-full">Nombre del servicio *
          <input name="nombre" defaultValue={servicio?.nombre ?? ""} required placeholder="Ej: Plan Marketing, Diseño de Landing…" />
        </label>

        <label>Marca (negocio)
          <InfoTip titulo="Marca">A qué negocio pertenece: <b>TRD Agency</b>, <b>Leadtion</b>, o <b>Agency + Leadtion</b> (ej. Plan Marketing: servicio de agencia que además entrega cuenta Leadtion).</InfoTip>
          <select name="marca" defaultValue={servicio?.marca ?? "agencia"}>
            {MARCAS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </select>
        </label>
        <label>Categoría <InfoTip titulo="Categoría">Define el flujo interno del servicio (agencia / leadtion / GHL / puntual). La marca es solo el negocio al que pertenece.</InfoTip>
          <select name="categoria" defaultValue={servicio?.categoria ?? "agencia"}>
            {CATS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c] ?? c}</option>)}
          </select>
        </label>
        {/* Modalidad de cobro */}
        <div className="pf-full">
          <label style={{ marginBottom: 6 }}>Modalidad
            <InfoTip titulo="Modalidad">
              <b>Un solo pago:</b> se cobra una vez; al venderlo podrás dividirlo en cuotas si quieres.<br />
              <b>Recurrente:</b> se factura cada mes automáticamente (con precio del mes 1 y de los meses siguientes).
            </InfoTip>
          </label>
          <div className="cf-seg">
            <label><input type="radio" name="_mod" checked={!recurrente} onChange={() => setRecurrente(false)} /><span>Un solo pago</span></label>
            <label><input type="radio" name="_mod" checked={recurrente} onChange={() => setRecurrente(true)} /><span>Recurrente (mensual)</span></label>
          </div>
          <input type="hidden" name="recurrente" value={recurrente ? "1" : "0"} />
        </div>

        {!porPersona && !precioVariable && (
          <>
            <label>{recurrente ? "Precio mes 1" : "Precio base"} <small style={{ color: "var(--faint)" }}>USD (editable al vender)</small>
              <InputMonto name="precioMes1" defaultValue={servicio?.precioMes1 ?? ""} placeholder="0" />
            </label>
            {recurrente && (
              <label>Precio mes 2 en adelante <small style={{ color: "var(--faint)" }}>USD</small>
                <InputMonto name="precioResto" defaultValue={servicio?.precioResto ?? ""} placeholder="igual al mes 1 si se deja vacío" />
              </label>
            )}
          </>
        )}
        {(porPersona || precioVariable) && <input type="hidden" name="precioMes1" value={servicio?.precioMes1 ?? ""} />}
        {!recurrente && <input type="hidden" name="precioResto" value="" />}

        {recurrente && (
          <label>Contrato mínimo (meses) <InfoTip titulo="Contrato mínimo">Meses mínimos del contrato recurrente. Al cumplirlos, el sistema pregunta si continúa.</InfoTip>
            <input name="minMeses" type="number" min={1} max={24} defaultValue={servicio?.minMeses ?? 1} />
          </label>
        )}
        {!recurrente && <input type="hidden" name="minMeses" value={servicio?.minMeses ?? 1} />}

        {/* Flags del servicio */}
        <label className="pf-check pf-full">
          <input type="checkbox" name="incluyeLeadtion" value="1" defaultChecked={servicio?.incluyeLeadtion ?? false} />
          Es cuenta Leadtion (el cliente queda como miembro Leadtion)
          <InfoTip titulo="Cuenta Leadtion">Marca si este servicio entrega una cuenta Leadtion (licencia/membresía). Ej: Plan Marketing, Agente IA, Reactivación.</InfoTip>
        </label>

        <label className="pf-check pf-full">
          <input type="checkbox" name="precioVariable" value="1" checked={precioVariable} onChange={(e) => setPrecioVariable(e.target.checked)} />
          Precio variable (se define con cada cliente, sin precio fijo)
        </label>

        <label className="pf-check pf-full">
          <input type="checkbox" name="porPersona" value="1" checked={porPersona} onChange={(e) => setPorPersona(e.target.checked)} />
          Se cobra por cantidad (persona, puesto u hora): el total se multiplica por la cantidad
          <InfoTip titulo="Por cantidad">Ej: Campaña 90/10 (por persona), evento (por persona), mentoría (por hora). Al vender se pone la cantidad y se multiplica el valor por unidad. Estos no se dividen en cuotas.</InfoTip>
        </label>

        {porPersona && (
          <>
            <label>Unidad de cobro
              <select name="unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                <option value="persona">Por persona</option>
                <option value="puesto">Por puesto</option>
                <option value="hora">Por hora</option>
              </select>
            </label>
            <label>Valor por {unidad} <small style={{ color: "var(--faint)" }}>USD</small>
              <InputMonto name="precioPersona" defaultValue={servicio?.precioPersona ?? ""} placeholder="0" />
            </label>
            <label>Costo por {unidad} <small style={{ color: "var(--faint)" }}>USD · opcional</small>
              <InputMonto name="costoPersona" defaultValue={servicio?.costoPersona ?? ""} placeholder="0" />
            </label>
          </>
        )}
        {!porPersona && <input type="hidden" name="unidad" value="" />}

        <label className="pf-check">
          <input type="checkbox" name="aplicaCs" value="1" defaultChecked={servicio?.aplicaCs ?? true} />
          Comisiona Customer Success
        </label>
        <label className="pf-check">
          <input type="checkbox" name="comisionaComercial" value="1" defaultChecked={servicio?.comisionaComercial ?? true} />
          Comisiona comercial (10%)
        </label>
        <label className="pf-check">
          <input type="checkbox" name="aplicaReferido" value="1" defaultChecked={servicio?.aplicaReferido ?? false} />
          Aplica referido de afiliado
        </label>
        <label className="pf-check">
          <input type="checkbox" name="aplicaReserva" value="1" defaultChecked={servicio?.aplicaReserva ?? false} />
          Permite marcar "vino con reserva"
        </label>

        {servicio && (
          <label className="pf-check pf-full">
            <input type="checkbox" name="activo" value="1" defaultChecked={servicio?.activo ?? true} />
            Activo (aparece en la lista de Nueva factura)
          </label>
        )}

        <label className="pf-full">Notas
          <input name="notas" defaultValue={servicio?.notas ?? ""} placeholder="Opcional" />
        </label>
      </div>

      <div className="pf-acciones">
        <button type="submit" className="btn-primary">{servicio ? "Guardar cambios" : "Crear servicio"}</button>
      </div>
    </form>
  );
}
