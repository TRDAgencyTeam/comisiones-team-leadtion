/**
 * Proyección de próximos pagos de comisión, separada en 3 cuadros (mes a mes).
 * Compartido por el portal del colaborador y la vista del admin (solo lectura).
 */

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const mesLargo = (iso: string) => { const [y, m] = iso.split("-").map(Number); return `${MESES[(m ?? 1) - 1]} ${y}`; };

const HITO_INFO: Record<string, { trim: string; meses: number }> = {
  T1: { trim: "Trimestre 1", meses: 3 },
  T2: { trim: "Trimestre 2", meses: 6 },
  T3: { trim: "Trimestre 3", meses: 12 },
};

/** Etiqueta de hito con tooltip explicativo (T1 → "Trimestre 1 · a los 3 meses"). */
export function HitoTag({ h }: { h: string }) {
  const info = HITO_INFO[h];
  return (
    <span className="hito-tag" title={info ? `${info.trim} · se cumple a los ${info.meses} meses de la activación` : h}>
      {h}
    </span>
  );
}

export interface FilaFutura {
  clienteNombre: string;
  hito: string;
  fechaHito: string;
  monto: number;
}

export function ProximosPagos({ futuros, now = new Date() }: { futuros: FilaFutura[]; now?: Date }) {
  const ordenados = [...futuros].sort((a, b) => a.fechaHito.localeCompare(b.fechaHito));
  const proximaFecha = ordenados[0]?.fechaHito ?? null;

  const mesesProy = [1, 2, 3].map((k) => {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hitos = ordenados.filter((f) => f.fechaHito.slice(0, 7) === key);
    return {
      key,
      label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
      hitos,
      total: round2(hitos.reduce((s, f) => s + f.monto, 0)),
    };
  });
  const proyeccion = round2(mesesProy.reduce((s, m) => s + m.total, 0));
  const proyHitos = mesesProy.reduce((s, m) => s + m.hitos.length, 0);

  return (
    <>
      <p style={{ margin: "0 0 14px" }}>
        El próximo período con comisión es <b>{proximaFecha ? mesLargo(proximaFecha) : "—"}</b>.
        En los próximos 3 meses se proyectan <b>{usd(proyeccion)}</b> ({proyHitos} hito{proyHitos === 1 ? "" : "s"}),
        <b> siempre que esas cuentas sigan activas</b>. Cada cuenta reaparece cada 3 meses (T1→T2→T3).
      </p>
      <div className="proj-meses">
        {mesesProy.map((m) => (
          <div key={m.key} className="proj-mes">
            <div className="proj-mes-head">
              <span className="proj-mes-nombre">{m.label}</span>
              <span className="proj-mes-total">{usd(m.total)}</span>
            </div>
            {m.hitos.length === 0 ? (
              <p className="empty" style={{ margin: "6px 0 0" }}>Sin hitos este mes.</p>
            ) : (
              <ul className="proj-lista">
                {m.hitos.map((f, i) => (
                  <li key={`${m.key}-${f.clienteNombre}-${f.hito}-${i}`}>
                    <span className="proj-cli">{f.clienteNombre}</span>
                    <HitoTag h={f.hito} />
                    <span className="proj-monto">{usd(f.monto)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }
