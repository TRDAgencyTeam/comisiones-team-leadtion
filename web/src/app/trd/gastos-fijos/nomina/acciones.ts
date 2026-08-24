"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addMonths } from "comisiones-cs-engine/dates";
import { consulta } from "@/lib/db";
import { soloAdmin } from "@/lib/sesion";

// Valores en COP se digitan con puntos de miles; se quitan para guardar el número.
const numCO = (v: FormDataEntryValue | null): number => {
  const x = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const soloDigitos = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  return s === "" ? null : s;
};
const txt = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/** Lee y normaliza los campos del formulario de nómina; calcula la fecha fin. */
function parse(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const area = txt(formData.get("area"));
  const banco = txt(formData.get("banco"));
  const email = (txt(formData.get("email")) ?? "")?.toLowerCase() || null;
  const identificacion = soloDigitos(formData.get("identificacion"));
  const fechaNacimiento = txt(formData.get("fechaNacimiento"));
  const fechaInicio = txt(formData.get("fechaInicio"));
  const duracionRaw = txt(formData.get("duracionMeses"));
  const duracionMeses = duracionRaw ? Math.round(Number(duracionRaw)) : null;
  const valorNomina = numCO(formData.get("valorNomina"));

  // Fecha fin = inicio + duración (en meses). Se calcula sola.
  let fechaFin: string | null = null;
  if (fechaInicio && duracionMeses && duracionMeses > 0) {
    fechaFin = addMonths(fechaInicio, duracionMeses);
  }
  return { nombre, area, banco, email, identificacion, fechaNacimiento, fechaInicio, duracionMeses, fechaFin, valorNomina };
}

/** Crea una persona de nómina (categoría vacía → NO comisiona en CS). */
export async function crearPersona(formData: FormData) {
  await soloAdmin();
  const d = parse(formData);
  if (!d.nombre) {
    redirect("/trd/gastos-fijos/nomina/nuevo?error=" + encodeURIComponent("El nombre es obligatorio."));
  }
  await consulta(
    `insert into public.colaboradores
       (nombre, rol, categoria, activo, area, banco, email, identificacion,
        fecha_nacimiento, fecha_ingreso, fecha_inicio_contrato, duracion_contrato_meses,
        fecha_fin_contrato, valor_nomina)
     values ($1,'cs',null,true,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10)`,
    [d.nombre, d.area, d.banco, d.email, d.identificacion, d.fechaNacimiento, d.fechaInicio,
     d.duracionMeses, d.fechaFin, d.valorNomina],
  );
  revalidatePath("/trd/gastos-fijos/nomina");
  redirect("/trd/gastos-fijos/nomina");
}

/** Actualiza los datos de una persona de nómina. */
export async function actualizarPersona(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const d = parse(formData);
  if (!d.nombre) {
    redirect(`/trd/gastos-fijos/nomina/${id}?error=` + encodeURIComponent("El nombre es obligatorio."));
  }
  await consulta(
    `update public.colaboradores
        set nombre=$2, area=$3, banco=$4, email=$5, identificacion=$6, fecha_nacimiento=$7,
            fecha_inicio_contrato=$8, duracion_contrato_meses=$9, fecha_fin_contrato=$10,
            valor_nomina=$11
      where id=$1`,
    [id, d.nombre, d.area, d.banco, d.email, d.identificacion, d.fechaNacimiento,
     d.fechaInicio, d.duracionMeses, d.fechaFin, d.valorNomina],
  );
  revalidatePath("/trd/gastos-fijos/nomina");
  revalidatePath(`/trd/gastos-fijos/nomina/${id}`);
  redirect("/trd/gastos-fijos/nomina");
}

/** Activa/desactiva una persona (inactiva = no aparece en REG). */
export async function cambiarEstadoPersona(formData: FormData) {
  await soloAdmin();
  const id = Number(formData.get("id"));
  const activar = String(formData.get("activar")) === "1";
  await consulta(`update public.colaboradores set activo=$2 where id=$1`, [id, activar]);
  revalidatePath("/trd/gastos-fijos/nomina");
}

const MIMES_OK = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
const TIPOS_OK = ["hoja_vida", "cedula", "rut", "contrato"];

/** Sube un documento (hoja de vida, cédula/RUT, contrato) del colaborador. */
export async function subirDocumento(formData: FormData) {
  await soloAdmin();
  const colaboradorId = Number(formData.get("colaboradorId"));
  const tipo = String(formData.get("tipo"));
  const esVigente = String(formData.get("vigente")) === "1";
  const archivo = formData.get("archivo");
  const back = `/trd/gastos-fijos/nomina/${colaboradorId}`;

  if (!TIPOS_OK.includes(tipo)) redirect(`${back}?error=` + encodeURIComponent("Tipo de documento inválido."));
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(`${back}?error=` + encodeURIComponent("Selecciona un archivo."));
  }
  const file = archivo as File;
  if (!MIMES_OK.includes(file.type)) {
    redirect(`${back}?error=` + encodeURIComponent("Formato no permitido (usa PDF, PNG o JPG)."));
  }
  if (file.size > 15 * 1024 * 1024) {
    redirect(`${back}?error=` + encodeURIComponent("El archivo supera 15 MB."));
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Si es un contrato marcado vigente, los demás contratos pasan a "anteriores".
  if (tipo === "contrato" && esVigente) {
    await consulta(
      `update public.colaborador_documento set es_vigente=false where colaborador_id=$1 and tipo='contrato'`,
      [colaboradorId],
    );
  }

  await consulta(
    `insert into public.colaborador_documento
       (colaborador_id, tipo, nombre_archivo, mime, tamano, contenido, es_vigente)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [colaboradorId, tipo, file.name, file.type, file.size, buffer, tipo === "contrato" ? esVigente : false],
  );

  revalidatePath(back);
  redirect(back);
}

/** Elimina un documento del colaborador. */
export async function eliminarDocumento(formData: FormData) {
  await soloAdmin();
  const docId = Number(formData.get("docId"));
  const colaboradorId = Number(formData.get("colaboradorId"));
  await consulta(`delete from public.colaborador_documento where id=$1`, [docId]);
  revalidatePath(`/trd/gastos-fijos/nomina/${colaboradorId}`);
}
