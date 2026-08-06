# Motor de Comisiones CS (LEADTION) — Fase 2

Motor de reglas de comisión para el equipo de Customer Success de TRD Agency.
Reproduce **exactamente** los casos calculados a mano de la Sección 6 del
documento `CONTEXTO_TRASPASO_CLAUDE_CODE.md`.

## Qué hace

Dada una tripleta `(colaborador, universo de clientes, fecha de corte)`, devuelve
la lista de clientes elegibles con el monto de comisión por cada hito alcanzado,
más los clientes excluidos y el motivo. Es una **función pura** — no depende de
la base de datos — para poder validarla con pruebas y reusarla en Vercel.

### Reglas implementadas (fuente: política de comisiones T&C)

- **Vigencia:** solo clientes activados desde `2026-03-01`.
- **Ventana por categoría de colaborador:**
  - `fundador` → todos los clientes desde `2026-03-01`.
  - `nuevo` → solo clientes desde su `fecha_ingreso` (nunca retroactivo).
- **Base de licencia por fecha de activación:** `$67` antes de abril 2026, `$69`
  desde abril 2026 — sin importar el valor mostrado del cliente.
- **Hitos** (relativos a la activación individual de cada cliente):

  | Hito | Corte (mes del cliente) | Fecha del hito | Comisión | CHS mín. |
  |------|-------------------------|----------------|----------|----------|
  | T1 | Mes 4 | activación + 3 meses | 5% × 3 × base | > 70 |
  | T2 | Mes 7 | activación + 6 meses | 5% × 3 × base | > 70 |
  | T3 | Mes 13 | activación + 12 meses | 10% × 12 × base | > 80 |

  Cada colaborador elegible cobra el **100%** de cada hito, de forma independiente
  (no se divide entre el equipo).
- **Barrera de 90 días:** cliente que cancela antes de 90 días no comisiona para
  nadie, nunca.
- **CHS:** aún no existe (encuesta manual aprobada por el admin). Por defecto es
  `pendiente` y **no bloquea** el cálculo de referencia. Se puede exigir con
  `bloquearPorChs: true`.

## Casos de la Sección 6 (verificados por las pruebas)

| Colaborador | Corte | Total | Detalle |
|-------------|-------|-------|---------|
| Andrés Rodríguez (fundador) | 2026-08-05 | **$122.40** | 6×$10.05 (marzo) + 6×$10.35 (abril) |
| Daniel Franco (fundador) | 2026-08-05 | **$122.40** | idéntico e independiente |
| Alejandro (nuevo) | 2026-09-02 | **$20.70** | Yolanda + Katherine |
| Alejandro (nuevo) | 2026-09-05 | **$31.05** | + Melida (mes 4 = 03-sep) |

## Uso

```bash
cd engine
npm install
npm test           # 27 pruebas (motor puro + integración contra la DB real)
npm run typecheck  # verificación de tipos
npm run reporte    # imprime el cálculo de la Sección 6 por consola
```

> Requiere **Node ≥ 22** (usa el builtin `node:sqlite`, cargado con
> `--experimental-sqlite` — ya incluido en los scripts npm).

### En código

```ts
import { calcularComision, FuenteSQLite } from "comisiones-cs-engine";

const fuente = new FuenteSQLite("comisiones_cs.db");
const clientes = fuente.cargarClientes();
const andres = fuente.colaboradorPorNombre("Andrés Rodríguez")!;

const r = calcularComision(andres, clientes, "2026-08-05");
console.log(r.total); // 122.4
```

## Estructura

```
engine/
  src/
    types.ts        Tipos de dominio
    dates.ts        Aritmética de fechas (meses calendario de los hitos)
    rules.ts        MOTOR DE REGLAS (núcleo puro)
    db.ts           Cargador SQLite (Fase 1)
    db.postgres.ts  Adaptador Postgres/Supabase (producción)
    cli.ts          Reporte por consola
    index.ts        API pública
  test/
    fixtures.ts        Datos de la Sección 6
    rules.test.ts      23 pruebas del motor puro
    integration.test.ts 4 pruebas contra comisiones_cs.db real
supabase/
  migrations/0001_init_schema.sql  Esquema Fase 1 → Postgres
  migrations/0002_comisiones.sql   Tablas de operación (CHS, liquidación)
  seed/0003_seed_data.sql          Datos reales (62 clientes, 868 pagos, 4 colab.)
```

## Migración a Supabase y despliegue en Vercel

Ver [`../DESPLIEGUE.md`](../DESPLIEGUE.md) para los pasos completos y qué
credenciales se necesitan.
