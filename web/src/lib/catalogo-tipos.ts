/** Tipo del catálogo de servicios (cliente+servidor, sin server-only). */
export interface ServicioCatalogo {
  clave: string;
  nombre: string;
  categoria: "agencia" | "leadtion" | "puntual";
  recurrente: boolean;
  precioVariable: boolean;
  precioMes1: number | null;
  precioResto: number | null;
  minMeses: number;
  aplicaCs: boolean;
  aplicaReferido: boolean;
  aplicaReserva: boolean;
}

export const CATEGORIA_LABEL: Record<string, string> = {
  agencia: "Agencia",
  leadtion: "Leadtion",
  puntual: "Puntual (una vez)",
};
