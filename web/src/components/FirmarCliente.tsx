"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { firmarContrato } from "@/app/firmar/acciones";

const FUENTES: { key: string; label: string; css: string }[] = [
  { key: "dancing", label: "Firma", css: "'Dancing Script', cursive" },
  { key: "vibes", label: "Firma", css: "'Great Vibes', cursive" },
  { key: "sacra", label: "Firma", css: "'Sacramento', cursive" },
];

export function FirmarCliente({ token, nombreCliente }: { token: string; nombreCliente: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<"dibujo" | "texto">("dibujo");
  const [nombre, setNombre] = useState(nombreCliente);
  const [fuente, setFuente] = useState(FUENTES[0]);
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDraw = useRef(false);

  useEffect(() => { if (abierto && modo === "dibujo") setTimeout(initCanvas, 30); }, [abierto, modo]);

  function initCanvas() {
    const c = canvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect(); c.width = r.width; c.height = 170;
    const ctx = c.getContext("2d")!; ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.strokeStyle = "#1a1a33";
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; };
    c.onpointerdown = (e) => { drawing.current = true; hasDraw.current = true; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); c.setPointerCapture(e.pointerId); };
    c.onpointermove = (e) => { if (!drawing.current) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
    c.onpointerup = () => { drawing.current = false; };
  }
  function limpiar() { const c = canvasRef.current; if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height); hasDraw.current = false; }

  const firmar = () => {
    setError("");
    if (!acepta) { setError("Debes aceptar para firmar."); return; }
    let firma: { tipo: "dibujo" | "texto"; data: string; fuente?: string };
    if (modo === "dibujo") {
      if (!hasDraw.current) { setError("Dibuja tu firma primero."); return; }
      firma = { tipo: "dibujo", data: canvasRef.current!.toDataURL("image/png") };
    } else {
      if (!nombre.trim()) { setError("Escribe tu nombre."); return; }
      firma = { tipo: "texto", data: nombre.trim(), fuente: fuente.css };
    }
    start(async () => {
      const res = await firmarContrato(token, firma);
      if (res.ok) { setAbierto(false); router.refresh(); }
      else setError(res.error || "No se pudo firmar. Intenta de nuevo.");
    });
  };

  return (
    <>
      <div className="fc-bar">
        <div className="fc-steps">
          <span className="fc-st"><b>1</b> Lee el contrato</span>
          <span className="fc-st"><b>2</b> Baja hasta el final</span>
          <span className="fc-st"><b>3</b> Firma donde está resaltado</span>
        </div>
        <button className="fc-btn" onClick={() => {
          const el = document.querySelector(".c-sign"); el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.classList.add("c-sign-guide"); setTimeout(() => el?.classList.remove("c-sign-guide"), 4000);
        }}>Llévame a firmar ↓</button>
        <button className="fc-btn primary" onClick={() => setAbierto(true)}>✍︎ Firmar</button>
      </div>

      {abierto && (
        <div className="fc-scrim" onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <div className="fc-modal">
            <div className="fc-modal-h"><h3>Tu firma</h3><button className="fc-x" onClick={() => setAbierto(false)}>✕</button></div>
            <div className="fc-modal-b">
              <div className="fc-tabs">
                <button className={modo === "dibujo" ? "on" : ""} onClick={() => setModo("dibujo")}>✍︎ Dibujar</button>
                <button className={modo === "texto" ? "on" : ""} onClick={() => setModo("texto")}>⌨ Escribir</button>
              </div>
              {modo === "dibujo" ? (
                <div>
                  <canvas ref={canvasRef} className="fc-canvas" />
                  <button className="fc-btn" onClick={limpiar} style={{ marginTop: 8 }}>Borrar</button>
                </div>
              ) : (
                <div>
                  <input className="fc-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Escribe tu nombre" />
                  <div className="fc-fonts">
                    {FUENTES.map((f) => (
                      <button key={f.key} className={`fc-font${fuente.key === f.key ? " on" : ""}`} style={{ fontFamily: f.css }} onClick={() => setFuente(f)}>{nombre || "Tu nombre"}</button>
                    ))}
                  </div>
                  <div className="fc-preview" style={{ fontFamily: fuente.css }}>{nombre || "Tu nombre"}</div>
                </div>
              )}
              <label className="fc-chk"><input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} /> Acepto los términos y declaro que esta es mi firma.</label>
              {error && <p className="fc-err">{error}</p>}
            </div>
            <div className="fc-modal-f">
              <button className="fc-btn" onClick={() => setAbierto(false)}>Cancelar</button>
              <button className="fc-btn primary" disabled={pending} onClick={firmar}>{pending ? "Firmando…" : "Firmar y enviar →"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
