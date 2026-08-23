import { subirDocumento, eliminarDocumento } from "@/app/trd/gastos-fijos/nomina/acciones";
import { TIPO_DOC_LABEL, type DocumentoMeta, type TipoDoc } from "@/lib/documentos";

const tamano = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function DocItem({ d, colaboradorId }: { d: DocumentoMeta; colaboradorId: number }) {
  return (
    <li className="doc-item">
      <span className="doc-icono">{d.mime.includes("pdf") ? "📄" : "🖼️"}</span>
      <span className="doc-nombre" title={d.nombreArchivo}>{d.nombreArchivo}</span>
      <span className="doc-meta">{tamano(d.tamano)}</span>
      <a className="doc-ver" href={`/trd/gastos-fijos/nomina/${colaboradorId}/doc/${d.id}`} target="_blank" rel="noreferrer">Ver</a>
      <form action={eliminarDocumento}>
        <input type="hidden" name="docId" value={d.id} />
        <input type="hidden" name="colaboradorId" value={colaboradorId} />
        <button type="submit" className="btn-borrar" title="Eliminar">🗑️</button>
      </form>
    </li>
  );
}

function Grupo({ titulo, docs, colaboradorId }: { titulo: string; docs: DocumentoMeta[]; colaboradorId: number }) {
  return (
    <div className="doc-grupo">
      <h4>{titulo}</h4>
      {docs.length === 0 ? (
        <p className="doc-vacio">—</p>
      ) : (
        <ul className="doc-lista">{docs.map((d) => <DocItem key={d.id} d={d} colaboradorId={colaboradorId} />)}</ul>
      )}
    </div>
  );
}

export function DocumentosPersona({ colaboradorId, docs }: { colaboradorId: number; docs: DocumentoMeta[] }) {
  const por = (t: TipoDoc) => docs.filter((d) => d.tipo === t);
  const contratos = por("contrato");
  const vigente = contratos.filter((d) => d.esVigente);
  const anteriores = contratos.filter((d) => !d.esVigente);

  return (
    <section className="doc-seccion">
      <h2>Documentos</h2>

      <form action={subirDocumento} className="doc-subir">
        <input type="hidden" name="colaboradorId" value={colaboradorId} />
        <select name="tipo" defaultValue="hoja_vida" className="doc-tipo">
          {(Object.keys(TIPO_DOC_LABEL) as TipoDoc[]).map((t) => (
            <option key={t} value={t}>{TIPO_DOC_LABEL[t]}</option>
          ))}
        </select>
        <input type="file" name="archivo" accept=".pdf,image/png,image/jpeg,image/webp" className="doc-file" required />
        <label className="doc-vigente-lbl">
          <input type="checkbox" name="vigente" value="1" /> Contrato vigente
        </label>
        <button type="submit" className="btn-primary">Subir</button>
      </form>
      <p className="doc-hint">PDF, PNG o JPG (máx. 15 MB). El check “Contrato vigente” solo aplica a contratos.</p>

      <div className="doc-grupos">
        <Grupo titulo="Hoja de vida" docs={por("hoja_vida")} colaboradorId={colaboradorId} />
        <Grupo titulo="Cédula" docs={por("cedula")} colaboradorId={colaboradorId} />
        <Grupo titulo="RUT" docs={por("rut")} colaboradorId={colaboradorId} />
        <Grupo titulo="Contrato vigente" docs={vigente} colaboradorId={colaboradorId} />
        <Grupo titulo="Contratos anteriores" docs={anteriores} colaboradorId={colaboradorId} />
      </div>
    </section>
  );
}
