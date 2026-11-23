import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { listarServiciosAdmin, type ServicioAdmin } from "@/lib/servicios-catalogo";
import { cambiarEstadoServicio } from "./acciones";
import { mesHoyISO } from "@/lib/fecha";
import { IconoEditar } from "@/components/Iconos";

export const metadata = { title: "Servicios y productos" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
// Marcas (negocio) en el orden en que se muestran.
const MARCAS: { v: string; label: string }[] = [
  { v: "agencia", label: "TRD Agency" },
  { v: "ambas", label: "Agency + Leadtion" },
  { v: "leadtion", label: "Leadtion" },
];
const MARCA_LABEL: Record<string, string> = Object.fromEntries(MARCAS.map((m) => [m.v, m.label]));
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fMes = (m: string | null) => { if (!m) return "—"; const [y, mm] = m.split("-").map(Number); return `${MESES[(mm ?? 1) - 1]} ${y}`; };

function Modalidad({ s }: { s: ServicioAdmin }) {
  if (s.porPersona) return <span className="cf-tag util">por {s.unidad ?? "persona"}</span>;
  if (s.recurrente) return <span className="cf-tag" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>recurrente</span>;
  return <span className="cf-tag caja">un pago</span>;
}

export default async function ServiciosPage() {
  await soloAdmin();
  const servicios = await listarServiciosAdmin();
  const activos = servicios.filter((s) => s.activo);
  const usados = servicios.filter((s) => s.veces > 0);
  const masUsado = [...usados].sort((a, b) => b.veces - a.veces)[0];
  const mesActual = mesHoyISO();
  // Obsoletos: activos, sin uso nunca o sin uso en los últimos ~4 meses.
  const haceMeses = (m: string | null) => { if (!m) return 999; const [y, mm] = m.split("-").map(Number); const [cy, cmm] = mesActual.split("-").map(Number); return (cy! - y!) * 12 + (cmm! - mm!); };
  const obsoletos = activos.filter((s) => haceMeses(s.ultimoUso) >= 4);

  // Agrupado por MARCA (negocio), en el orden de MARCAS.
  const porMarca = new Map<string, ServicioAdmin[]>();
  for (const s of servicios) {
    const k = MARCA_LABEL[s.marca] ? s.marca : "agencia";
    const arr = porMarca.get(k) ?? [];
    arr.push(s);
    porMarca.set(k, arr);
  }
  const grupos = MARCAS.map((m) => [m.v, porMarca.get(m.v) ?? []] as const).filter(([, items]) => items.length > 0);

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Servicios y productos</h1>
          <p className="sub">{activos.length} activos de {servicios.length}. Esta es la lista que aparece al crear una factura.</p>
        </div>
        <Link href="/trd/servicios/nuevo" className="btn-primary">+ Nuevo servicio</Link>
      </div>

      <div className="reg-totales">
        <div className="kpi destacado"><span className="kpi-lbl">Servicios activos</span><span className="kpi-num">{activos.length}</span><span className="kpi-lbl">de {servicios.length} en catálogo</span></div>
        <div className="kpi"><span className="kpi-lbl">Más facturado</span><span className="kpi-num" style={{ fontSize: "1rem" }}>{masUsado ? masUsado.nombre : "—"}</span><span className="kpi-lbl">{masUsado ? `${masUsado.veces} veces` : ""}</span></div>
        <div className="kpi"><span className="kpi-lbl">Poco usados (obsoletos)</span><span className="kpi-num">{obsoletos.length}</span><span className="kpi-lbl">sin facturar hace 4+ meses</span></div>
      </div>

      {grupos.map(([marca, items]) => (
        <section key={marca} style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 8px" }}>{MARCA_LABEL[marca] ?? marca} <span className="count">{items.length}</span></h2>
          <div className="reg-tabla-wrap">
            <table className="reg-tabla">
              <thead>
                <tr>
                  <th>Servicio</th><th>Modalidad</th><th className="right">Precio</th>
                  <th className="right">Veces</th><th className="right">Clientes</th><th className="right">Ingreso aprox</th>
                  <th>Último uso</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.clave} className={s.activo ? "" : "fila-inactiva"}>
                    <td>
                      <span className="srv-nom">
                        <Link href={`/trd/servicios/${s.clave}`} className="link-ver">{s.nombre}</Link>
                        <Link href={`/trd/servicios/${s.clave}`} className="srv-edit" title="Modificar servicio" aria-label={`Modificar ${s.nombre}`}><IconoEditar size={14} /></Link>
                      </span>
                      {s.activo && s.veces === 0 && <span className="freelance-tag" style={{ marginLeft: 6 }}>sin uso</span>}
                    </td>
                    <td><Modalidad s={s} /></td>
                    <td className="right muted">{s.precioVariable ? "variable" : s.porPersona ? `${usd(s.precioPersona ?? 0)}/${s.unidad ?? "u"}` : s.precioMes1 != null ? usd(s.precioMes1) : "—"}</td>
                    <td className="right strong">{s.veces}</td>
                    <td className="right muted">{s.clientes}</td>
                    <td className="right muted">{s.ingresoUsd > 0 ? usd(s.ingresoUsd) : "—"}</td>
                    <td className="muted">{fMes(s.ultimoUso)}</td>
                    <td>{s.activo ? <span className="ct-tag ct-ok">Activo</span> : <span className="ct-tag ct-none">Inactivo</span>}</td>
                    <td>
                      <form action={cambiarEstadoServicio}>
                        <input type="hidden" name="clave" value={s.clave} />
                        <input type="hidden" name="activar" value={s.activo ? "0" : "1"} />
                        <button type="submit" className="btn-secondary btn-guardar">{s.activo ? "Desactivar" : "Activar"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="reg-nota" style={{ marginTop: 16 }}>
        Los servicios activos aparecen en <b>Nueva factura</b>. Un servicio con facturas no se puede borrar (se desactiva para no romper el historial). Cualquier servicio de <b>un solo pago</b> se puede dividir en cuotas al momento de vender.
      </p>
    </main>
  );
}
