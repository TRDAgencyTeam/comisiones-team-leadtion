import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** El alta de cliente ahora es un popup en la pestaña Facturación. */
export default async function NuevoClienteRedirect({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? `?mes=${sp.mes}` : "";
  redirect(`/trd/clientes/facturacion${mes}`);
}
