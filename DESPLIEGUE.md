# Despliegue — Supabase (base de datos) y Vercel (app)

Este documento describe cómo llevar el esquema y los datos de la Fase 1 a
**Supabase** (PostgreSQL en producción) y cómo conectar **Vercel** para el
despliegue de la app en fases posteriores.

> ⚠️ **Qué necesito de ti (Mauro):** por seguridad no creo cuentas ni ingreso
> credenciales por ti. Los pasos que requieren tu contraseña/tokens los haces tú
> (marcados con 🔑). Yo dejo listos los archivos SQL y la configuración.

---

## Parte A — Supabase (migrar el esquema y los datos)

Tienes dos caminos. **El más simple es el SQL Editor** (no requiere instalar nada).

### Opción 1 — SQL Editor del panel de Supabase (recomendada para arrancar)

1. 🔑 Entra a <https://supabase.com/dashboard> y crea (o abre) el proyecto de
   comisiones. Anota:
   - **Project URL** (ej. `https://xxxx.supabase.co`)
   - **Project Ref** (el `xxxx`)
   - **Database password** (la que definiste al crear el proyecto)
2. Abre **SQL Editor → New query** y ejecuta, en este orden, el contenido de:
   1. `supabase/migrations/0001_init_schema.sql`
   2. `supabase/migrations/0002_comisiones.sql`
   3. `supabase/seed/0003_seed_data.sql`
3. Verifica en **Table Editor**: `clientes` = 62 filas, `pagos_mensuales` = 868,
   `colaboradores` = 4.

### Opción 2 — Supabase CLI (reproducible, ideal para el repo)

```bash
# 🔑 requiere iniciar sesión una vez (abre el navegador)
npx supabase login

# enlazar el repo con tu proyecto (te pedirá la DB password)
npx supabase link --project-ref TU_PROJECT_REF

# aplicar migraciones y seed
npx supabase db push
```

> Nota: la CLI toma las migraciones de `supabase/migrations/`. El seed
> (`supabase/seed/0003_seed_data.sql`) se puede ejecutar con
> `psql "$DATABASE_URL" -f supabase/seed/0003_seed_data.sql` o pegándolo en el
> SQL Editor.

### Verificación del motor contra Supabase (opcional)

Con la base ya poblada, el motor puede leer de Postgres usando el adaptador
`FuentePostgres`. Ejemplo con `pg`:

```ts
import { Pool } from "pg";
import { FuentePostgres, calcularComision } from "comisiones-cs-engine";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const consulta = async (sql, params) => (await pool.query(sql, params)).rows;
const fuente = new FuentePostgres(consulta);

const clientes = await fuente.cargarClientes();
const colaboradores = await fuente.cargarColaboradores();
const andres = colaboradores.find((c) => c.nombre === "Andrés Rodríguez")!;
console.log(calcularComision(andres, clientes, "2026-08-05").total); // 122.4
```

### Seguridad (RLS)

Supabase habilita **Row Level Security** por defecto en tablas nuevas expuestas
por la API. Mientras el acceso sea solo de servidor (service_role desde Vercel),
no hace falta política pública. Cuando se construya la UI con login de CS/admin,
definiremos políticas por rol. **No expongas la `service_role key` en el
frontend.**

---

## Parte B — Vercel (despliegue de la app, fase posterior)

La Fase 2 es solo el motor (sin UI todavía). Cuando construyamos las pantallas
(Fase 3+), el despliegue en Vercel será:

1. 🔑 Sube el repositorio a **GitHub** (privado).
2. 🔑 En <https://vercel.com> → **Add New → Project** → importa ese repo.
3. Configura las **Environment Variables** en Vercel (Settings → Environment
   Variables), tomadas de Supabase (Project Settings → API / Database):
   - `DATABASE_URL` — cadena de conexión de Postgres (usar el **pooler** de
     Supabase para serverless).
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` — solo en variables de servidor, nunca en el
     cliente.
   - `SUPABASE_ANON_KEY` — para el cliente autenticado (cuando haya UI).
4. Deploy. Vercel reconstruye en cada push a la rama principal.

Ver `.env.example` para la lista de variables.

> 🔑 **Alternativamente**, si me compartes los valores de conexión (o me dices
> que ejecute `npx supabase login` / `npx vercel login` y completas el paso del
> navegador tú), puedo dejar el enlace y las variables configuradas y correr la
> verificación del motor contra tu Supabase real.

---

## Estado actual

- ✅ Esquema Fase 1 traducido a Postgres (`0001`).
- ✅ Tablas de operación del motor (`0002`).
- ✅ Seed con datos reales generado (`0003`).
- ✅ Adaptador Postgres listo (`engine/src/db.postgres.ts`).
- ✅ **Migraciones + seed aplicados en Supabase** (proyecto `Comisiones Team Leadtion`,
  ref `ugrrmolthrysefqaqmse`, región `us-west-2`). Conteos verificados:
  clientes=62, pagos=868, colaboradores=4.
- ✅ **Motor verificado contra Supabase real**: los 4 casos de la Sección 6 pasan
  ($122.40 / $122.40 / $20.70 / $31.05). Reejecutar con `npm run db:verify`.
- ⬜ Enlazar Vercel (fase de UI).

> 🔒 La contraseña de la base se compartió por chat para esta migración. Si
> quieres, ya puedes **rotarla** en Supabase (Settings → Database → Reset
> database password); no afecta lo ya migrado.
