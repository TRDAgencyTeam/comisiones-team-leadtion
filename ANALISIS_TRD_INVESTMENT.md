# Análisis — Plataforma madre TRD Investment LLC (FASE 3)

> **Estado: ANÁLISIS en curso, NADA construido todavía.** El usuario (Mauro) dejó de
> perfeccionar Leadtion por ahora y arrancó la fase 3: la **plataforma madre** que
> consolida TRD Agency + Leadtion. Primero analizamos TODO el Excel pestaña por pestaña
> (con contexto del usuario) antes de diseñar arquitectura. Fuente: Excel
> `INGRESOS - EGRESOS TRD AGENCY AGOSTO 2026.xlsx` (12 pestañas) + organigrama en Canva.
> Última actualización del análisis: **2026-08-19**.

## La visión (organigrama)
**TRD Investment LLC** = holding / "máquina madre" (control financiero superior, en **USD
como moneda principal**, COP secundaria). De ahí cuelgan dos ramas:
- **Leadtion CRM** → YA construido (membresías, afiliados, comisiones CS). App en vivo
  `leadtionteam.vercel.app`.
- **TRD Agency** → NUEVO (esta fase).

Capa de **Contabilidad (Ingresos y Egresos)** con nodos:
- Management clientes Leadtion ✅ · Comisiones CS Leadtion ✅ · Comisiones Comerciales Leadtion ⏳(después)
- Management clientes TRD Agency 🆕 · Gastos fijos 🆕 · Clientes Hosting/Dominio 🆕 ·
  Mantenimiento web WordPress 🆕 · Legal 🆕
- La madre **jala los datos de Leadtion ya existentes** y suma los de TRD Agency.

Arquitectura probable (a definir con el usuario): un **módulo/plataforma de nivel superior
"TRD Investment / Contabilidad"** por encima del selector actual. Falta decidir si es login
aparte o módulo dentro de lo actual.

## Regla de moneda
USD es la moneda por definición (la administración es de la LLC). Todo se ve en USD y COP,
con **tasa diaria** (ya existe `web/src/lib/fx.ts`). La nómina y clientes Colombia nacen en
COP y se convierten a USD a la tasa del día.

---

## PESTAÑA "2026" (la principal — ingresos/egresos mensuales)
> Solo interesan 2026 en adelante. Las pestañas 2022/2023/2024 se IGNORAN.

**Resumen anual (arriba-izquierda):** Utilidad Bruta 2026, Gastos Fijos, Gastos Variables,
Utilidad Neta (todo USD). Se alimenta de los **resúmenes mensuales** de más abajo.

**Estados por color (leyenda):** Pagado (verde), Facturado (rojo clarito), Anulado, Por
facturar, Programado. = **estado de la factura de cada cliente ese mes** (semáforo). En la
plataforma sería un estado por factura/cliente/mes.

**Cada mes = 3 bloques lado a lado:**

### 1) Facturación (clientes)
Columnas: `MRR N` · `LLC`/`COL` · Cliente · **Servicios Contratados** (desplegable, varios con
add-ons: "Meta Ads, LEADTION Text AI") · Precio USD (con indicador **"(MES 6)"** = meses que
lleva activo el cliente recurrente = su LTV/antigüedad) · Fecha facturación · Fecha pago ·
Medio (Stripe/Zelle/Bancolombia) · Facturado USD · **Comisión pasarela** · **Neto pagado**.
- **MRR** = clientes con plan recurrente, numerados 1..N.
- **LLC** = clientes facturados desde la LLC (EE.UU.). Primero los de agencia, luego un
  espacio y los clientes **Leadtion** (marcados aparte: quién tiene plan agencia vs quién es
  estrictamente Leadtion). Nota "Reserva" a la izquierda cuando el cliente vino con reserva.
- **Clientes Colombia** (tabla aparte, entidad **Ebenezer M&M**): Precio en COP · COP antes de
  IVA · **IVA 19%** · COP con IVA · **Neto Agencia en USD** (a la tasa del día). Ej. recurrentes:
  Lord And Lady, Lord By David, Bio Salud.

### 2) Resumen del mes (el corazón) — ejemplo AGOSTO 2026 (cuadra exacto):
- **Gastos totales $18,401.56** = Fijos $17,587.49 + Variables mes $417.27 + WhatsApp API $0 +
  Referidos Leadtion $146.80 + Bono reactivación $200 + Comisión retiro banco $50.
