import "server-only";
import { consulta } from "@/lib/db";
import { hoyISO } from "@/lib/fecha";

/**
 * Notificaciones de la plataforma madre (campanita). Hoy: clientes de PAGO ÚNICO
 * cuya ventana de servicio está por vencer (≤ 30 días) o ya venció, para recordar
 * la renovación. Extensible a otras alertas en el futuro.
 */
export interface Notificacion {
  id: string;
  tipo: "renovacion";
  clienteId: number;
  titulo: string;
  detalle: string;
  dias: number; // días para vencer (negativo = ya venció)
  nivel: "alerta" | "urgente";
  href: string;
}

export async function notificacionesPendientes(): Promise<Notificacion[]> {
  const hoy = hoyISO();
  const rows = await consulta(
    `select id, nombre, to_char(vence_el,'YYYY-MM-DD') vence, (vence_el - $1::date) dias
       from public.clientes
      where pago_unico and estado_actual = 'activo' and vence_el is not null
        and vence_el <= ($1::date + interval '30 days')
      order by vence_el asc`,
    [hoy],
  );
  return rows.map((r: Record<string, unknown>) => {
    const dias = Number(r.dias);
    const detalle = dias < 0
      ? `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`
      : dias === 0 ? "Vence hoy" : `Vence en ${dias} ${dias === 1 ? "día" : "días"} (${String(r.vence)})`;
    return {
      id: `renov-${r.id}`,
      tipo: "renovacion" as const,
      clienteId: Number(r.id),
      titulo: `${String(r.nombre)} · renovación de pago único`,
      detalle,
      dias,
      nivel: dias <= 7 ? "urgente" : "alerta",
      href: `/membresias/${Number(r.id)}`,
    };
  });
}
