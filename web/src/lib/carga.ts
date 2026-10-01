/**
 * Loader global (logo TRD palpitando) para acciones que NO son un <form> ni un
 * enlace (p. ej. un select que guarda al cambiar). Úsalo envolviendo la promesa:
 *   await conCarga(accion(fd));
 */
export const EVENTO_CARGA = "trd:carga";

export function marcarCarga(on: boolean) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO_CARGA, { detail: on }));
}

export async function conCarga<T>(p: Promise<T>): Promise<T> {
  marcarCarga(true);
  try { return await p; } finally { marcarCarga(false); }
}
