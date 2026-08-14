---
name: retomar
description: Retomar el trabajo del proyecto LEADTION de forma barata (pocos tokens) al empezar una sesión nueva. Úsala tras /clear o cuando el usuario diga "retomemos", "¿dónde quedamos?", "sigamos donde íbamos".
---

# Retomar el proyecto LEADTION sin gastar tokens

Objetivo: reconstruir el contexto de dónde vamos **sin releer conversaciones
largas ni explorar todo el código**. Sé breve y barato.

Pasos:
1. Lee `ESTADO_DEL_PROYECTO.md` (la foto del proyecto: módulos, decisiones, siguiente paso).
2. Corre `git log --oneline -12` para ver los últimos avances reales.
3. Si el siguiente paso lo necesita, lee SOLO el/los archivo(s) de spec relevantes
   (`MODULO_CLIENTES_MEMBRESIAS.md`, `REGLAS_NEGOCIO_PLANES.md`) — no más.

Luego responde al usuario en **3–5 líneas**:
- Dónde quedamos (módulo y estado).
- Cuál es el siguiente paso pendiente.
- Una pregunta corta para arrancar (por dónde seguimos).

Reglas:
- NO releas la conversación anterior ni hagas exploración amplia del repo.
- NO reconstruyas todo el historial; el archivo de estado ya lo resume.
- Al terminar una sesión de trabajo (cuando el usuario lo pida o cierres una fase),
  **actualiza `ESTADO_DEL_PROYECTO.md`** con lo nuevo y su fecha.
