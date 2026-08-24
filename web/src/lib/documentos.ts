import "server-only";
import { consulta } from "@/lib/db";

/** Documentos del colaborador (metadatos; el contenido se sirve por ruta aparte). */

export type TipoDoc = "hoja_vida" | "cedula" | "rut" | "contrato";

export interface DocumentoMeta {
  id: number;
  tipo: TipoDoc;
  nombreArchivo: string;
  mime: string;
  tamano: number;
  esVigente: boolean;
  creadoEn: string;
}

export const TIPO_DOC_LABEL: Record<TipoDoc, string> = {
  hoja_vida: "Hoja de vida",
  cedula: "Cédula",
  rut: "RUT",
  contrato: "Contrato",
};

export async function listarDocumentos(colaboradorId: number): Promise<DocumentoMeta[]> {
  const rows = await consulta(
    `select id, tipo, nombre_archivo, mime, tamano, es_vigente, creado_en
       from public.colaborador_documento
      where colaborador_id = $1
      order by tipo, es_vigente desc, creado_en desc`,
    [colaboradorId],
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    tipo: r.tipo as TipoDoc,
    nombreArchivo: String(r.nombre_archivo),
    mime: String(r.mime),
    tamano: Number(r.tamano),
    esVigente: Boolean(r.es_vigente),
    creadoEn: r.creado_en instanceof Date ? r.creado_en.toISOString() : String(r.creado_en),
  }));
}

/** Contenido de un documento para servirlo (stream). */
export async function obtenerContenido(
  docId: number,
): Promise<{ mime: string; nombre: string; contenido: Buffer } | null> {
  const rows = await consulta(
    `select mime, nombre_archivo, contenido from public.colaborador_documento where id = $1`,
    [docId],
  );
  if (!rows.length) return null;
  const r = rows[0]!;
  return { mime: String(r.mime), nombre: String(r.nombre_archivo), contenido: r.contenido as Buffer };
}
