# Contexto de Traspaso — Plataforma de Comisiones CS (LEADTION)

> Este documento resume todo lo decidido hasta ahora sobre este proyecto, construido en conversación con el usuario (Mauro, dueño de TRD Agency). Pégalo al inicio de la sesión de Claude Code para arrancar sin perder contexto. La Fase 1 ya está completa y verificada; el siguiente paso es la Fase 2.

## 0. Quién y para qué

TRD Agency ofrece Leadtion, un **CRM** de marca blanca, a sus clientes realtors. Un equipo de Customer Success (CS) recibe comisión por gestionar la salud y retención de esos clientes, bajo un esquema de comisiones con reglas de fecha muy específicas por cliente y por colaborador — demasiado complejo para manejar de forma confiable a mano. El objetivo es una plataforma web que calcule esto automáticamente.

**Importante — terminología:** Leadtion es un CRM, no una VPN. Cuando un cliente aparece "incluido en plan de marketing" es porque adquirió un plan de marketing de la agencia que incluye el CRM sin cobro de licencia aparte — la cuenta sigue activa a efectos de comisión.

## 1. Stack técnico decidido

- **Tipo de plataforma:** web app.
- **Usuarios:** Admin (Mauro) + equipo de CS ahora; rol de Comercial contemplado desde el modelo de datos para una fase futura (aún no se construye su UI).
- **Hosting/infra:** el usuario ya tiene cuentas de **GitHub**, **Vercel** y **Supabase** — este es el stack objetivo. La Fase 1 se hizo en SQLite (portable, sin infraestructura) solo para validar la lógica; migrar el mismo esquema a **PostgreSQL vía Supabase** es directo (ver `schema.sql`, sintaxis estándar sin nada específico de SQLite salvo `AUTOINCREMENT`).
- **Orden de construcción confirmado:** motor de reglas de comisión primero, validado contra los casos de prueba de la Sección 6 de este documento, antes de construir cualquier pantalla.

## 2. Estado del proyecto

- ✅ **Fase 1 — Base de datos e histórico:** completa y verificada. Ver Sección 5 (esquema) y Sección 7 (archivos entregados).
- ⬜ **Fase 2 — Motor de reglas de comisión:** siguiente paso. Debe reproducir exactamente los casos de prueba de la Sección 6.
- ⬜ Fases 3-7: pendientes (panel Admin, aprobaciones, portal de colaborador, notificaciones, rol comercial + generación automática de cuenta de cobro). Detalle completo en `Hoja de Ruta - Plataforma de Comisiones CS.docx`.

## 3. Reglas de negocio (fuente de verdad: `POLÍTICA INTEGRAL DE COMISIONES - CS (T&C).docx`)

**Vigencia:** comisiones aplican a clientes activados desde el 1 de marzo de 2026. El monitoreo de salud (CHS) aplica desde octubre de 2025 sobre toda la base, sin importar si genera comisión.

**Categorías de colaborador (sin nombres en documentos distribuidos, pero sí en la base de datos interna):**
- *Miembro Fundador*: en el equipo desde el 1 de marzo de 2026. Comisiona sobre **todos** los clientes activados desde esa fecha en adelante. Hoy: Andrés Rodríguez y Daniel Franco.
- *Miembro Nuevo*: se incorpora después. Comisiona **solo** sobre clientes activados desde su propia fecha de ingreso en adelante — nunca retroactivo a marzo. Tiene 3 meses de prueba sin comisión (pero los clientes captados durante la prueba sí cuentan una vez confirmado). Hoy: Alejandro, ingreso 5 de mayo de 2026, prueba hasta el 5 de agosto de 2026, comisiona desde septiembre sobre clientes activados desde el 5 de mayo en adelante.

**Base de cálculo:** siempre $67 o $69 USD según la fecha de activación del cliente (antes de abril de 2026 = $67, desde abril de 2026 = $69), **sin importar** el valor total mostrado para ese cliente (puede ser $119, $157, $197 por servicios empaquetados — soporte, reactivación, agente IA). Si el valor es $0 y el cliente está cancelado, no hay licencia activa y no genera comisión.

**Barrera de 3 meses:** cliente que cancela antes de cumplir 90 días no genera comisión para nadie, nunca.

**Hitos (tasas vigentes, ya renegociadas de 10/5/10 a 5/5/10):**

| Hito | Corte | Comisión (por colaborador elegible) | CHS mínimo |
|---|---|---|---|
| Trimestre 1 | Mes 4 del cliente | 5% acumulado (meses 2, 3 y 4) | > 70 |
| Trimestre 2 | Mes 7 del cliente | 5% acumulado (meses 5, 6 y 7) | > 70 |
| Trimestre 3 | Mes 13 del cliente | 10% del valor anual | > 80 |

Los meses del hito son relativos a la fecha de activación **individual** del cliente, no al calendario. Cada colaborador elegible cobra el **100% del monto de cada hito de forma individual — no se divide entre el equipo**. Después del mes 13, el colaborador deja de comisionar por ese cliente pero sigue obligado a darle soporte.

**Penalidad de churn:** solo aplica a clientes que cancelan **después de su primer año**. Antes de aplicarla hay que documentar la causa: (a) producto/adopción, (b) atención/seguimiento, o (c) causa externa. La penalidad del 3% (acumulable) del total de comisión del mes **solo** aplica si la causa es (a) o (b), nunca si es (c).