- **Total ingresos $20,331.86** = Clientes USA $15,083.76 + Clientes COL $733.38 + Afiliación
  Brevo $7.25 + Reselling $293 + WhatsApp API $120 + Reservas $100 + Hosting $0 + Mantenimientos
  $150 + **Leadtion(47)+Afiliado $3,844.47**.
- **Utilidad = ingresos − gastos = $1,930.30.**
- **Utilidad Neta = utilidad − DIEZMO = $1,737.27** (diezmo $193.03 = **10% de la utilidad**, donación mensual).
- Muchos ítems de ingresos YA están en Leadtion (WhatsApp API, reselling, reservas, bono,
  membresías, Leadtion+afiliado) → la madre debe **jalarlos solos** (hoy el usuario mete
  reselling a mano). "Afiliado" = revende su propia licencia GoHighLevel y gana **$78.47/cuenta**.
  "Ingresos x Afiliación Brevo" = dólares pequeños por referidos.

### 3) Egresos del mes — REGLA CLAVE (lo más importante a modelar)
Columnas: Descripción (marca/entidad: TRD/Leadtion/Ebenezer) · Concepto (manual, sin categoría
fija) · Fecha · Costo USD · Costo COP. El cuadro tiene **DOS secciones separadas por un 2º
encabezado**:
- **Sección de arriba (color salmón)**: gastos que se sacan de **CAJA o de la UTILIDAD** (Siigo
  Nube x12, Capcut, grabaciones, publicidad, compras) y que **NO cuentan** como gasto del mes
  (si contaran, la utilidad daría casi cero). Son inversiones/gastos extraordinarios.
- **Sección de abajo (desde "Pago David Meneses")**: los **gastos variables reales del mes**
  (= "TOTAL GASTOS" / "Gastos Variables Mes", $417.27 en agosto) que **SÍ** cuentan en la utilidad.
- **Diezmo**: caso especial — no es gasto operativo pero **sí** se resta para la utilidad neta;
  es un **10% derivado** de la utilidad (lo calcula la plataforma, no es dato manual).
- → En plataforma: cada egreso lleva una marca **"¿afecta la utilidad del mes? sí/no"** (idéntico
  al concepto `origen` de Leadtion). Así se replica sin separar a mano.

---

## PESTAÑA "Gastos Fijos TRD"
Alimenta el renglón "Gastos Fijos" del resumen mensual. Total agosto: **$52.7M COP →
$17,587.49 USD** (tasa 3,052.97).
1. **Servicios públicos con % de reparto**: Arriendo 50%, Luz 50%, Internet 100%, Seguridad
   Social 60% Mao + 60% Mari. Los % salen del cómputo del costado derecho (100% real de cada uno).
2. **Nómina (13-14 personas) con siglas de área**: GC=gerente (Mauricio), SM=social media (María,
   Gleinis), **LT=Leadtion (Andrés, Daniel, Alejandro)**, AV=audiovisual (Alex, Nikolas, Valentina,
   Juan, Santiago), MB=media buyer (Ivonne, Diego). **Toda en COP** (se paga desde Ebenezer), se
   convierte a USD a la tasa. → **Conecta con Leadtion**: los LT son los mismos del P&L de Leadtion;
   Daniel = 30% Leadtion / 70% agencia. La madre sería la **fuente única de nómina** y Leadtion
   jala el % atribuido.
3. **Otros fijos**: Pago Contadora ($400k), Plan Celular Mao ($45k), **Cuota Crédito Libre
   Inversión Bancolombia** ($2.93M ≈ $959.72), Cuota de manejo, Taxes+Renovación (ahorros, hoy $0).
4. **Herramientas (1-15)**: casi todas en USD (solo Siigo y Capcut Pro Teams en COP). Cuadro aparte
   por herramienta: diario/mensual/anual + día de recurrencia + método (**BOA** = Bank of America de
   la LLC). = **rastreador de suscripciones** (la plataforma calcula diario/mensual/anual + próximas
   fechas de pago; podría avisar renovaciones). Correos/cuentas de cada herramienta: NO importan.
