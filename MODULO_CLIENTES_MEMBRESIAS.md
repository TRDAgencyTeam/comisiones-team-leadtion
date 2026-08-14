# Módulo "Clientes / Membresías" — Especificación (confirmada 2026-08-13)

Maestro de clientes de Leadtion + P&L mensual. Es la **fuente madre**: de aquí
se alimenta Comisiones CS (mismos clientes, sin duplicar) y Afiliados. Reemplaza
el Excel "INGRESOS - EGRESOS TRD AGENCY".

## Arquitectura
- **Una sola tabla maestra de clientes** (extiende la `clientes` que ya usa CS).
  Comisiones CS lee de aquí. No se duplica.
- Moneda: ingresos en **USD**; sueldos en **COP** → convertir con la **tasa del
  día** (open.er-api.com / exchangerate-api, ~$3.140 COP/USD hoy), cacheada por día.

## Catálogo de planes
Licencia estándar **$69/mes** (incluye API WhatsApp, costo $10 → ganancia $59).

| Plan de entrada | Precio | Después |
|---|---|---|
| Agente AI | Mes 1 $847 · Mes 2 $0 (garantía, sin licencia ni soporte) · Mes 3+ soporte $119/$157 | soporte |
| Reactivación Base P2P | **Mes 1 $597** · Mes 2 $197 · Mes 3 $197 | soporte $119/$157 o solo licencia $69 |
| Level Up | $497 | soporte $87/$119/$157 |

Soporte (todos incluyen licencia $69):
- Básico: incluido en la licencia $69 (sin extra).
- Estándar $87 → solo Level Up.
- Avanzado $119 → solo Agente AI y Reactivación.
- Premium $157 → exclusivo Agente AI y Reactivación.

## Cliente — al crear/activar (se pregunta)
- Tipo: estándar o **agencia** (licencia FREE vía plan de Ads de la agencia;
  cuenta activa sin pagar licencia aparte; suele traer Ads+AI+CRM; puede sumar
  otros servicios, p.ej. reactivación con descuento).
- Plan de entrada + soporte.
- **API WhatsApp**: activa (sí/no) y si es de las **vendidas a $12** (ganancia $2;
  las incluidas se pagan a costo $10).
- Si **Reactivación**: **bono** de billetera $50 o $100 (costo, una sola vez).
- **¿Recomendado?** → afiliado (agencia/partner) y de quién → sincroniza Afiliados.
- **Personas asignadas** (Andrés/Daniel/Alejandro) → comisión CS.
- **Reserva** (protección de precio): paga $100, 14 días para empezar; excedente
  AI +$747, Reactivación +$497. Se crea ya, pero **inicia al pagar el excedente**.
- Estados: activo · pausar/congelar (temporal) · cancelar.

## Ingresos del mes
Licencias, servicios especiales (AI/Reactivación/Level Up), soportes, APIs
vendidas ($2 c/u) y **reselling** (variable; se reporta manual a fin de mes).

## Costos/Egresos del mes (convertir COP→USD)
- Nómina parte Leadtion: Andrés $4.900.000 COP ×60% · Daniel $4.500.000 ×100% ·
  Alejandro $3.300.000 ×100% (+ comisiones).
- Comisiones (CS + afiliados/partners).
- GoHighLevel **$497/mes** fijo.
- APIs WhatsApp incluidas ($10 c/u, a costo).
- Bonos de reactivación ($50–$100 por cliente).

## Dashboard / métricas
Cuentas activas · ingreso mes · costo mes · **ganancia neta** · LTV por cliente
(licencia + servicios) · tiempo con nosotros · **total histórico** de clientes ·
costo/ganancia de APIs.

## Sincronización
Crear cliente aquí → aparece en Comisiones CS (con personas asignadas) y, si vino
recomendado, en Afiliados (con su afiliado). Comercial se ve después.

## Pendiente de definir al construir
- Tasa COP→USD: fuente diaria cacheada; permitir override manual.
- Descuento específico de reactivación cuando el cliente ya tiene otro servicio.
- Cómo se reparten las comisiones (ya existe la lógica en CS).
