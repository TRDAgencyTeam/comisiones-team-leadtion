import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { obtenerContrato, eventosContrato } from "@/lib/contratos";
import { renderContrato, type FirmaContrato } from "@/lib/contrato-plantilla";
import { cambiarEstadoContrato, eliminarContrato } from "../acciones";
import { BASE_URL } from "@/lib/email";
import { ImprimirBtn } from "@/components/ImprimirBtn";
import { IconoBorrar } from "@/components/Iconos";

export const metadata = { title: "Contrato" };
export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", enviado: "Enviado", visto: "Visto", firmado: "Firmado", vencido: "Vencido", anulado: "Anulado",
};
const ESTADOS = ["borrador", "enviado", "visto", "firmado", "vencido", "anulado"];
const fFull = (iso: string | null) => iso ? new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default async function ContratoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await soloAdmin();
  const { id } = await params;
  const c = await obtenerContrato(Number(id));
  if (!c) notFound();
  const eventos = await eventosContrato(c.id);

  const firma: FirmaContrato | null = c.estado === "firmado" && c.firmaData
    ? { tipo: (c.firmaTipo as "dibujo" | "texto") ?? "texto", data: c.firmaData, fuente: c.firmaFuente ?? undefined, fecha: c.fechaFirma ?? undefined }
    : null;
  const html = renderContrato(c.plantilla, c.variables, { firma });

  return (
    <main className="wrap wide">
      <div className="reg-head no-print">
        <div>
          <p style={{ margin: 0 }}><Link href="/trd/contratos" className="link-ver">← Contratos</Link></p>
          <h1>{c.clienteNombre}</h1>
          <p className="sub">Plan Marketing Ads + IA + CRM · <span className={`ctr-chip e-${c.estado}`}>{ESTADO_LABEL[c.estado]}</span></p>
        </div>
        <div style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {c.estado === "borrador" && <Link href={`/trd/contratos/${c.id}/editar`} className="btn-secondary">Editar</Link>}
          <ImprimirBtn />
        </div>
      </div>

      <div className="ctr-detalle">
        <div className="ctr-paper doc-print" dangerouslySetInnerHTML={{ __html: html }} />

        <aside className="ctr-aside no-print">
          <div className="ctr-card">
            <h3>Resumen de la solicitud</h3>
            <div className="ctr-dl"><span>ID (UUID)</span><b className="mono">{c.uuid}</b></div>
            <div className="ctr-dl"><span>Creador</span><b>TRD Agency</b></div>
            <div className="ctr-dl"><span>Creado</span><b>{fFull(c.creadoEn)}</b></div>
            <div className="ctr-dl"><span>Enviado</span><b>{fFull(c.fechaEnvio)}</b></div>
            <div className="ctr-dl"><span>Vence</span><b>{fFull(c.fechaVence)}</b></div>
            <div className="ctr-dl"><span>Firmado</span><b>{fFull(c.fechaFirma)}</b></div>
            <div className="ctr-dl"><span>Recordatorios</span><b>Cada {c.recordatorioDias} día(s)</b></div>
            <div className="ctr-dl"><span>Valor</span><b>{c.valorResumen ?? "—"}</b></div>
          </div>

          <div className="ctr-card">
            <h3>Firmante</h3>
            <div className="ctr-firmante">
              <b>{c.clienteNombre}</b>
              <small>{c.clienteEmail ?? "sin correo"} · Firmante</small>
              <span className={`ctr-chip e-${c.estado}`} style={{ marginTop: 6 }}>{ESTADO_LABEL[c.estado]}</span>
            </div>
          </div>

          {c.token && c.estado !== "firmado" && c.estado !== "borrador" && (
            <div className="ctr-card">
              <h3>Enlace de firma del cliente</h3>
              <a href={`${BASE_URL}/firmar/${c.token}`} target="_blank" rel="noreferrer" className="link-ver" style={{ wordBreak: "break-all", fontSize: "0.8rem" }}>{BASE_URL}/firmar/{c.token}</a>
              <p className="ctr-hint" style={{ marginTop: 6 }}>Se envió por correo. Si quieres, compártelo también manualmente.</p>
            </div>
          )}

          <div className="ctr-card">
            <h3>Estado (manual)</h3>
            <form action={cambiarEstadoContrato} className="ctr-estado-form">
              <input type="hidden" name="id" value={c.id} />
              <select name="estado" defaultValue={c.estado}>
                {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
              </select>
              <button type="submit" className="btn-secondary btn-guardar">Guardar</button>
            </form>
            <p className="ctr-hint" style={{ marginTop: 6 }}>Mientras construimos el portal de firma del cliente, puedes mover el estado a mano.</p>
          </div>

          <div className="ctr-card">
            <h3>Registro de eventos</h3>
            {eventos.length === 0 && <p className="ctr-hint">Sin eventos.</p>}
            {eventos.map((ev, i) => (
              <div className="ctr-ev" key={i}><span className="t">{fFull(ev.fecha)}</span><span>{ev.descripcion}</span></div>
            ))}
          </div>

          <form action={eliminarContrato}>
            <input type="hidden" name="id" value={c.id} />
            <button type="submit" className="btn-borrar icon-btn danger con-texto"><IconoBorrar /> Eliminar contrato</button>
          </form>
        </aside>
      </div>
    </main>
  );
}