5. **Hosting Siteground V1/V2**: 2 hostings con cuentas de clientes (~$550/año c/u); se **amortizan
   mensualmente** para que el pago anual no pegue duro.
6. **Resumen de nómina**: cada persona por hora/día/mes/año.
7. **Élite Mao ($2,147.68)**: **paso de dinero, NO utilidad**. Mauricio recibe comisiones de la
   comunidad Elite Agent (Skool) vía LLC → Ebenezer → Mauricio. (Elite Agent además es cliente de
   la agencia por social media, pero eso es aparte.) → marcar como "no cuenta en utilidad".
8. **Histórico de gastos fijos + variables**: registro de cuánto se **bajó de la LLC a Ebenezer**
   cada mes, con tasa y fecha/hora (rótulo dice 2025 pero es desde **enero 2026**). = registro de
   tesorería, útil para ver cuánto se transfirió y a qué tasa.
9. **Cuentas de banco de colaboradores**: NO relevante (ya están en la app del banco). Ignorar.

### Crédito Bancolombia (detalle dado por el usuario 2026-08-19)
- Libre Inversión · desembolso **29-ene-2025** · monto **$110.000.000 COP** · tasa **fija 19.42%
  E.A.** · plazo **60 meses** · pago entre el **3 y 4 de cada mes** · **saldo hoy $87.615.572** ·
  cuota **$2.930.000** (intereses corrientes **$647.384**, resto a capital). Objetivo: plan de
  prepago para no esperar 60 meses. → **mini-módulo de amortización** (cuota, saldo, cuánto falta).

### Caja LLC (contexto dado por el usuario 2026-08-21)
Pestaña = **resumen de flujo de caja de TRD Investment (la LLC)**: ingresos vs egresos vs utilidad,
mes a mes **desde enero 2026 hasta la fecha**. Se anota **manual al cierre de cada mes** (no hay
fórmulas en las celdas). El usuario quiere **mantener el control aunque sea manual**, pero que la
plataforma le arroje **gráficos** (hoy no los tiene).
- **Estructura de marcas**: **TRD Investment** (la LLC madre) → **TRD Agency** / **Leadtion** (sus dos
  marcas). Además entra el **ED Agent (Elite Agent)** en la misma cuenta.
- **ED Agent = "paso de dinero", NO utilidad de TRD**: es una comunidad en **Skool** que el usuario
  tiene **con socios**. TRD Investment solo **presta la empresa/cuenta** para recibir esos ingresos;
  al llegar se **reparten a los socios (Wilmar Sosa, Samuel Oropeza, Mauricio Valle)**. Se **acumula
  mensual y se paga TRIMESTRALMENTE**. Se lleva en esta caja solo porque **entra a la misma cuenta**
  (seguimiento de tesorería). → modelar como pasivo/dinero de terceros, no como utilidad propia.
  **NO hace falta guardar el % ni el monto de cada socio** (decisión del usuario 2026-08-21).
  (Relacionado con "Élite Mao" ya anotado: comisiones que pasan por la LLC hacia Mauricio.)
- **Costado derecho — "Inversiones y gastos" con la utilidad de TRD Agency + Leadtion**: aquí se
  reflejan las **inversiones/costos que en el cuadro de egresos se marcan como "NO afecta la utilidad
  del mes" (salen de la CAJA)** — es exactamente el otro lado de la regla del flag de egresos. Sirve
  para ver el **flujo de caja real** del mes, no la utilidad contable.
- **De dónde salen los números (aclaración 2026-08-21)**: NO son datos nuevos. La Caja LLC **jala del
  cuadro "Resumen del mes"** de cada pestaña mensual (las de 2026): **Total ingresos** y **Total gastos**
  vienen de ese mismo cuadrito. → en la plataforma, la Caja LLC se calcula sola desde ese resumen, no se
  re-captura a mano.
- Cada mes trae su valor y al final una **"Caja disponible"**. Le permite ver si está **sacando más
  dinero del que debería** o si está en rango sano. **Hoy la caja NO está saludable** → objetivo del
  usuario: **volverla lo más saludable posible** (este es el "para qué" de la pestaña).

