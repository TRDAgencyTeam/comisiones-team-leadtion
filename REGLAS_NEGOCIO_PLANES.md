# Reglas de negocio — Planes, soporte e ingresos (LEADTION)

> Contexto de precios explicado por Mauro (2026-08-07). Fuente de verdad para
> LTV, ingresos y validaciones. **Confirmar si algo quedó mal entendido.**

## Membresía (licencia CRM)
- Base de **comisión**: $67 (antes de abr-2026) / $69 (desde abr-2026). No cambia.
- La membresía puede venir **incluida** dentro de otros cobros (soporte, planes).

## Planes de entrada (con qué entra el cliente)
Actualmente hay **dos** planes de entrada:

### 1) Agente IA
- **Mes 1:** el cliente paga **$847**.
- **Mes 2:** NO se le cobra membresía (hace parte de la garantía). **Pero al
  colaborador SÍ se le paga la membresía** (entró con plan especial).
- **Desde el mes 3:** el cliente elige un **plan de soporte**. Para Agente IA
  solo aplican **$119 o $157** (el de **$87 NO aplica**).
- De ahí en adelante se queda pagando ese soporte.

### 2) Reactivación de base de datos
- Plan de **90 días** para estrategia de reactivación dentro del sistema.
- Costo total **$991**, cobrado en 3 fases:
  - **Mes 1:** $597
  - **Mes 2:** $197
  - **Mes 3:** $197
- En los 3 meses la **licencia va incluida** y **al colaborador se le paga la
  licencia normal**.
- Desde el mes 4: el cliente elige quedarse con soporte **$119 o $157**, o
  **sin soporte** (solo membresía).

## Planes de soporte (desde el mes 3/4)
- Valores: **$87, $119, $157**.
- **La membresía ($69) ya está incluida** dentro del costo de soporte.
  (Ej.: si paga $119, dentro están los $69 de licencia.)
- Restricción: para **Agente IA** solo $119 o $157 (no $87).
- Si el cliente **no quiere soporte**, se queda solo con la membresía.

## Plan de marketing (otra área de la empresa)
- Si el cliente **entró con plan de marketing**, ya viene **con soporte** y **el
  cliente NO paga la licencia directamente**: se paga **dentro del plan de
  marketing** (corresponde a otra área). En la práctica es **como si la pagara**.
- A efectos de **comisión**, la cuenta cuenta igual (genera comisión).

## Implicaciones para la plataforma
- **Comisión**: se calcula sobre la base $67/$69 por fecha/hito, **independiente**
  de si el mes puntual se le cobró o no al cliente (el colaborador cobra igual en
  los meses de garantía). El motor ya lo hace así.
- **LTV / inversión del cliente**: se toma de lo realmente registrado en
  `pagos_mensuales.valor` (suma de cobros mensuales), que refleja $847, fases de
  reactivación, soporte, etc.
- **Ingresos** (dashboard): licencias (membresía) vs servicios complementarios
  (Agente IA, reactivación, soporte por encima de la membresía). Modelo a
  confirmar con el negocio antes de reportar cifras finas.
