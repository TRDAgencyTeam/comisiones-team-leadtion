import { obtenerContratoPorToken } from "@/lib/contratos";
import { renderContrato, type FirmaContrato } from "@/lib/contrato-plantilla";
import { FirmarCliente } from "@/components/FirmarCliente";

export const metadata = { title: "Firmar contrato · TRD Agency" };
export const dynamic = "force-dynamic";

export default async function FirmarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await obtenerContratoPorToken(token);

  if (!c) {
    return <Centro titulo="Enlace no válido" texto="Este enlace de firma no existe o fue reemplazado. Pídele a tu asesor de TRD Agency que te lo reenvíe." />;
  }
  const vencido = c.estado !== "firmado" && c.fechaVence && new Date(c.fechaVence) < new Date();
  if (vencido) {
    return <Centro titulo="El enlace venció" texto="La solicitud de firma caducó. Escríbele a tu asesor de TRD Agency para que te envíe uno nuevo." />;
  }

  const firma: FirmaContrato | null = c.estado === "firmado" && c.firmaData
    ? { tipo: (c.firmaTipo as "dibujo" | "texto") ?? "texto", data: c.firmaData, fuente: c.firmaFuente ?? undefined, fecha: c.fechaFirma ?? undefined }
    : null;
  const html = renderContrato(c.plantilla, c.variables, { firma });

  return (
    <main className="fc-page">
      <div className="fc-top">
        <img src="/brand/trd/trd-logo-white.png" alt="TRD Agency" className="fc-logo" />
        <img src="/brand/leadtion-logo-white.png" alt="Leadtion" className="fc-logo fc-logo-lt" />
      </div>

      {c.estado === "firmado" ? (
        <div className="fc-ok">✓ ¡Contrato firmado! Gracias, {c.clienteNombre.split(" ")[0]}. Recibirás una copia por correo.</div>
      ) : (
        <FirmarCliente token={token} nombreCliente={c.clienteNombre} />
      )}

      <div className="fc-paper ctr-paper" dangerouslySetInnerHTML={{ __html: html }} />

      <p className="fc-foot">Firma digital con sello de tiempo y UUID · TRD Investment LLC · Florida, EE. UU.</p>
    </main>
  );
}

function Centro({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="fc-page">
      <div className="fc-top"><img src="/brand/trd/trd-logo-white.png" alt="TRD Agency" className="fc-logo" /></div>
      <div className="fc-centro"><h1>{titulo}</h1><p>{texto}</p></div>
    </main>
  );
}