### Caja Col — Ebenezer M&M SAS (contexto dado por el usuario 2026-08-21)
Pestaña = **mini-contabilidad de la caja de la empresa en Colombia (Ebenezer M&M SAS)**. Debe **cuadrar
casi exacto** con el **dinero real en la cuenta bancaria de la empresa en Colombia** — es un seguimiento
contable, no una estimación.
- **Ebenezer factura a TRD Investment** (son la misma casa, pero una **figura como proveedor** y la otra
  **como cliente**): TRD Investment "contrata" a Ebenezer, que es **donde vive toda la nómina**. Esa
  **factura (ej. ~$17.000 USD)** es la que **baja de la LLC a Colombia** a una **tasa pactada** (esto
  conecta con el histórico LLC→Ebenezer ya anotado).
- **Costado derecho (verde) = caja de Colombia**: **Ingresos** = ingresos por LLC (la bajada/factura) +
  ingresos por **clientes COL** (los que factura Ebenezer directo) → **Total**. Luego los **egresos de
  Colombia**: **nómina, donaciones, costos de transferencia, internet/proveedor**, etc.
- Es la contraparte colombiana de la Caja LLC: LLC baja plata → entra como ingreso a Caja Col → de ahí
  salen los gastos operativos colombianos (sobre todo nómina).

### Precios — catálogo de servicios (contexto dado por el usuario 2026-08-21)
Pestaña = catálogo de servicios de **TRD Agency** y **Leadtion**. La agencia **no tiene muchos servicios**:
casi todo se **empaqueta en un plan**. Las casillas "tiempo de ejecución" y "personas involucradas" **no
son relevantes ahora**.
- **Plan de Marketing (Ads + IA + CRM)** — el plan más completo: publicidad + IA + CRM. Precio público:
  **mes 1 desde $1,500**; **mes 2 en adelante desde $897**. **Contrato CUATRIMESTRAL (4 meses).**
- **Social Media Advance** (marca personal para realtors): **desde $497**, también **contrato cuatrimestral**.
- **Plan de marketing para eventos presenciales**: campañas + componente de **CRM y seguimiento de leads
  con automatizaciones**. **$797 por ese mes de trabajo** (puntual, un mes).
- Debajo van los **planes de Leadtion** ya conocidos (Agente IA / Reactivación / Level Up, membresía, etc.).
- **CLAVE para la plataforma → contrato cuatrimestral = base de las ALERTAS/automatización**: al iniciar,
  el cliente **firma un contrato de 4 meses**; el sistema debe avisar hitos/vencimiento/renovación del
  contrato.
- **Servicio NUEVO — Grabación profesional de contenido**: se cobra **por hora, paquete mínimo 3 horas =
  $400 USD/sesión**. Lo ejecuta un **videógrafo/colega proveedor externo en EE.UU. (Orlando o Miami)** →
  la agencia **revende** el servicio. Se usa como **add-on dentro del Plan de Marketing (Ads) o del Plan
  Social Media**. Detalle en la sección de contratos.

### Contratos de cliente (analizados 2026-08-21) — 3 documentos de ejemplo
La entidad firmante en los 3 es **TRD INVESTMENT LLC, comercialmente TRD Agency**, domicilio Florida.
Cláusulas comunes clave para la plataforma (alertas, cobros, estados):
- **Cobro anticipado al inicio de cada ciclo mensual** vía **Stripe** (autoriza cobro automático al 1er pago).
- **Mora 1% semanal**; si el método falla, 5 días para regularizar; **+20 días de impago → suspensión**.
- **Reembolso solo en 48h** (si no se inició trabajo); luego **no reembolsable**.
- **Cancelar antes de terminar los 4 meses → penalidad 30%** de los honorarios pendientes; avisar **15 días
  antes del siguiente cobro**.
- Soporte **UTC-5**: L-V 8:00–12:30 y 14:00–17:30; sáb 8:00–13:00; calendario de festivos de EE.UU.

**1) Plan Marketing Lead Generation (Meta Ads + IA + CRM)** — el integral:
- Incluye: Meta Ads + piezas + contenido orgánico + **Leadtion CRM** (licencia reg. **$69/mes incluida**,
  hasta 3 usuarios) + **1 Agente de IA precalificador** + automatizaciones + soporte + WhatsApp API (cuando
  aplique). Hasta **2 reuniones estratégicas/mes**.
- **Permanencia mínima 4 meses.** Pagos mes 1/2/3/4 (según catálogo: **mes 1 $1,500 · mes 2+ $897**; la
  propuesta comercial puede personalizar valores y **prevalece**).
