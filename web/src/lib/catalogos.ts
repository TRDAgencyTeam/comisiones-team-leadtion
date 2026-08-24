/**
 * Catálogos compartidos (cliente + servidor): bancos de Colombia y áreas de
 * nómina, más las constantes de costos bancarios. Sin "server-only" para poder
 * usarlos en formularios (cliente) y en los cálculos (servidor).
 */

export interface Banco {
  value: string;
  label: string;
  /** true = transferencia sin costo (mismo banco Bancolombia o Nequi). */
  sinCosto?: boolean;
}

/** Bancos de Colombia, de más a menos usado. Bancolombia/Nequi = sin costo. */
export const BANCOS: Banco[] = [
  { value: "bancolombia", label: "Bancolombia", sinCosto: true },
  { value: "nequi", label: "Nequi", sinCosto: true },
  { value: "daviplata", label: "Daviplata" },
  { value: "davivienda", label: "Davivienda" },
  { value: "bbva", label: "BBVA Colombia" },
  { value: "bogota", label: "Banco de Bogotá" },
  { value: "nu", label: "Nu (Nubank)" },
  { value: "lulo", label: "Lulo Bank" },
  { value: "occidente", label: "Banco de Occidente" },
  { value: "popular", label: "Banco Popular" },
  { value: "cajasocial", label: "Banco Caja Social" },
  { value: "avvillas", label: "Banco AV Villas" },
  { value: "colpatria", label: "Scotiabank Colpatria" },
  { value: "falabella", label: "Banco Falabella" },
  { value: "pichincha", label: "Banco Pichincha" },
  { value: "agrario", label: "Banco Agrario" },
  { value: "bancoomeva", label: "Bancoomeva" },
  { value: "gnb", label: "Banco GNB Sudameris" },
  { value: "itau", label: "Itaú Colombia" },
  { value: "serfinanza", label: "Banco Serfinanza" },
  { value: "coopcentral", label: "Banco Coopcentral" },
  { value: "union", label: "Banco Unión" },
  { value: "rappipay", label: "RappiPay" },
  { value: "movii", label: "Movii" },
  { value: "otro", label: "Otro" },
];

const MAPA_BANCOS = new Map(BANCOS.map((b) => [b.value, b]));

export function bancoLabel(value: string | null): string {
  return value ? MAPA_BANCOS.get(value)?.label ?? value : "—";
}

export function bancoSinCosto(value: string | null): boolean {
  return !!value && !!MAPA_BANCOS.get(value)?.sinCosto;
}

/** Áreas de nómina (sigla — significado). */
export const AREAS: { value: string; label: string }[] = [
  { value: "LT", label: "LT — Leadtion" },
  { value: "AV", label: "AV — Audiovisual" },
  { value: "SM", label: "SM — Social Media" },
  { value: "MB", label: "MB — Media Buyer" },
  { value: "GC", label: "GC — Gerencia" },
  { value: "ADM", label: "ADM — Administración" },
];

// --- Constantes de costos bancarios ---
/** 4x1000 (GMF) = 0,4% del valor debitado. */
export const GMF = 0.004;
/** IVA general en Colombia. */
export const IVA = 0.19;
/** Costo de transferencia a OTROS bancos (Bancolombia/Nequi = 0). Editable. */
export const COSTO_TRANSFERENCIA_OTRO = 7590;
