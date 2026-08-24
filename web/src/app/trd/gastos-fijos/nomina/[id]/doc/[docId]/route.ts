import { sesionActual } from "@/lib/sesion";
import { obtenerContenido } from "@/lib/documentos";

/** Sirve el contenido de un documento (inline, para previsualizar). Solo admin. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const s = await sesionActual();
  if (s.rol !== "admin") return new Response("No autorizado", { status: 403 });

  const { docId } = await params;
  const doc = await obtenerContenido(Number(docId));
  if (!doc) return new Response("No encontrado", { status: 404 });

  return new Response(new Uint8Array(doc.contenido), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.nombre)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