- **NO incluye la garantía especial de devolución** que sí tienen los servicios Leadtion independientes.
- **Al terminar el plan**, el cliente elige (15 días para decidir): **(a)** solo Leadtion CRM **$69** ·
  **(b)** Soporte Avanzado **$119** (licencia + 3 tickets/mes + optimización IA + atención grupal WhatsApp) ·
  **(c)** Soporte Premium **$157** (licencia + 4 tickets/mes + optimización IA + automatizaciones + soporte
  estratégico + prioritario) · **(d)** cancelar. **Ticket = 1 solicitud de hasta 1 hora.** → esto empalma
  con los soportes de Leadtion ya modelados ($69/$119/$157).

**2) Plan Contenidos Social Media Advance** (marca personal para realtors):
- **$497/mes**, **permanencia mínima 4 meses** (el doc dice "tres (4)" — es un typo, son 4).
- Solo contenido orgánico: **10 videos cortos + 2 estáticas/carruseles al mes (~3 posts/semana)**.
- **NO incluye**: Ads, Leadtion CRM, Agente IA, gestión de comentarios/DM, ni grabación profesional (salvo
  contratarla aparte). Al finalizar: **30 días** para descargar archivos.

**3) Grabación audiovisual de contenido** (servicio nuevo, add-on):
- **1 sesión profesional de 3 horas = $400 USD** (mínimo 3h). Rinde **5–7 videos/sesión** (orgánico o Ads).
- Videógrafo externo en **Orlando o Miami** (la agencia revende). **No acumulable**: agendar en el mes o
  máx **20 días**; no 2 sesiones el mismo mes. **Inasistencia = sesión ejecutada y perdida** (pagar de nuevo).
- Costos externos (parqueadero, peajes, permisos, desplazamiento fuera del área) los asume el cliente.
  Edición a cargo de la agencia.
- **PDFs fuente**: `EJEMPLO CONTRATO CLIENTES - AGENCIA - {META ADS + AI + CRM | SOCIAL MEDIA PRO | GRABACION
  DE CONTENIDO}.docx` (Downloads del usuario).

### REG — Registro contable (contexto + análisis 2026-08-21)
Pestaña = **registro contable del pago a cada colaborador** (nómina) mes a mes. Incluye también a **freelance
ocasionales** (personas que NO están en Gastos Fijos: apoyos puntuales de emergencia que se pagan por particular).
- **Por cada persona/mes**: **Valor de la cuenta de cobro** (debe **cuadrar con Gastos Fijos → nómina**; misma
  fuente única) → **Retención de ICA** → **Retención de renta** → **Valor a girar** (= cuenta de cobro − ICA − renta).
- **Costo de transferencia** (según banco): **NO se le descuenta a la persona**; lo asume **Ebenezer como gasto propio**.
- **Checklist de 4 estados por persona/mes** (lo marca quien hace los pagos):
  1. **Correo enviado** → **AUTOMATIZAR**: al marcarlo, enviar al colaborador un correo simple con **valor de la
     cuenta de cobro + retención de ICA (y renta) + valor girado**, informando que ya se le pagó. Nada más.
  2. **Guardado en Drive** → **manual**: subir la cuenta de cobro / soportes fiscales que envía cada colaborador,
     para que la **contadora** los registre en el software **Siigo**.
  3. **Registro contable** → **manual**: registrar en la app de celular "Registro Contable".
  4. **Pagado** → **manual**: marcar cuando ya se pagó desde el banco de la empresa.

**Parte tributaria (cómo salen las retenciones) — verificado con el Google Sheet del usuario:**
- Google Sheet fuente (calculadora + tabla): fileId `1YfWEM3q1-rL9xVDavOWbJdiMkuVBNXab`. **UVT 2025 = $49,799**
  (UVT 2026 = $52,374). Columnas: Valor factura · Aporte salud · Aporte pensión · ReteICA · ReteRenta · Valor a
  girar · ID · Nombre · Actividad económica (CIIU).
