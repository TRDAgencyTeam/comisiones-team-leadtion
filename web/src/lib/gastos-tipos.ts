/** Tipos y etiquetas de gastos fijos — compartidos cliente/servidor (sin server-only). */

export type CategoriaGasto = "servicio_publico" | "otro" | "herramienta" | "hosting" | "paso_dinero";
export type Recurrencia = "mensual" | "anual" | "diario";

export const CATEGORIA_LABEL: Record<CategoriaGasto, string> = {
  servicio_publico: "Servicios públicos",
  otro: "Otros fijos",
  herramienta: "Herramientas / Suscripciones",
  hosting: "Hosting",
  paso_dinero: "Paso de dinero (no utilidad)",
};

export const RECURRENCIA_LABEL: Record<Recurrencia, string> = {
  mensual: "Mensual",
  anual: "Anual",
  diario: "Diario",
};

export interface GastoFijo {
  id: number;
  categoria: CategoriaGasto;
  nombre: string;
  moneda: "COP" | "USD";
  valor: number;
  recurrencia: Recurrencia;
  diaCobro: number | null;
  metodoPago: string | null;
  porcentajeReparto: number;
  amortizar: boolean;
  afectaUtilidad: boolean;
  activo: boolean;
  /** Negocio al que pertenece: 'agencia' | 'leadtion' (para la cobertura por negocio). */
  negocio: "agencia" | "leadtion";
  /** Cobro POR PERSONA/puesto: el valor es por persona y se multiplica por el nº de
   *  personas activas en nómina fija (ej. Gather, ClickUp). false = monto fijo. */
  porPersona: boolean;
  notas: string | null;
}
