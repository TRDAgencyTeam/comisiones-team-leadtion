# Estado del proyecto — Plataforma LEADTION (handoff)

> **Este archivo es la "foto" del proyecto.** Léelo para retomar el trabajo sin
> releer toda la conversación (ahorra tokens). Actualízalo al final de cada
> sesión. Última actualización: **2026-08-14**.

## Qué es
Plataforma web (Next.js + Supabase + Vercel) con selección de **módulos** tras el
login. En vivo: **https://leadtionteam.vercel.app**. Repo:
`TRDAgencyTeam/comisiones-team-leadtion`. Supabase ref `ugrrmolthrysefqaqmse`.

Login (Supabase Auth) → `/modulos`:
1. **Comisiones Equipo Interno** (`/modulos/equipo` → Customer Success `/cs` · Comercial próx.)
2. **Comisiones Afiliados** (`/afiliados`)
3. **Clientes / Membresías** (`/membresias` → dashboard)

Los módulos en `/modulos` se muestran en grid horizontal (auto-fit, envuelven hacia
abajo). Cada módulo tiene su propia URL: `/cs`, `/afiliados`, `/membresias`.

## Estado por módulo
- **Customer Success (`/cs`, `/cs/comisiones`, `/cs/clientes`, `/cs/colaboradores`)**: COMPLETO.
  (Movido de la raíz a `/cs` el 2026-08-18 para URL propia por módulo. La raíz `/`
  redirige a `/modulos`; el admin va a `/modulos`. El grupo `(app)` se renombró a `cs/`.)
- **Portal de colaboradores (2026-08-18)**: roles por email. `lib/sesion.ts`:
  `sesionActual()` (admin = ADMIN_EMAIL env, default cuentas.trd@gmail.com; colaborador =
  su email coincide con `colaboradores.email` activo; sin_acceso; anonimo). `soloAdmin()`
  guard. Login redirige admin→/modulos, colaborador→/cs. `/cs` es role-aware: colaborador
  ve `PortalColaborador` (su comisión del mes = total a fin de mes vía
  `resultadoDeColaborador`, # de cuentas y lista de nombres — nada más); admin ve el
  dashboard. `cs/layout` oculta el menú admin a colaboradores. GUARDAS soloAdmin en:
  cs/{clientes,comisiones,colaboradores}/layout, membresias/layout, afiliados/layout,
  modulos + modulos/equipo, y en las ACCIONES de cs/clientes, cs/colaboradores, pagos.
  Migración 0011: `colaboradores.email` (único, case-insensitive). Form de colaborador
  tiene campo email. **PENDIENTE del usuario**: crear los usuarios en Supabase Auth
  (Authentication→Users, email+contraseña para Andrés/Daniel/Alejandro) y poner ESE email
  en cada ficha de colaborador. No creo cuentas de auth desde la app (sin service key).
  Los 3 emails ya vinculados: andres@trdagency.me (#1), dani@trdagency.me (#2),
  alejandror@trdagency.me (#3).
- **Portal v2 + sync + favicon (2026-08-18)**: el portal muestra por cuenta la fecha de
  activación, hito (T1/T2/T3 con tooltip "Trimestre N"), la matemática (% × meses ×
  licencia), monto y estado (pendiente/pagado, se sincroniza al marcar pago). Nota de
  cuándo se paga (primeros ~5 días del mes siguiente, con el salario). Proyección de los
  próximos 3 meses en 3 cuadros separados (bola de nieve: cada cuenta reaparece cada 3
  meses T1→T2→T3). FIX de sincronización: admin usaba corte fijo `2026-08-05` y el portal
  "hoy" → no cuadraban. Ahora AMBOS usan `corteFinDeMes()` (`lib/comisiones.ts`); dashboard
  y comisiones del admin defaultean a ese corte. Componente compartido
  `components/ProximosPagos.tsx` (proyección + `HitoTag`) usado por el portal Y por la
  vista de comisiones del admin (ahí SOLO LECTURA). Favicon en `app/icon.png` (símbolo
  Leadtion blanco sobre índigo, compuesto con sharp).
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
  sin tocar el pasado. Dinámicas en `lib/servicios.ts`: Agente IA (847/0 garantía/soporte
  $119|$157), Reactivación (597/197/197), Level Up (solo mes 1 $497; el soporte lo elige
  el cliente después, se registra manual — no se autogenera mes 2/3).
  Sobrescribe solo los meses de la ventana (on conflict cliente_id,mes). No cambia
  tipo_cliente; sí actualiza plan_tipo + soporte del cliente. Mes 4+ manual. Ficha
  muestra "Servicios adquiridos" + estados de mes con etiquetas legibles (incl. Garantía).
  **Dashboard ingresos separados HECHO**: licencias vs servicios Leadtion desglosados
  (Agente IA / Reactivación / Level Up) — NO se suman en un solo renglón. 2ª fila de KPIs:
  Licencias del mes · Servicios Leadtion del mes (el usuario pidió quitar los KPIs de
  "Costos fijos" y "Faltan para cubrir fijos"). Licencias = base recurrente; servicios y
  API vendida = ganancia adicional. El ingreso por
  servicio del mes se atribuye por la ventana del `cliente_servicios` (solo servicios
  registrados desde ahora; los 20 viejos no tienen evento, así que cuentan como licencia).
  **Eliminar cliente HECHO**: icono 🗑️ con confirmación en la lista Y en la ficha
  (acción `eliminarMembresia`, irreversible; cascada borra pagos/hitos/CHS/servicios/
  asignados/historial; el vínculo Afiliados cl-mem-<id> se borra manual). Componente
  `membresias/BotonEliminar.tsx` (client).
  **Gráfico HECHO**: dashboard P&L muestra "Ingresos por mes" (barras apiladas licencia
  vs servicio, últimos 12 meses) reusando `components/BarChart` + `ingresosPorMes` de
  `lib/clientes.ts` (dato real de pagos_mensuales; membresía $69 = licencia, resto = servicio).
  BarChart ahora tiene tooltip (`<title>` por segmento, formatTitle exacto) + hover.
  **Ruteo del módulo cambiado**: la home es el DASHBOARD. `/membresias` redirige a
  `/membresias/dashboard`; la lista se movió a `/membresias/clientes`. Menú: Dashboard
  primero, Clientes después (`MembresiasNav`). El card de /modulos entra al dashboard.
  Ojo: redirects/revalidatePath de la lista ahora apuntan a `/membresias/clientes`.
- **REGLA DE NEGOCIO CLAVE**: agregar un servicio a un cliente existente NO altera comisiones
  de CS ni de afiliados. Ya se cumple por diseño: CS = base $67/$69 × hitos por fecha (no lee
  plan_tipo/valor de pagos); afiliados = datos propios (no lee plan_tipo/pagos); registrarServicio
  no toca clientes_afiliados ni fecha_activacion. El afiliado ya cobró sus 3 meses; de ahí en
  adelante el servicio es 100% ganancia nuestra.
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