- **ReteICA (Bogotá)** = `valor cuenta de cobro × (tarifa por mil de la actividad CIIU) / 1000`. El Sheet trae la
  **tabla completa CIIU → tarifa por mil**. Verificado: actividad **7410** (diseño) = **8.66‰** → $6,250,000 ×
  0.00866 = **$54,125** y $6,000,000 → $51,960 (ambos exactos). Tarifas de las actividades del equipo: **7410**
  diseño 8.66‰ · **7310** publicidad 9.66‰ · **8299** apoyo a empresas 9.66‰ · **5911** producción audiovisual
  11.04‰ · **5920** grabación de sonido 11.04‰. (Varios colaboradores "deben actualizar actividad".)
- **ReteRenta (Art. 383 ET, Ley 2277/2022)** = aplica a honorarios/servicios de personas naturales. **FÓRMULA
  EXACTA confirmada** (celda del Sheet, el usuario la compartió 2026-08-21). Con `B`=valor factura, `C`=aporte
  salud, `D`=aporte pensión, `UVT`=$C$3 ($49,799 en 2025):
  - `base_pesos = (B − C − D) × 75%`  (resta aportes y luego 25% renta exenta)
  - `base_uvt = base_pesos / UVT`
  - IFS por tramos (resultado en negativo; se multiplica por UVT al final de cada tramo):
    - `base_uvt < 94` → **0**
    - `< 149` → `(base_uvt − 95) × 19% × UVT`
    - `< 359` → `((base_uvt − 150) × 28% + 10) × UVT`
    - `< 639` → `((base_uvt − 360) × 33% + 69) × UVT`
    - `< 944` → `((base_uvt − 640) × 35% + 162) × UVT`
    - `< 2300` → `((base_uvt − 945) × 37% + 268) × UVT`
    - `> 2301` → `((base_uvt − 2300) × 39% + 770) × UVT`
  - **OJO — quirk de la plantilla**: el tramo de $0 está en `< 94` (la ley usa `< 95`). Por eso una base de
    94,13 UVT (cuenta de $6.25M sin aportes) cae en el tramo 19% y da `(94,13−95)×19%×UVT ≈ $8.247` en vez de $0.
    Al construir se replica **tal cual la fórmula** para que cuadre idéntico al Excel (no "corregir" a 95).
- **Valor a girar** = cuenta de cobro − ReteICA − ReteRenta.
- **ReteICA — fórmula EXACTA confirmada** (celda, usuario 2026-08-21): `=-B6*BUSCARV(K6; GRAVADAS!A:D; 4; FALSO)/1000`
  → `valor × (tarifa por mil de la actividad CIIU, buscada por código en la hoja GRAVADAS col.4) / 1000`. Va en negativo.
- **Valor a girar — fórmula confirmada**: `=B6+E6+F6` (factura + ICA + renta; ICA y renta ya vienen con signo negativo).
- La calculadora del sistema: **input = valor + aportes salud/pensión + actividad CIIU → output = ICA, renta y
  valor a girar** automáticamente. Las 3 fórmulas están 100% confirmadas.
- Ejemplo verificado (sin aportes, actividad 7410 8,66‰): $5.400.000 → base 81,33 UVT < 94 → renta $0, ICA −$46.764,
  girar $5.353.236. $9.800.000 → base 147,59 UVT → renta −$497.628, ICA −$84.868, girar $9.217.504.

### Cloud TRD — Hosting y Dominio (contexto 2026-08-21)
Servicio que **NO se vende activamente** pero se ofrece si un cliente lo necesita → **agregar al catálogo de Precios**
como servicio disponible. La pestaña = **seguimiento de renovaciones** de cuentas de hosting/dominio activas.
- Por cuenta: **fecha de registro · nombre cliente · valor inicial pagado · ciclo (anual) · qué contrató (solo hosting,
  o hosting + dominio) · fecha de renovación de dominio (si aplica) · fecha de renovación de hosting (si aplica) ·
  valor de renovación de cada uno**.
- **Doble moneda**: los valores están pactados casi siempre en **COP** (mayoría de clientes en Colombia), pero hay que
  tener **COP y USD** (calcular el equivalente en USD).
- Organizado **por mes** con **semáforo**: verde = ya pagó/listo. Meses sin clientes = no aplica. Si un cliente no
  renueva se **borra del cuadro** y se elimina la cuenta en el proveedor.
- **QUIERE en la plataforma**: **notificaciones/recordatorios** de "cliente pendiente por cobrar renovación"
  (hosting / dominio / ambos) según fecha, y poder **marcar pagó** o **dar de baja** si no renueva.

