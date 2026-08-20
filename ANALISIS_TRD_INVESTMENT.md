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

## Pestañas del Excel — estado del análisis
- **2026** ✅ analizada · **Gastos Fijos TRD** ✅ analizada
- Pendientes de que el usuario dé contexto: **Precios** (catálogo servicios agencia), **Caja LLC**
  (USD por entidad), **Caja Col** (COP: nómina, IVA, retenciones), **REG** (registro contable/pagos/
  nómina, retenciones, girado, pagado), **Cloud TRD** (clientes hosting/dominio), **Mantenimiento y
  soporte web** (WordPress trimestral).
- **LEADTION** = ya reflejada en la plataforma actual.
- **2022/2023/2024** = IGNORAR (solo 2026+).

## Cómo trabajar esta fase
- Es SOLO ANÁLISIS por ahora; NO construir hasta terminar de repasar pestañas y acordar arquitectura.
- Para leer el Excel: no hay Python; se instaló `xlsx` (SheetJS) en el scratchpad de la sesión.
  El archivo está en `C:/Users/ASUS/Downloads/INGRESOS - EGRESOS TRD AGENCY AGOSTO 2026.xlsx`.
