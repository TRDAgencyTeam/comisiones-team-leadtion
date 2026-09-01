# Estado del proyecto — Plataforma LEADTION (handoff)

> **Este archivo es la "foto" del proyecto.** Léelo para retomar el trabajo sin
> releer toda la conversación (ahorra tokens). Actualízalo al final de cada
> sesión. Última actualización: **2026-08-18**.

> **AUDITORÍA 2026-08-18 (el usuario empieza a usar la herramienta al 100%, deja el
> Excel).** Comprobado con el motor real contra Supabase: sincronización, corte único
> (fin de mes) y matemática de comisiones CUADRAN en P&L, panel CS y portales
> ($286.80 pendiente = Andrés $133.05 + Daniel $133.05 + Alejandro $20.70; 0 pagos
> registrados aún — se paga en el corte 1-5 sep). 66 clientes (43 activos), 0 sin fecha
> de activación, 0 datos de prueba. Config P&L: GHL $497, Andrés 60%, Daniel 30%,
> Alejandro 100% (nómina Leadtion ≈ $2.409/mes a tasa 3150).

## ⭐ TRABAJO ACTUAL — FASE 3: plataforma madre TRD Investment (ANÁLISIS COMPLETO)
Desde 2026-08-19 el foco cambió: Leadtion queda en pausa (funciona) y arrancamos la
**plataforma madre TRD Investment LLC** que consolidará TRD Agency + Leadtion. **REPASO DEL
EXCEL `INGRESOS - EGRESOS TRD AGENCY AGOSTO 2026.xlsx` COMPLETO (2026-08-21); NADA construido aún.**
Todo el análisis está en **`ANALISIS_TRD_INVESTMENT.md`** — LÉELO al retomar esta fase.
Pestañas repasadas: 2026, Gastos Fijos, Caja LLC, Caja Col, Precios (+3 contratos de cliente),
REG, Cloud TRD, Mantenimiento web. Reglas clave: egreso "afecta utilidad sí/no", diezmo 10%,
nómina fuente única, doble moneda, crédito Bancolombia, contrato cuatrimestral (alertas),
calculadora de retenciones ICA/renta (fórmulas confirmadas y verificadas), renovaciones
hosting/dominio + mantenimiento web, motor de recordatorios (dolor #1: se olvida cobrar),
y el PRINCIPIO RECTOR: una sola BD, cliente = nodo central, la madre crea en cascada a Leadtion.
**ARQUITECTURA v1 YA REDACTADA** en `ARQUITECTURA_TRD_INVESTMENT.md` (+ artefacto visual con el grafo:
https://claude.ai/code/artifact/ab7ab800-bd1c-4354-91fc-d951c5c35e3b). Decisión: se EXTIENDE la app actual
(misma Supabase). **EN CONSTRUCCIÓN: módulo REG (registro contable), primer módulo de la madre.** Ya escrito y
con typecheck en verde (falta aplicar migración + verificación visual). Archivos:
`supabase/migrations/0016_reg_registro_contable.sql` (reg_uvt, reg_tarifa_ica, reg_pago +
colaboradores.identificacion/actividad_ciiu/tarifa_ica_mil); `web/src/lib/retenciones.ts`
(cálculo puro, VERIFICADO contra el Excel en 4 casos); `web/src/lib/reg.ts`; sección nueva
`/trd/*` con shell/branding propio (`web/src/app/trd/layout.tsx`, `TrdLogo` en Brand.tsx,
carpeta `web/public/brand/trd/` con README para logos/fondo); página `/trd/reg` (page + acciones.ts
+ componentes `RegFila`/`RegFreelance`); tarjeta TRD en `/modulos`; estilos en globals.css.
Notificaciones = dentro de la app (push al celular vía PWA queda como capa posterior).
**MIGRACIÓN 0016 YA APLICADA en Supabase (2026-08-21)** y `/trd/reg` **VERIFICADO en local**: renderiza,
calcula ICA/renta/girar en vivo (usa la UVT del año del mes: ago-2026 → UVT $52.374), guarda (upsert OK) y
el checklist funciona. **Infra decidida = Opción A** (un dominio madre TRD; Leadtion por ruta; un solo login;
mismo Supabase). En código: identidad de plataforma = TRD Investment (login co-branded "Casa de Leadtion",
hub `/modulos` con logo/fondo TRD, tarjeta madre primero). Login role-aware ya existente: admin→/modulos,
colaborador→/cs. **Logos/fondo TRD subidos y conectados** (`web/public/brand/trd/`: trd-logo-black/white.png,
trd-symbol-*.png, trd-bg.png) — `TrdLogo`/`TrdSymbol` en Brand.tsx.
**Correo automático (2026-08-21)**: construido con **Resend** (elegido por el usuario) vía API REST, sin SDK.
`web/src/lib/email.ts` (`enviarEmail` + `plantillaCorreoPago`); acción `enviarCorreoPago` en `trd/reg/acciones.ts`
(carga pago+email del colaborador, envía y marca `ck_correo`); celda "Correo" en `RegFila` = botón ✉ que envía
(si no hay email en la ficha, avisa; si Resend no está configurado, muestra error claro). Falta que el usuario
configure env `RESEND_API_KEY` y `RESEND_FROM` (remitente de dominio verificado) en local y Vercel → luego probar envío real.
Pago de prueba de Andrés YA eliminado (reg_pago limpio). Correo REAL probado y recibido OK (Resend +
dominio trdagency.me verificado en Hostinger; env RESEND_API_KEY/RESEND_FROM en Vercel).
**Publicación**: se trabaja en la rama `trd-madre-reg` (enlace de PRUEBA en Vercel, no en producción aún).
**REG Fase 1 (2026-08-22)**: tarifa ICA única 8,66‰ para todos (se quitaron actividad/tarifa por fila);
valor base de nómina (migración 0017 `colaboradores.valor_nomina`) que pre-llena la cuenta de cobro y
"aprende" del último pago; columna "Mes anterior"; botón "Actualizar" para corregir; reenviar correo (↻).
**UVT confirmada**: se deja UVT oficial 2026 = $52.374 (el Excel del usuario usaba la 2025 = $49.799 y por eso la
renta no cuadraba; la plataforma está correcta legalmente). ICA 8,66‰ confirmada.
**REG Fase 2 — Nómina dentro de Gastos Fijos (2026-08-22)**: sección `/trd/gastos-fijos/nomina` (la nómina va
DENTRO de Gastos Fijos, como el Excel, NO aparte). Alta/edición de personas con nombre completo, área,
identificación, correo, fecha nacimiento, fecha inicio, duración en meses y **fecha fin AUTOMÁTICA**, valor
nómina; activar/desactivar; etiqueta de contrato (vigente/vence pronto/vencido). Migración 0018 (campos de
contrato en colaboradores). Las personas se crean con **categoría vacía → NO comisionan CS** (motor filtra por
fundador/nuevo, verificado). `lib/nomina.ts`, `PersonaForm.tsx`. Nav TRD: "Gastos Fijos · Nómina" + "Registro contable".
**Correo + formulario nómina (2026-08-22)**: correo mejorado (saludo personalizado, desglose, cierre "Equipo TRD",
logo TRD vía env `EMAIL_LOGO_URL`, contacto + responder-a `contable@turincondigital.com` vía env `REPLY_TO_EMAIL`).
Nómina: banco (desplegable, migración 0019), área desplegable con significado, cédula/valor con puntos de miles,
duración vacía = indefinido. Catálogos en `lib/catalogos.ts` (BANCOS, AREAS, GMF 0.4%, IVA 19%, COSTO_TRANSFERENCIA_OTRO=7590).
Facts verificados: 4x1000=0,4%, IVA=19%; costo transferencia otros bancos ≈ $7.590 (a confirmar por el usuario),
Bancolombia/Nequi=$0. **Comisión CS: DECIDIDO que entra al total con retención.**
**REG Lote C HECHO (2026-08-22)**: fila = Pago fijo + Adicional(+concepto) + Comisión CS → Total, con ICA/renta
sobre el total (migración 0020: pago_fijo, adicional, adicional_desc, comision). "Cuenta de cobro" → "Pago fijo".
**Comisión CS sincronizada desde Leadtion (USD→COP a tasa del día)** entra al total; VERIFICADO en local (Andrés
~$133 USD → $419.108 COP). **Marcar "Pagado" en REG registra el pago de la comisión** (comision_hitos vía
`lib/comisiones-pago.ts` pagarCiclo/deshacerCiclo) y desmarcar lo deshace; se QUITÓ el botón "Pagar" del módulo CS
(ahora solo lectura, nota "se paga desde REG"). Sección **Costos de empresa** (4x1000 0,4% + transferencia por banco
+ IVA 19%) contados SOLO cuando ck_pagado. Correo con adicional (concepto) + comisión. Histórico por mes YA resuelto
(reg_pago por mes; editar un mes no toca otros ni el contrato). Migración 0020 aplicada.
**REG UI (2026-08-22)**: campos de dinero minimalistas ($ + miles) y **concepto del adicional en POPUP** (chip →
modal). Costo transferencia confirmado $7.590 + IVA 19%.
**Lote D HECHO (2026-08-22)**: documentos por persona (hoja de vida, cédula, RUT, contratos vigente/anteriores) en la
ficha de Nómina. Se guardan en la BD como **bytea** (migración 0021 `colaborador_documento`; NO se usó Supabase
Storage para no depender de llaves), se suben por server action (bodySizeLimit 15mb; valida PDF/PNG/JPG ≤15MB) y se
previsualizan por una ruta que hace stream inline (solo admin). `lib/documentos.ts`, `components/DocumentosPersona.tsx`.
Migraciones 0020/0021 aplicadas.
**Correo fix (2026-08-22)**: corregido "Invalid Date" en el asunto (mes venía como Date de pg; se normaliza a YYYY-MM
para asunto y para el corte de comisión). Logo del correo: requiere que `EMAIL_LOGO_URL` apunte a una URL PÚBLICA del
PNG (el logo TRD solo existe en el deploy de prueba hasta que se pase a producción).
**GASTOS FIJOS COMPLETO (2026-08-22)**: módulo `/trd/gastos-fijos` con sub-nav (Resumen · Nómina · Gastos · Crédito).
Migración 0022 (`gasto_fijo` + `credito`). Secciones: servicios públicos (% reparto), otros fijos, herramientas
(recurrencia/día/método), hosting (amortización), paso de dinero (no utilidad); doble moneda COP/USD a la tasa;
Resumen con Total gastos fijos/mes (nómina + servicios + otros + herramientas + hosting + crédito). Crédito Bancolombia
con amortización + cuotas restantes + simulador de prepago (sembrado el crédito real). Archivos: `lib/gastos-fijos.ts`,
`lib/credito.ts`, `lib/gastos-tipos.ts` (tipos compartidos cliente/servidor), `GastoForm`/`CreditoForm`. Migraciones
0020/0021/0022 aplicadas.
**EN PRODUCCIÓN (2026-08-22)**: se hizo **merge de `trd-madre-reg` a `main`** (commit d6e0d4f) → todo lo nuevo (REG,
Nómina, Gastos Fijos, correo, comisión sincronizada, documentos) está **en vivo** en producción. Migraciones 0016-0022
ya aplicadas en el Supabase compartido. Dominio: se decidió NO renombrar (Vercel bloquea el redirect por cadena con
comisiones-team-leadtion-web → leadtionteam); el usuario **agregará `trdinvestment.vercel.app` como dominio ADICIONAL**
(no borrar leadtionteam) apuntando a Production.
**Gastos Fijos con datos + dashboard (2026-08-22, en producción)**: sembrados los datos reales del Excel (nómina 13
personas con sueldo/área/banco = $43.7M COP; 5 servicios públicos con %, 16 herramientas, 2 hosting, otros fijos).
Pestaña **Herramientas** (USD+COP, diario/mensual/anual, recurrencia, total). Nómina con COP+USD + hora/día/mes/año
(8h/30d) y cuadros por departamento. **Resumen = dashboard estratégico** con gráficos interactivos (gastos por
categoría, nómina por departamento, toggle COP/USD) + **histórico mensual por snapshot** ("Guardar mes actual",
migración 0023). Helpers `periodos()`, `nominaPorArea()`, snapshots en `lib/gastos-fijos.ts`; `GastosDashboard.tsx`.
Migraciones 0016-0023 aplicadas. Nota: el histórico arranca desde ahora (meses pasados se pueden importar si el
usuario da los totales).
**Agencia = etiqueta independiente (2026-08-22, en producción)**: `clientes.es_agencia` + `agencia_desde` (migración
0024, backfill desde tipo_cliente='agencia' → 12 migrados). Un cliente puede ser AGENCIA y tener servicio Leadtion a la
vez sin que se borren. Etiqueta "Servicio Leadtion" se deriva de si hay cobro origen='servicio' en el mes en curso
(se vence sola); "Agencia" de es_agencia. Ficha: botón marcar/quitar agencia (`marcarAgencia`, no toca servicios).
Edición: checkbox de agencia separado del tipo base. Mini-stats por es_agencia. **es_agencia = punto de integración con
la plataforma madre** (ella lo prenderá/apagará). `incluye_crm_en_marketing` se sincroniza con es_agencia.
**Bugfix Afiliados (2026-08-22, en producción)**: clientes duplicados (Melia Residenses, Mayra González) porque
`crearMembresia` insertaba en `clientes_afiliados` (cl-mem-<id>) sin verificar duplicado → comisión doble. FIX:
guardia anti-duplicado por afiliado+nombre. Nuevo **botón "Eliminar" en Afiliados → Clientes** (`eliminarClienteAfiliado`;
borra cliente+servicios+pagos SOLO en Afiliados, no toca Membresías) con texto visible sobre tarjeta oscura. Orden por
defecto de la lista = **más recientes primero** (id desc; se mantienen "mayor comisión" y "nombre"). Los duplicados
cl-mem-75 y cl-mem-76 los borra el usuario manualmente (quedarse con los nativos que tienen servicio).
**Pestaña Clientes / Facturación (2026-09-01, en producción)**: `/trd/clientes` — cuadro de ingresos por mes. Migración
0025 (`factura_mensual`). Dos bloques: **LLC (USD)** y **Colombia (COP/IVA · Ebenezer)**. Cálculos verificados con Excel:
pasarela Stripe 2,9%+$0,30, neto = facturado − pasarela; COL IVA 19% y **neto agencia USD = COP antes de IVA ÷ tasa**
(el IVA no es ingreso). Estados semáforo (pagado/facturado/por_facturar/programado/anulado) con selector inline;
crear/editar/eliminar factura; **"Copiar mes anterior"** para recurrentes; totales del mes. `lib/facturacion.ts` +
`facturacion-calc.ts` (puro), `FacturaForm`, `EstadoFactura`. Nav TRD: "Clientes" primero. Se construyó SOLO la
facturación mensual (enfoque elegido); **el "nuevo cliente con cascada" (crear aquí → Membresías/Afiliados/CS) queda como
2º paso**. Por ahora factura usa `cliente_nombre` (texto) + `cliente_id` opcional (datalist de clientes existentes).
**Clientes 2º paso — nuevo cliente EN CASCADA (2026-09-01, en producción)**: `crearClienteCompleto()` extraída en
`membresias/acciones.ts` (fuente única, sin redirect) — crea el cliente en `clientes` (→ CS), asignados, sincroniza
Afiliados (guardia anti-duplicado) y registra servicio Leadtion. `/trd/clientes/nuevo-cliente` (`crearClienteCascada`)
crea el cliente en cascada + su 1ª factura del mes. Botones "+ Nuevo cliente" (cascada) y "+ Factura (existente)".
`NuevoClienteForm`. NOTA: `crearMembresia` quedó con su lógica propia (duplica un poco a crearClienteCompleto; ambas
funcionan) — si se toca una, sincronizar la otra.
**PENDIENTE (pedido por el usuario, siguiente)**: (A) **Egresos del mes** en la vista del mes, con el flag "afecta la
utilidad del mes (sale del mes)" vs "sale de caja (general)"; (B) **Resumen del mes**: ingresos generales vs egresos
generales → utilidad → −diezmo 10% → utilidad neta (revisar cuadro madre del Excel: ago total ingresos $20.331,86,
gastos $18.401,56, utilidad $1.930,30, neta $1.737,27). También: dashboard REG por mes; borrar 2 duplicados afiliados;
dominio trdinvestment + RESEND_*/EMAIL_LOGO_URL en Production. Migraciones 0016–0025 aplicadas.
El usuario debe: setear en Vercel `EMAIL_LOGO_URL` (URL pública del logo, ej. .../brand/trd/trd-logo-black.png) y
`REPLY_TO_EMAIL` (opcional; default contable@turincondigital.com), y confirmar el costo exacto de transferencia.
Migraciones 0017/0018/0019 YA aplicadas en Supabase.
**Pendientes**: (1) Vercel: agregar dominio TRD como producción + redirect del viejo; (2) configurar Resend
(API key + FROM) y probar envío; (3) cargar CIIU+tarifa reales de cada colaborador; (4) notificaciones in-app
(motor de recordatorios) + PWA push al celular.
(Lo de abajo es la fase 1-2 de Leadtion, ya terminada.)

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
- **P&L Comisiones CS sincronizado (2026-08-18)**: antes el P&L sumaba solo hitos con
  fechaHito DENTRO del mes ($62.10) — no cuadraba con lo que se paga. Ahora
  `pnl.ts` comisionesCS = `sum(totalPendiente)` al corte fin de mes (= $286.80, igual
  que el "Pendiente" del panel CS y el "por cobrar" de los portales). Etiqueta:
  "Comisiones CS (pendiente por pagar)". Las acciones de pago revalidan también
  `/membresias/dashboard` para que el P&L se actualice al instante al marcar pagos.
  Verificado E2E: crear cliente en Membresías aparece en CS (motor lee TODO
  public.clientes) + portales + Afiliados (si tiene afiliado). Reglas CONFIRMADAS
  (ver "Decisiones confirmadas 2026-08-18"): clientes con afiliado SÍ comisionan a CS;
  "personas asignadas" aún NO filtra (todos comisionan por fecha).
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
  **MULTI-SERVICIO + precio editable (2026-08-18, migración 0012 `precio_mes1`)**: el form
  de "Registrar servicio" ahora permite agregar VARIOS servicios a la vez (componente
  client `ServiciosForm.tsx`, botón "+ Agregar otro servicio") y ajustar el precio del
  mes 1 (descuento; vacío = estándar $847/$597/$497 vía `PRECIO_MES1_ESTANDAR`). Si dos
  servicios caen en el mismo mes, los cobros se SUMAN: `registrarServicio` inserta cada
  `cliente_servicios` y luego `recomputarPagosDeServicios()` recalcula cada mes sumando
  TODOS los servicios del cliente (robusto a registros separados). Verificado (Maylet:
  React+AI en julio con $600 c/u → jul $1200, ago $197, sep $316). Ficha muestra "Precio
  mes 1" por servicio.
  **EDITAR/ELIMINAR servicios (2026-08-18, migración 0013 `pagos_mensuales.origen`)**: en
  "Servicios adquiridos" cada servicio tiene Editar (`/servicio/[sid]/editar`,
  `editarServicio`) y 🗑️ (`eliminarServicio`, `BotonEliminarServicio`). Al editar/borrar,
  `recomputarPagosDeServicios` BORRA los pagos `origen='servicio'` y regenera → los meses
  que un servicio deja de ocupar se limpian solos (verificado: mover ago→jul limpia oct).
  Backfill marcó los meses de servicios existentes como origen='servicio'.
  **Fecha exacta de compra + tipo por mes (2026-08-18, migración 0014 `fecha_compra`)**:
  el form de servicio ahora pide la FECHA exacta (día) de compra, no solo el mes; el mes de
  esa fecha define la ventana de cobros (`mes_inicio`). Ficha muestra "Fecha de compra". En
  el historial mensual se agregó columna "Tipo de cliente": DERIVADA por mes — desde el mes
  del primer servicio comprado se muestra "Servicio Leadtion"; antes, el tipo base (agencia
  si viene con marketing, si no estándar; o el tipo actual si nunca compró servicio). Muestra
  cómo entró el cliente y cuándo pasó a servicio. (No hay historial de cambios estándar↔agencia.)
  **PERÍODOS DE SOPORTE (2026-08-18, migración 0015 `cliente_soportes`)**: en "Registrar
  servicio" hay un selector "Servicio de entrada / Período de soporte" (`RegistrarForm`,
  `SoporteForm`). Un período de soporte = nivel ($87/$119/$157) + desde + hasta (o
  INDEFINIDO = hasta el mes en curso, se extiende). Pone esos meses con ese valor; los de
  fuera vuelven SOLOS a su valor normal (verificado: $119 solo agosto → sep vuelve a $69).
  `recomputarPagosDeServicios` se unificó en `recomputarPagosDeCliente` (maneja servicios
  Y soportes; el servicio gana si coinciden en un mes; origen 'servicio'/'soporte'). Ficha:
  sección "Períodos de soporte" (editar/eliminar) + el "Soporte" del datos-grid muestra el
  efectivo del mes en curso. CAVEAT: borrar un período que sobrescribió un mes manual deja
  ese mes vacío (mejor editar el rango; el flujo normal de auto-reversión sí es correcto).
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

## Servicios: fuente única de verdad (2026-08-19)
- **Crear cliente con plan de servicio AUTO-GENERA el servicio** (`crearMembresia`): si
  `plan_tipo` es agente_ai/reactivacion/level_up, inserta `cliente_servicios` (fecha_compra
  = fecha_activacion, precio_mes1 del nuevo campo del form) y llama `recomputarPagosDeCliente`
  → el historial mes 1/2/3 se genera solo (no más mes 1 vacío ni doble paso). El form de
  alta tiene campo "Precio del mes 1".
- **Una sola fuente de verdad**: `editarServicio` sincroniza `clientes.soporte_valor` y
  `plan_tipo` con el servicio → la ficha nunca diverge (si cambias soporte $157→$119 editando
  el servicio, la ficha refleja $119). "Registrar servicio" queda para servicios ADICIONALES.
- **P&L servicios sin doble conteo (2026-08-19)**: se calcula por el CALENDARIO de cada
  servicio (no por join a pagos), así un cliente con 2 servicios no cuenta doble
  (agosto pasó de $1394 erróneo a $697 correcto). Ver `pnl.ts`.

## Reglas/decisiones clave (no re-preguntar)
- **DECISIONES CONFIRMADAS 2026-08-18 (el usuario las validó explícitamente):**
  1. Un cliente **con afiliado TAMBIÉN comisiona a CS** (son dos comisiones distintas:
     el afiliado cobra por traerlo; CS cobra por gestionarlo). Hoy ya es así. NO excluir.
  2. **"Personas asignadas" NO filtra** quién comisiona: por ahora TODO el equipo (Andrés/
     Daniel/Alejandro) es responsable de TODAS las cuentas y comisiona por fecha. Más
     adelante, con más gente, se asignarán personas puntuales a clientes puntuales
     (feature futura). El campo `cliente_colaboradores` se guarda pero aún no filtra.
  3. **CHS: NO implementar por ahora** (stop; muy pocas cuentas para gestionarlo). Queda
     como "por implementar". El motor asume CHS cumplido (todos los hitos cuentan).
  4. **Nómina Daniel = 30% Leadtion / 70% agencia** (era 100%; se cambió en `config_negocio`
     el 2026-08-18). Pronto podría cambiar de nuevo. Andrés 60%, Alejandro 100%.
  5. Pagos de comisión: se pagan del **1 al 5 del mes siguiente**, junto con el salario.
     Aún NO se ha registrado ningún pago; el primero será el corte 1-5 sep 2026.
- Comisión CS: base $67/$69 por fecha; hitos T1/T2/T3; elegibilidad por fecha, sin
  tabla de asignación. Pausado NO comisiona.
- Precios: Agente AI $847 (mes2 $0 garantía, mes3 soporte); Reactivación $597+$197+$197;
  Level Up $497. Soportes $87(LevelUp)/$119/$157 (AI/React), incluyen licencia $69.
  Detalle en `REGLAS_NEGOCIO_PLANES.md` y `MODULO_CLIENTES_MEMBRESIAS.md`.
- Afiliados: agencia (% sobre servicios mes 1) / partner (% por nivel 30/40/50%).
- Membresías: maestro madre; sueldos COP→USD tasa diaria (~3140). Ver spec en
  `MODULO_CLIENTES_MEMBRESIAS.md`.

## Siguiente paso
La plataforma está en USO REAL (el usuario dejó el Excel el 2026-08-18). Los 3 módulos
funcionan y están sincronizados/verificados. Backlog priorizado (features futuras, NO bugs):
- **CHS** (encuesta + gate de hitos) — por implementar, en pausa por decisión del usuario.
- **Asignación persona↔cliente** que filtre comisión — futura (cuando haya más equipo).
- **UI para editar nómina/GHL/tasa** (hoy se edita en `config_negocio` por SQL).
- **Generar `pagos_mensuales` automático por plan** (AI 847/0/157…) al crear cliente.
- **Afiliados**: reverificar a fondo el número de comisión del P&L (esta sesión se auditó CS).

## Backlog / pendientes por módulo (ideas ya discutidas — no perder)
**Clientes/Membresías (en curso):**
- Ficha + creación de cliente con toda la lógica: plan de entrada (AI/React/LevelUp),
  soporte, API (activa/vendida $12), bono reactivación ($50/$100), reserva ($100,
  14 días, inicia al pagar excedente: AI +$747 / React +$497), flag agencia (licencia
  free vía plan de ads; puede sumar servicios con descuento), personas asignadas
  (Andrés/Daniel/Alejandro) → **sincronizar** con Comisiones CS; ¿recomendado? →
  sincronizar con Afiliados (agencia/partner y de quién). Estados: pausar/cancelar.
- Dashboard P&L: cuentas activas, ingreso mes, costo mes (nómina COP→USD: Andrés
  $4.9M×60%, Daniel $4.5M×30% (era 100%, cambió 2026-08-18), Alejandro $3.3M×100%; GoHighLevel $497; APIs incluidas
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
