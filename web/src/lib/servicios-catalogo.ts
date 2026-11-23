import "server-only";
import { consulta } from "@/lib/db";

/**
 * Gestión del CATÁLOGO DE SERVICIOS/PRODUCTOS (servicio_catalogo). Es la lista que
 * aparece en "Nueva factura". Desde el apartado de Servicios el admin puede crear,
 * editar, activar/desactivar servicios y ver su uso (cuántas veces se facturó, a
 * cuántos clientes, cuánto ingreso aprox y cuándo se usó por última vez).
 */

export interface ServicioAdmin {
  id: number;
  clave: string;
  nombre: string;
  categoria: string;
  /** Marca/negocio: 'agencia' (TRD Agency), 'leadtion', 'ambas' (Agency + Leadtion). */
  marca: string;
  recurrente: boolean;
  precioVariable: boolean;
  precioMes1: number | null;
  precioResto: number | null;
  minMeses: number;
  aplicaCs: boolean;
  aplicaReferido: boolean;
  aplicaReserva: boolean;
  porPersona: boolean;
  precioPersona: number | null;
  costoPersona: number | null;
  unidad: string | null;
  incluyeLeadtion: boolean;
  comisionaComercial: boolean;
  activo: boolean;
  orden: number;
  notas: string | null;
  // Uso (de factura_mensual, excluyendo anuladas):
  veces: number;          // nº de facturas con este servicio
  clientes: number;       // clientes distintos
  ingresoUsd: number;     // ingreso aprox en USD (COL ÷ tasa de la factura)
  ultimoUso: string | null; // última fecha de uso (YYYY-MM)
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numN = (v: unknown): number | null => (v == null ? null : Number(v));

function mapRow(r: Record<string, unknown>): ServicioAdmin {
  return {
    id: Number(r.id),
    clave: String(r.clave),
    nombre: String(r.nombre),
    categoria: String(r.categoria),
    marca: String(r.marca ?? "agencia"),
    recurrente: Boolean(r.recurrente),
    precioVariable: Boolean(r.precio_variable),
    precioMes1: numN(r.precio_mes1),
    precioResto: numN(r.precio_resto),
    minMeses: Number(r.min_meses ?? 1),
    aplicaCs: Boolean(r.aplica_cs),
    aplicaReferido: Boolean(r.aplica_referido),
    aplicaReserva: Boolean(r.aplica_reserva),
    porPersona: Boolean(r.por_persona),
    precioPersona: numN(r.precio_persona),
    costoPersona: numN(r.costo_persona),
    unidad: (r.unidad as string) ?? null,
    incluyeLeadtion: Boolean(r.incluye_leadtion),
    comisionaComercial: r.comisiona_comercial == null ? true : Boolean(r.comisiona_comercial),
    activo: Boolean(r.activo),
    orden: Number(r.orden ?? 100),
    notas: (r.notas as string) ?? null,
    veces: num(r.veces),
    clientes: num(r.clientes),
    ingresoUsd: Math.round(num(r.ingreso_usd) * 100) / 100,
    ultimoUso: r.ultimo_uso ? String(r.ultimo_uso) : null,
  };
}

/** Ingreso NETO aprox en USD de una fila de factura `f`: COL = antes de IVA ÷ tasa;
 *  LLC = facturado − pasarela (Stripe 2,9% + $0,30). */
const NETO_USD_SQL = `case
  when f.entidad = 'COL' then f.facturado / nullif(f.tasa, 0)
  when f.medio = 'stripe' then f.facturado - (f.facturado * 0.029 + 0.30)
  else f.facturado end`;

/** Subconsulta de uso por servicio_clave (facturas no anuladas). */
const USO_SQL = `
  left join lateral (
    select count(*)::int veces,
           count(distinct coalesce(f.cliente_id::text, lower(trim(f.cliente_nombre)))) clientes,
           coalesce(sum(${NETO_USD_SQL}), 0) ingreso_usd,
           to_char(max(f.mes), 'YYYY-MM') ultimo_uso
      from public.factura_mensual f
     where f.servicio_clave = sc.clave and coalesce(f.estado,'') <> 'anulado'
  ) uso on true`;

/** Todos los servicios con su uso. Orden: activos primero, luego por `orden`. */
export async function listarServiciosAdmin(): Promise<ServicioAdmin[]> {
  const rows = await consulta(
    `select sc.*, uso.veces, uso.clientes, uso.ingreso_usd, uso.ultimo_uso
       from public.servicio_catalogo sc
       ${USO_SQL}
      order by sc.activo desc, sc.orden, sc.nombre`,
  );
  return rows.map(mapRow);
}

/** Un servicio por clave (con su uso). */
export async function obtenerServicioAdmin(clave: string): Promise<ServicioAdmin | null> {
  const rows = await consulta(
    `select sc.*, uso.veces, uso.clientes, uso.ingreso_usd, uso.ultimo_uso
       from public.servicio_catalogo sc
       ${USO_SQL}
      where sc.clave = $1`,
    [clave],
  );
  return rows.length ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/** Historial de uso de un servicio: cada factura (cliente, mes, valor, estado). */
export interface UsoFila { clienteNombre: string; mes: string; facturado: number; entidad: string; estado: string }
export async function historialUsoServicio(clave: string): Promise<UsoFila[]> {
  const rows = await consulta(
    `select cliente_nombre, to_char(mes,'YYYY-MM') mes, coalesce(facturado,0)::float facturado, entidad, estado
       from public.factura_mensual
      where servicio_clave = $1
      order by mes desc, cliente_nombre`,
    [clave],
  );
  return rows.map((r: Record<string, unknown>) => ({
    clienteNombre: String(r.cliente_nombre ?? "—"),
    mes: String(r.mes),
    facturado: Number(r.facturado),
    entidad: String(r.entidad ?? "LLC"),
    estado: String(r.estado ?? ""),
  }));
}

/** Serie mensual de uso de un servicio (últimos `n` meses) para el gráfico. */
export interface UsoMes { mes: string; facturas: number; ingresoUsd: number }
export async function historialMensualServicio(clave: string, n = 12): Promise<UsoMes[]> {
  const rows = await consulta(
    `select to_char(f.mes,'YYYY-MM') mes, count(*)::int facturas,
            coalesce(sum(${NETO_USD_SQL}),0)::float ingreso
       from public.factura_mensual f
      where f.servicio_clave = $1 and coalesce(f.estado,'') <> 'anulado'
        and f.mes >= (date_trunc('month', current_date) - ($2 || ' months')::interval)
      group by 1 order by 1`,
    [clave, n],
  );
  return rows.map((r: Record<string, unknown>) => ({
    mes: String(r.mes),
    facturas: Number(r.facturas),
    ingresoUsd: Math.round(Number(r.ingreso) * 100) / 100,
  }));
}

/** Genera una clave única (slug) a partir del nombre. */
export async function generarClaveUnica(nombre: string): Promise<string> {
  const base = nombre
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "servicio";
  const existentes = await consulta(
    `select clave from public.servicio_catalogo where clave = $1 or clave like $2`,
    [base, `${base}_%`],
  );
  const usadas = new Set(existentes.map((r: Record<string, unknown>) => String(r.clave)));
  if (!usadas.has(base)) return base;
  let i = 2;
  while (usadas.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}