**CHS (Customer Health Score):** por ahora es una encuesta mensual manual enviada al cliente; el admin debe aprobar el resultado antes de que se libere cualquier pago. La metodología de cálculo del puntaje aún no está definida — tratar como un campo editable por el admin, no como algo auto-calculable todavía.

## 4. Decisiones de datos ya resueltas

- **TRD Agency** y **Elite Agent** son cuentas internas de la agencia (marcas propias), **no clientes reales** — excluidas por completo de la base, confirmado por el usuario.
- Mapeo de color del Excel original a estado mensual:
  - Verde (`FF00FF00`) → activo, cobro normal.
  - Rojo (`FFFF0000`) → cancelado.
  - Celeste (`FF00FFFF`) → activo, CRM incluido en plan de marketing, sin cobro de licencia aparte (sí genera comisión igual).
  - Naranja (`FFFF9900`) → estado ambiguo tipo "en riesgo/mora" (solo 2 casos en todo el histórico) — tratar con precaución, confirmar con el usuario si aparece más.
  - Gris (`FF666666`) → mes previo a la activación real del cliente, sin datos.
- Meses futuros al "hoy" de la migración no deben usarse para determinar el estado actual del cliente (el Excel rellena el futuro en rojo/cero por defecto, no es una cancelación real).

## 5. Esquema de base de datos (Fase 1, ver `schema.sql` completo)

- **`clientes`**: nombre, plan, fecha_activacion, estado_actual, fecha_cancelacion, valor_licencia_general, incluye_crm_en_marketing, servicios_adicionales, ltv_acumulado, notas.
- **`pagos_mensuales`**: cliente_id, mes, valor, estado_mes (activo / cancelado / incluido_en_marketing / en_riesgo_o_mora / previo_a_activacion / sin_datos).
- **`colaboradores`**: nombre, rol (admin/cs/comercial), categoria (fundador/nuevo), fecha_ingreso, fecha_fin_prueba.

Datos ya cargados (verificados contra el Excel original):
- 62 clientes reales, histórico completo desde noviembre de 2025.
- 42 activos al 5 de agosto de 2026. Facturación de licencia de agosto: $3,548.
- 24 clientes elegibles a comisión (activados desde marzo 2026). 16 de ellos en el cohorte marzo-mayo (primer ciclo).
- Colaboradores: Andrés Rodríguez (fundador, marzo 2026), Daniel Franco (fundador, marzo 2026), Alejandro (nuevo, 5 mayo 2026), Mauro (admin).

## 6. Casos de prueba ya calculados a mano — el motor de reglas de la Fase 2 debe reproducir exactamente estos números

**Corte de referencia: 5 de agosto de 2026.**

**Andrés Rodríguez y Daniel Franco (fundadores) — Trimestre 1:**
12 de los 16 clientes del cohorte marzo-mayo ya alcanzaron su mes 4. 2 cancelaron antes de llegar (Constantino Trimarchi, Iris Mar Aguilera → $0). 2 de mayo aún no llegan a su mes 4 (Yolanda Uzeta, Katherine Osorio → pendientes).
- 6 clientes de marzo × $10.05 (5% × 3 × $67) = $60.30
- 6 clientes de abril × $10.35 (5% × 3 × $69) = $62.10
- **Total por colaborador: $122.40** (cada uno de los dos cobra este monto completo, de forma independiente).

**Alejandro (nuevo, ingreso 5 mayo 2026) — primer pago, inicios de septiembre, cubriendo agosto:**
Ventana de elegibilidad: clientes activados desde el 5 de mayo de 2026.
- Yolanda Uzeta (mes 4 = 11 ago) y Katherine Osorio (mes 4 = 18 ago): ya cruzaron su corte → $10.35 c/u = **$20.70** garantizados.
- Melida Cabral (mes 4 = 3 sep): solo cuenta si el pago se procesa el 3, 4 o 5 de septiembre, no el 1 o 2 → +$10.35 si aplica.
- **Total esperado: $20.70 a $31.05**, dependiendo del día exacto de pago.
- El resto de su cartera (Carolina Quijano, María José Río, Biviana Gutiérrez, Liliana Bustamante, Sara Pineda, Maria Quintanilla, Verónica Valencia) aún no llega a su mes 4 — quedan para el siguiente corte.

Todos estos cálculos asumen CHS > 70 aprobado — como el CHS real aún no existe, el motor debe tratarlo como un campo pendiente/aprobable, no bloquear el cálculo de referencia.

## 7. Archivos entregados hasta ahora (carpeta de salida de esta conversación)

- `POLÍTICA INTEGRAL DE COMISIONES - CS (T&C).docx` — el contrato/términos formal, fuente de verdad de las reglas.
- `Plantilla Cuenta de Cobro - Comisiones CS.xlsx` — plantilla que los colaboradores diligencian para radicar su comisión (Excel con fórmulas).
- `Hoja de Ruta - Plataforma de Comisiones CS.docx` — el roadmap completo de 7 fases.
- `db_build/schema.sql`, `db_build/migrate.py`, `db_build/seed_colaboradores.py`, `db_build/comisiones_cs.db` — el trabajo de Fase 1.

## 8. Próximo paso inmediato para Claude Code

Construir el motor de reglas de comisión (Fase 2) sobre el esquema de la Sección 5, con una función que reciba (colaborador, mes de corte) y devuelva la lista de clientes elegibles con su monto, replicando exactamente los números de la Sección 6. Sugerido: escribir esos casos como pruebas automatizadas (unit tests) antes de tocar cualquier interfaz, tal como se acordó en el roadmap.