### Mantenimiento y soporte web (contexto 2026-08-21)
Similar a Cloud TRD pero para **mantenimiento de WordPress**: entran a actualizar **licencias y plugins** de la página
del cliente, mantenerla al día y **evitar hackeos/desactualización** (no es automático). **NO se vende activamente**;
solo clientes antiguos → también **agregar al catálogo de Precios** como servicio disponible.
- **Ciclos trimestrales** (excepto Elements Coffee, que hace rato no paga; queda como pendiente, no se le cobra).
- Clientes actuales (4): **M&M Multicultural Management, Biosalud, Agente Postal, Elements Coffee**. Por cliente:
  fecha de registro (inicio del mantenimiento) + estado por ciclo.
- **Semáforo**: verde = pagó · rojo = no pagó · si acumula muchos ciclos sin pagar → se elimina. Hay celdas de **total**
  (cuánto aporta este servicio).
- **QUIERE en la plataforma**: mismo patrón que Cloud TRD → recordatorio de ciclo trimestral por vencer, marcar
  pagado/no pagado, y total del servicio.

> **Patrón común Cloud TRD + Mantenimiento web** = mini-módulo de **renovaciones recurrentes** (anual el hosting/
> dominio, trimestral el mantenimiento): calendario de vencimientos + alertas de cobro + estado pagado/no + doble
> moneda COP/USD. Ambos son servicios "pasivos" (no se venden activamente) pero se listan en Precios.

### ⭐⭐ OBJETIVO / PRINCIPIO RECTOR de la plataforma madre (2026-08-21) — LEER ANTES DE ARQUITECTURA
El objetivo NO es "otro tablero de control" (para eso al usuario le basta el Excel). Los dos objetivos reales son:
1. **Reducir al mínimo los errores numéricos** — un solo dato, calculado, nunca recapturado.
2. **Que TODO esté sincronizado entre sí** — que los módulos se alimenten unos a otros automáticamente.

**Modelo mental clave = "el cuadro de ingresos de la madre es la FUENTE de todo".** Desde ahí se crea el cliente
UNA sola vez y **cascada** hacia abajo (no al revés — nunca crear el cliente primero en Leadtion):
- Al **crear un cliente en la madre** (ej. "Melia Residence"), el sistema pregunta/deriva y **sincroniza solo**:
  - ¿Tiene **plan de agencia** con **Leadtion incluido**? → se crea en Leadtion como cliente con plan agencia
    (licencia incluida, como ya funciona en Leadtion).
  - ¿NO tiene plan agencia pero **sí un servicio Leadtion** (Agente IA/Reactivación/Level Up/membresía)? → se
    registra en Leadtion como servicio.
  - ¿Vino por un **referido/afiliado**? ¿quién? → sincroniza con el módulo Afiliados (si aplica).
  - ¿**entra o no** para **Customer Success**? → alimenta el motor de comisiones CS.
  - → Si luego consulto en Leadtion, veo exactamente lo que creé en la madre (una sola verdad).
- **Egresos**: al agregar un egreso del mes, el sistema pregunta **"¿sale de caja o sale del mes?"** (el flag
  afecta-utilidad) y **sincroniza** el resultado con el cuadro de **utilidad/ingresos** y con **Caja LLC**.
- **Transferencia a Ebenezer** (fin de mes): pregunta **valor + tasa**, y sincroniza con el **dinero que debería
  haber en la cuenta** (Caja Col) — cuadre de tesorería automático.
- **Gastos fijos** (nómina, herramientas) como módulo aparte pero conectado: si sincronizo un valor de nómina o
  agrego **una herramienta nueva**, el sistema sabe **cuándo/cómo/dónde** se integra (a qué marca/entidad afecta,
  recurrencia, si entra o no en cada cálculo).

**Consecuencia de diseño**: la arquitectura debe girar sobre **una sola base de datos con el cliente/entidad como
nodo central** y reglas de derivación (no duplicar datos entre "apps"). Leadtion deja de ser una isla: pasa a ser
una **rama** que la madre alimenta. **No se puede perder de vista NINGUNA conexión** → la arquitectura se dibuja
como un grafo de "quién alimenta a quién".

