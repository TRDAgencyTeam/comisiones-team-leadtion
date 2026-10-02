"use client";

import { useEffect, useState } from "react";

/**
 * Pop-up de advertencia al ENTRAR al registro contable: recuerda verificar el
 * mes antes de pagar. Sale una vez por mes por sesión (sessionStorage), así no
 * se pierde de vista pero no molesta en cada navegación.
 */
export function RegAvisoMes({ mes, mesNombre }: { mes: string; mesNombre: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let yaVisto = false;
    try { yaVisto = sessionStorage.getItem(`reg-aviso-${mes}`) === "1"; } catch { /* modo privado */ }
    if (!yaVisto) setVisible(true);
  }, [mes]);

  if (!visible) return null;

  const cerrar = () => {
    try { sessionStorage.setItem(`reg-aviso-${mes}`, "1"); } catch { /* modo privado */ }
    setVisible(false);
  };

  return (
    <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="cf-modal reg-aviso-modal" style={{ maxWidth: 420 }}>
        <div className="cf-modal-body" style={{ textAlign: "center" }}>
          <div className="reg-aviso-modal-ico" aria-hidden="true">⚠️</div>
          <h3 style={{ margin: "6px 0 10px" }}>Verifica el mes de pago</h3>
          <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.5 }}>
            Antes de confirmar pagos, verifica que estás en el mes correcto.<br />
            Ahorita estás en <b>{mesNombre}</b>.
          </p>
        </div>
        <div className="cf-modal-foot" style={{ justifyContent: "center" }}>
          <button type="button" className="cf-btn cf-btn-primary" onClick={cerrar}>Entendido, estoy en {mesNombre}</button>
        </div>
      </div>
    </div>
  );
}
