import Link from "next/link";
import { cargarResumen, type AfiliadoResumen } from "@/lib/afiliados";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function AfiliadosListaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orden?: string }>;
}) {
  const { q, orden = "consumo" } = await searchParams;
  let afiliados: AfiliadoResumen[] = [];
  let error: string | null = null;
  try {
    ({ afiliados } = await cargarResumen());
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const filtro = (q ?? "").trim().toLowerCase();
  let lista = afiliados.filter((a) => !filtro || a.nombre.toLowerCase().includes(filtro));
  if (orden === "nombre") lista = lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  else if (orden === "activos") lista = lista.sort((a, b) => b.activos - a.activos);
  else lista = lista.sort((a, b) => b.totalPagado - a.totalPagado); // consumo

  return (
    <main className="wrap">
      <header className="page">
        <h1>Afiliados</h1>
        <p>Perfiles de agencias y partners que recomiendan el CRM.</p>
      </header>

      {error && <div className="card"><strong>No se pudo cargar.</strong><p className="empty">{error}</p></div>}

      <form className="toolbar" method="get">
        <label>Buscar<input type="search" name="q" defaultValue={q ?? ""} placeholder="Nombre del afiliado…" /></label>
        <label>
          Orden
          <select name="orden" defaultValue={orden}>
            <option value="consumo">Mayor comisión pagada</option>
            <option value="activos">Más clientes activos</option>
            <option value="nombre">Nombre (A-Z)</option>
          </select>
        </label>
        <button type="submit">Aplicar</button>
      </form>

      <div className="perfil-grid">
        {lista.map((a) => (
          <Link key={a.ref} href={`/afiliados/afiliados/${a.ref}`} className="perfil-card">
            <div className="perfil-top">
              <span className="perfil-avatar">{a.nombre.charAt(0)}</span>
              <div>
                <div className="perfil-nombre">{a.nombre}</div>
                <span className={a.tipo === "agencia" ? "tag-agencia" : "tag-partner"}>
                  {a.tipo === "agencia" ? "Agencia" : "Partner"}
                </span>
              </div>
            </div>
            <div className="perfil-stats">
              <div><span className="ps-num">{a.activos}</span><span className="ps-lbl">Activos</span></div>
              <div><span className="ps-num">{a.totalClientes}</span><span className="ps-lbl">Históricos</span></div>
              <div><span className="ps-num ms-ok">{usd(a.totalPagado)}</span><span className="ps-lbl">Pagado</span></div>
            </div>
            <div className="perfil-pie">
              {a.tipo === "agencia" && a.comisionAgencia && a.comisionAgencia > 0
                ? `${a.comisionAgencia}% servicios · ${a.pct * 100}% licencia (Nivel ${a.nivel})`
                : `${a.pct * 100}% licencia · Nivel ${a.nivel}`}
            </div>
          </Link>
        ))}
        {lista.length === 0 && <p className="empty">Sin afiliados que coincidan.</p>}
      </div>
    </main>
  );
}