### ⭐ REQUISITO CENTRAL — Sistema de NOTIFICACIONES / RECORDATORIOS (2026-08-21)
**Dolor #1 del usuario**: hoy le toca revisar manualmente a quién cobrar y **se le olvida** (ej.: los mantenimientos
de julio los terminó cobrando en agosto por olvido → se pierde/atrasa plata). La plataforma **debe avisarle proactivamente**.
El sistema debe notificar/recordar, como mínimo:
- **Mantenimiento web**: cuando un cliente entra a su **próximo ciclo (trimestral)** ese mes → "toca facturarle/cobrarle";
  avisar si sigue activo o no.
- **Cloud TRD**: renovación de **hosting/dominio** próxima a vencer (anual) → cobrar renovación.
- **Contratos de agencia (cuatrimestrales)**: vencimiento/renovación del contrato, próximos cobros mensuales.
- **REG/nómina**: recordatorio de pagos a colaboradores y del checklist pendiente.
- (Extensible a: cuotas del crédito Bancolombia, suscripciones/herramientas por renovar, comisiones CS/afiliados por pagar.)
Cada aviso debe permitir **marcar pagado / cobrado** o **dar de baja** si el cliente ya no sigue. Es transversal a
todos los módulos → conviene un **motor de recordatorios único** (calendario de vencimientos + estados) desde el inicio.

---

## Decisiones/insights de diseño (confirmados con el usuario)
1. Egreso con flag **"afecta utilidad del mes (sí/no)"** (caja/utilidad vs gasto variable real).
2. **Diezmo** = 10% de la utilidad, calculado automático.
3. La madre **jala los datos de Leadtion** ya existentes (no re-capturar): WhatsApp API, reselling,
   reservas, bono, membresías, Leadtion+afiliado.
4. **Nómina = fuente única** en la madre; Leadtion jala el % atribuido (Daniel 30%, etc.).
5. **Herramientas/hosting = rastreador de suscripciones** (recurrencia, próximas fechas, amortización).
6. **% de reparto** (arriendo/luz/internet/seguridad social) y **doble moneda** = config simple.
7. **Élite Mao** y transferencias LLC→Ebenezer = "paso de dinero / no utilidad" + registro de tesorería.
8. Estados de factura por color = semáforo (Pagado/Facturado/Anulado/Por facturar/Programado).
9. Indicador "(MES N)" en el precio = antigüedad/LTV del cliente recurrente (MRR).
10. **Contrato cuatrimestral (4 meses)** en los planes de agencia → base de **alertas de vencimiento/renovación**;
    cobro anticipado Stripe, mora 1%/sem, penalidad 30% por cancelar antes, reembolso solo 48h.
11. **Calculadora de retenciones** (REG): input valor + actividad CIIU → **ReteICA** (tarifa por mil × valor) y
    **ReteRenta** (tabla Art. 383 sobre base depurada, $0 si < 95 UVT) → **valor a girar**. Nómina = fuente única.
12. **Checklist de pago por colaborador/mes** (correo enviado · Drive · registro contable app · pagado) con
    **correo automático** al colaborador (valor cuenta de cobro, retención, valor girado).
13. **Costo de transferencia** bancario = gasto de Ebenezer, NO se descuenta al colaborador.

## Pestañas del Excel — estado del análisis
- **2026** ✅ · **Gastos Fijos TRD** ✅ · **Caja LLC** ✅ · **Caja Col** ✅ · **Precios** ✅ (+ 3 contratos) · **REG** ✅ ·
  **Cloud TRD** ✅ · **Mantenimiento y soporte web** ✅
- ✅ **REPASO DEL EXCEL COMPLETO (2026-08-21).** Siguiente fase: **acordar la arquitectura** de la plataforma madre.
- **LEADTION** = ya reflejada en la plataforma actual.
- **2022/2023/2024** = IGNORAR (solo 2026+).

## Cómo trabajar esta fase
- Es SOLO ANÁLISIS por ahora; NO construir hasta terminar de repasar pestañas y acordar arquitectura.
- Para leer el Excel: no hay Python; se instaló `xlsx` (SheetJS) en el scratchpad de la sesión.
  El archivo está en `C:/Users/ASUS/Downloads/INGRESOS - EGRESOS TRD AGENCY AGOSTO 2026.xlsx`.
