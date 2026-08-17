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
  **Sync HECHO**: al crear se guardan personas asignadas (`cliente_colaboradores`,
  migración 0007) y, si vino recomendado, se registra en Afiliados (`clientes_afiliados`
  ref `cl-mem-<id>`). Ficha muestra asignados + afiliado.
  **Dashboard P&L HECHO** (`/membresias/dashboard`): ingresos (pagos del mes + API
  vendida + reselling) vs costos (nómina COP→USD con tasa en vivo `lib/fx.ts`, GHL
  $497, APIs incluidas $10 c/u, comisiones afiliados del mes) + ganancia neta.
  Config en tabla `config_negocio` (migración 0008) y `reselling_mensual` (editable
  en el dashboard). `lib/pnl.ts`.
  **Editar cliente HECHO** (`/membresias/[id]/editar`): nombre, estado (activo/
  pausado/cancelado), **tipo de cliente**, plan, soporte, **API** (incluida $10 /
  vendida $12 / vendida $10 / ninguna), bono, licencia. API por cliente editable =
  fuente de verdad; el P&L deriva de ahí (ingreso vendida = suma api_valor; costo
  incluida = $10×count).
  **Tipo de cliente HECHO** (migración 0009): estandar / agencia (viene con plan de
  marketing; licencia incluida ahí) / servicio (compró Agente IA, Reactivación o
  Level Up — servicio especial, NO es agencia). Deriva `incluye_crm_en_marketing`
  = (tipo==='agencia'). Inicial: 12 estándar / 9 agencia / 20 servicio (activos).
  Reemplaza el viejo checkbox "es agencia" en alta/edición; se muestra en lista
  (mini-stats + columna Tipo) y ficha. `TIPO_LABEL` en `lib/membresias.ts`.
  **API por cliente confirmada** (ago 2026): 13 activos vendida $12 (ganancia $2 c/u
  = $26), 26 incluida $10 (costo $260), Miguel Solera sin API, Aura Pérez + Silvia
  Andión canceladas. El usuario confirma mensualmente quién sigue en $12.
  **P&L corregido**: API vendida = GANANCIA (precio − $10), no ingreso bruto. Dashboard
  muestra # de cuentas por ítem y el mes en cada KPI (Ingresos/Costos/Ganancia de <mes>).
  **Servicios adquiridos HECHO** (migración 0010, tabla `cliente_servicios`): cuando un
  cliente ya activo compra un servicio especial después, se registra con "+ Registrar
  servicio" en la ficha (`/membresias/[id]/servicio`) → genera los cobros de su ventana
  sin tocar el pasado. Dinámicas en `lib/servicios.ts`: Agente IA (847/0 garantía/soporte),
  Reactivación (597/197/197), Level Up (497/·/soporte $87 — TENTATIVO, falta confirmar).
  Sobrescribe solo los meses de la ventana (on conflict cliente_id,mes). No cambia
  tipo_cliente; sí actualiza plan_tipo + soporte del cliente. Mes 4+ manual. Ficha
  muestra "Servicios adquiridos" + estados de mes con etiquetas legibles (incl. Garantía).
  Falta: (1) generar historial `pagos_mensuales` según el plan (AI 847/0/157…);
  (2) sumar al P&L las
  comisiones de CS del mes y los bonos; (4) UI para editar nómina/GHL (hoy en BD);
  (5) decisión: que personas asignadas filtren comisión CS (hoy paga por fecha a todos).

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
