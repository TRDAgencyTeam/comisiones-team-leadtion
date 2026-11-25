import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { listarContratos, resumenContratos, valorContratado, type EstadoContrato } from "@/lib/contratos";
import { fmtMoneda } from "@/lib/contrato-plantilla";

export const metadata = { title: "Contratos" };
export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador", enviado: "Enviado", visto: "Visto", firmado: "Firmado", vencido: "Vencido", anulado: "Anulado",
};
const fFecha = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default async function ContratosPage() {
  await soloAdmin();
  const [contratos, resumen, valores] = await Promise.all([listarContratos(), resumenContratos(), valorContratado()]);
  const n = (e: EstadoContrato) => resumen[e] ?? 0;
  const valUsd = valores.find((x) => x.moneda === "USD")?.total ?? 0;

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Contratos</h1>
          <p className="sub">Crea, envía y firma contratos con tus clientes. La plantilla trae lo fijo; tú solo cambias lo que se negocia.</p>
        </div>
        <Link href="/trd/contratos/nuevo" className="btn-primary">+ Nuevo contrato</Link>
      </div>

      <div className="reg-totales">
        <div className="kpi"><span className="kpi-lbl">Borradores</span><span className="kpi-num">{n("borrador")}</span></div>
        <div className="kpi destacado"><span className="kpi-lbl">Por firmar</span><span className="kpi-num">{n("enviado") + n("visto")}</span></div>
        <div className="kpi"><span className="kpi-lbl">Firmados</span><span className="kpi-num" style={{ color: "var(--paid)" }}>{n("firmado")}</span></div>
        <div className="kpi"><span className="kpi-lbl">Valor contratado (USD)</span><span className="kpi-num">{fmtMoneda(valUsd, "USD")}</span></div>
      </div>

      <div className="reg-tabla-wrap" style={{ marginTop: 16 }}>
        <table className="reg-tabla">
          <thead><tr><th>Cliente</th><th>Plantilla</th><th>Valor</th><th>Vigencia</th><th>Estado</th><th>Creado</th></tr></thead>
          <tbody>
            {contratos.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/trd/contratos/${c.id}`} className="link-ver">{c.clienteNombre}</Link></td>
                <td className="muted">Plan Marketing</td>
                <td>{c.valorResumen ?? "—"}</td>
                <td className="muted">{c.vigenciaResumen ?? "—"}</td>
                <td><span className={`ctr-chip e-${c.estado}`}>{ESTADO_LABEL[c.estado] ?? c.estado}</span></td>
                <td className="muted">{fFecha(c.creadoEn)}</td>
              </tr>
            ))}
            {contratos.length === 0 && <tr><td colSpan={6} className="vacio">Aún no hay contratos. Crea el primero con “+ Nuevo contrato”.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
