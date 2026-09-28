import "server-only";
import { consulta } from "@/lib/db";
import { tasaUsdCop } from "@/lib/fx";
import { calcularPnL } from "@/lib/pnl";

/**
 * Cobertura por unidad de negocio: ¿los ingresos recurrentes de cada negocio
 * cubren sus propios costos fijos? La nómina se reparte por `dedicacion_leadtion`
 * y las herramientas por `negocio`. Todo en USD.
 */
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface Cobertura { ingreso: number; costo: number; pct: number; sobra: number }
export interface CoberturaResumen {
  agencia: Cobertura;
  leadtion: Cobertura;
  empresa: Cobertura;
  detalle: {
    nomAgencia: number; nomLeadtion: number; operativos: number;
    toolsAgencia: number; toolsLeadtion: number; operacionLeadtion: number;
  };
}

export async function coberturaPorNegocio(agenciaIngreso: number, leadtionIngreso: number): Promise<CoberturaResumen> {
  const { cop: tasa } = await tasaUsdCop();
  const [nom, gastos, pnl] = await Promise.all([
    consulta(`select coalesce(valor_nomina,0) vn, coalesce(dedicacion_leadtion,0) ded
                from public.colaboradores where activo and coalesce(valor_nomina,0) > 0`),
    consulta(`select categoria, negocio, moneda, valor, recurrencia, coalesce(porcentaje_reparto,100) pr, amortizar
                from public.gasto_fijo
               where activo and afecta_utilidad and categoria <> 'paso_dinero'
                 and (recurrencia='mensual' or (recurrencia='anual' and amortizar) or recurrencia='diario')`),
    calcularPnL(),
  ]);

  // Nómina repartida por dedicación.
  let nomLeadtion = 0, nomAgencia = 0;
  for (const r of nom as Record<string, unknown>[]) {
    const usd = Number(r.vn) / tasa;
    const dl = Math.min(100, Math.max(0, Number(r.ded))) / 100;
    nomLeadtion += usd * dl;
    nomAgencia += usd * (1 - dl);
  }

  // Herramientas por negocio + operativos (siempre agencia).
  let toolsLeadtion = 0, toolsAgencia = 0, operativos = 0;
  for (const g of gastos as Record<string, unknown>[]) {
    const div = g.recurrencia === "anual" ? 12 : g.recurrencia === "diario" ? (1 / 30) : 1;
    const mensual = (Number(g.valor) / div) * (Number(g.pr) / 100);
    const usd = g.moneda === "COP" ? mensual / tasa : mensual;
    const cat = String(g.categoria);
    if (cat === "herramienta" || cat === "hosting") {
      if (g.negocio === "leadtion") toolsLeadtion += usd; else toolsAgencia += usd;
    } else if (cat === "servicio_publico" || cat === "otro") {
      operativos += usd;
    }
  }

  // Operación Leadtion (comisiones CS + API incluida + afiliados + bonos). GHL ya
  // entra como herramienta (toolsLeadtion), no se suma pnl.ghl.
  const operacionLeadtion = r2(pnl.costos.comisionesCS + pnl.costos.apisIncluidas + pnl.costos.comisionesAfiliados + pnl.costos.bonos);

  const costoAgencia = r2(nomAgencia + operativos + toolsAgencia);
  const costoLeadtion = r2(nomLeadtion + toolsLeadtion + operacionLeadtion);
  const mk = (ingreso: number, costo: number): Cobertura => ({
    ingreso: r2(ingreso), costo, pct: costo > 0 ? Math.round((ingreso / costo) * 100) : 0, sobra: r2(ingreso - costo),
  });

  return {
    agencia: mk(agenciaIngreso, costoAgencia),
    leadtion: mk(leadtionIngreso, costoLeadtion),
    empresa: mk(agenciaIngreso + leadtionIngreso, r2(costoAgencia + costoLeadtion)),
    detalle: {
      nomAgencia: r2(nomAgencia), nomLeadtion: r2(nomLeadtion), operativos: r2(operativos),
      toolsAgencia: r2(toolsAgencia), toolsLeadtion: r2(toolsLeadtion), operacionLeadtion,
    },
  };
}
