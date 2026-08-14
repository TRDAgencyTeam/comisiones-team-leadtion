# Estado del proyecto — Plataforma LEADTION (handoff)

> **Este archivo es la "foto" del proyecto.** Léelo para retomar el trabajo sin
> releer toda la conversación (ahorra tokens). Actualízalo al final de cada
> sesión. Última actualización: **2026-08-14**.

## Qué es
Plataforma web (Next.js + Supabase + Vercel) con selección de **módulos** tras el
login. En vivo: **https://leadtionteam.vercel.app**. Repo:
`TRDAgencyTeam/comisiones-team-leadtion`. Supabase ref `ugrrmolthrysefqaqmse`.

Login (Supabase Auth) → `/modulos`:
1. **Comisiones Equipo Interno** (`/modulos/equipo` → Customer Success `/` · Comercial próx.)
2. **Comisiones Afiliados** (`/afiliados`)
3. **Clientes / Membresías** (`/membresias`)

## Estado por módulo
- **Customer Success (`/`, `/comisiones`, `/clientes`, `/colaboradores`)**: COMPLETO.
  Motor en `engine/` (29 pruebas). Comisiones con pagos, clientes con ficha/historial
  editable/LTV, colaboradores CRUD, dashboard con gráfico de ingresos.
- **Afiliados (`/afiliados`)**: COMPLETO v1. Dashboard, comisiones por mes (3 meses)
  con registrar pago, perfiles de afiliados (tarjetas, editar %/tipo, clientes por
  consumo), clientes en tarjetas. Datos migrados del navegador a Supabase.
- **Clientes / Membresías (`/membresias`)**: EN CONSTRUCCIÓN. Hecho: base + lista;
  **ficha** (`/membresias/[id]`: plan, soporte, API, LTV, historial, link a CS) y
  **creación** (`/membresias/nuevo` + acción `crearMembresia` con plan/soporte/API/
  bono/reserva/agencia). Al crearse en la tabla `clientes`, queda en CS automáticamente.
  Falta: (1) sync con **Afiliados** (¿recomendado?→afiliado) y **personas asignadas**
  (a quién se paga comisión CS); (2) generar historial `pagos_mensuales` según el plan;
  (3) editar cliente; (4) dashboard P&L (ingresos vs costos, tasa USD/COP diaria).

## Reglas/decisiones clave (no re-preguntar)
- Comisión CS: base $67/$69 por fecha; hitos T1/T2/T3; elegibilidad por fecha, sin
  tabla de asignación. Pausado NO comisiona.
- Precios: Agente AI $847 (mes2 $0 garantía, mes3 soporte); Reactivación $597+$197+$197;
  Level Up $497. Soportes $87(LevelUp)/$119/$157 (AI/React), incluyen licencia $69.
  Detalle en `REGLAS_NEGOCIO_PLANES.md` y `MODULO_CLIENTES_MEMBRESIAS.md`.
- Afiliados: agencia (% sobre servicios mes 1) / partner (% por nivel 30/40/50%).
- Membresías: maestro madre; sueldos COP→USD tasa diaria (~3140). Ver spec en
  `MODULO_CLIENTES_MEMBRESIAS.md`.

## Siguiente paso
Construir en `/membresias`: **ficha/creación de cliente** (planes + sync) o
**dashboard P&L**. (El usuario elige por cuál.)

## Backlog / pendientes por módulo (ideas ya discutidas — no perder)
**Clientes/Membresías (en curso):**
- Ficha + creación de cliente con toda la lógica: plan de entrada (AI/React/LevelUp),
  soporte, API (activa/vendida $12), bono reactivación ($50/$100), reserva ($100,
  14 días, inicia al pagar excedente: AI +$747 / React +$497), flag agencia (licencia
  free vía plan de ads; puede sumar servicios con descuento), personas asignadas
  (Andrés/Daniel/Alejandro) → **sincronizar** con Comisiones CS; ¿recomendado? →
  sincronizar con Afiliados (agencia/partner y de quién). Estados: pausar/cancelar.
- Dashboard P&L: cuentas activas, ingreso mes, costo mes (nómina COP→USD: Andrés
  $4.9M×60%, Daniel $4.5M×100%, Alejandro $3.3M×100%; GoHighLevel $497; APIs incluidas
  $10 c/u; bonos; comisiones CS+afiliados), ganancia neta, LTV, tiempo con cliente,
  total histórico. Reselling: reporte mensual manual. API vendida gana $2 c/u.
- Permitir override manual de la tasa USD/COP.

**Afiliados (v1 hecho, pendiente pulir):**
- Dashboard más integral (resumen, no lista completa; pagar este mes + 2 siguientes;
  total histórico de clientes).
- Adjuntar el ARCHIVO del comprobante de pago (requiere Supabase Storage; hoy solo
  guarda referencia/texto).
- Permitir varios servicios al crear un cliente (hoy uno).

**Customer Success (completo, futuro):**
- Portal del colaborador (login para CS que vean lo suyo), penalidad de churn, CHS
  real (encuesta + aprobación admin).

**Higiene / infra:**
- Rotar la contraseña de la BD de Supabase (se compartió por chat) y actualizarla en
  Vercel + `web/.env.local`.
- Opcional: logos en SVG (hoy PNG) y `web/public/brand/login-bg.jpg`.
- Cuando Membresías esté completo: apagar la app vieja de afiliados
  (afiliadosleadtion.vercel.app).

## Cómo trabajar (ahorro de tokens)
- Empezar cada día con **/clear** (sesión nueva) y luego **/retomar** (lee este archivo).
- Usar **/compact** al terminar una fase dentro de una misma sesión.
- Verificación local con auth: bypass temporal `DEV_BYPASS_AUTH=1` en `web/.env.local`
  + middleware — SIEMPRE quitar antes de commit.
- Migraciones/escrituras se prueban con scripts `pg` contra Supabase (DATABASE_URL
  en `web/.env.local`).
