"use client";

import { useState } from "react";
import { ServiciosForm } from "./ServiciosForm";
import { SoporteForm } from "./SoporteForm";

/** Selector: registrar un servicio de entrada o un período de soporte. */
export function RegistrarForm({
  clienteId,
  accionServicio,
  accionSoporte,
}: {
  clienteId: number;
  accionServicio: (formData: FormData) => void;
  accionSoporte: (formData: FormData) => void;
}) {
  const [modo, setModo] = useState<"servicio" | "soporte">("servicio");

  return (
    <>
      <div className="segmented">
        <button type="button" className={modo === "servicio" ? "seg activo" : "seg"} onClick={() => setModo("servicio")}>
          Servicio de entrada
        </button>
        <button type="button" className={modo === "soporte" ? "seg activo" : "seg"} onClick={() => setModo("soporte")}>
          Período de soporte
        </button>
      </div>

      {modo === "servicio" ? (
        <ServiciosForm clienteId={clienteId} action={accionServicio} />
      ) : (
        <SoporteForm clienteId={clienteId} action={accionSoporte} />
      )}
    </>
  );
}
