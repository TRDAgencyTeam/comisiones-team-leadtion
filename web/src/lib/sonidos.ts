/**
 * Sonidos de la plataforma, sintetizados con Web Audio (sin archivos):
 *  - "ok":   ding suave de dos notas tipo iPhone (al actualizar algo).
 *  - "caja": "ka-ching" de caja registradora (al agregar un ingreso / cliente).
 * Los navegadores solo dejan sonar audio después de un clic o tecla: el contexto
 * se crea/reanuda en la primera interacción (`prepararSonidos`).
 */
export type Sonido = "ok" | "caja";

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Deja el audio listo en la primera interacción del usuario (requisito del navegador). */
export function prepararSonidos() {
  const listo = () => { contexto(); window.removeEventListener("pointerdown", listo); window.removeEventListener("keydown", listo); };
  window.addEventListener("pointerdown", listo);
  window.addEventListener("keydown", listo);
}

/** Una nota con ataque rápido y caída exponencial. */
function nota(c: AudioContext, freq: number, t0: number, dur: number, vol: number, tipo: OscillatorType = "sine") {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

/** Ding de dos notas ascendentes, limpio y corto (estilo notificación de iPhone). */
function ding(c: AudioContext) {
  const t = c.currentTime + 0.01;
  nota(c, 1318.5, t, 0.32, 0.12);          // Mi6
  nota(c, 2637, t, 0.18, 0.025);           // brillo (armónico)
  nota(c, 1760, t + 0.11, 0.55, 0.12);     // La6
  nota(c, 3520, t + 0.11, 0.25, 0.02);
}

/** "Ka-ching": golpe mecánico (ruido filtrado) + campana metálica con parciales inarmónicos. */
function caja(c: AudioContext) {
  const t = c.currentTime + 0.01;
  // "Ka": cajón/palanca — ráfaga corta de ruido con filtro pasa-banda.
  const len = Math.floor(c.sampleRate * 0.06);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const ruido = c.createBufferSource();
  ruido.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 1.2;
  const gr = c.createGain(); gr.gain.value = 0.5;
  ruido.connect(bp).connect(gr).connect(c.destination);
  ruido.start(t);
  // "Ching": campana — dos golpes rápidos con parciales metálicos.
  const parciales = [2093, 2793, 3520, 4699, 5588];
  for (const [k, dt] of [0.07, 0.16].entries()) {
    parciales.forEach((f, i) => nota(c, f * (k ? 1.003 : 1), t + dt, 1.1 - i * 0.15, (k ? 0.07 : 0.05) / (i + 1), i % 2 ? "triangle" : "sine"));
  }
}

export function sonar(s: Sonido) {
  const c = contexto();
  if (!c) return;
  try { if (s === "caja") caja(c); else ding(c); } catch { /* sin audio: no pasa nada */ }
}
