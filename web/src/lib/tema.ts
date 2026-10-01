/** Clave en localStorage del tema elegido (claro/oscuro). Sin valor = igual que el sistema. */
export const CLAVE_TEMA = "trd-tema";

/** Script inline para <head>: aplica el tema guardado antes del primer pintado (sin parpadeo). */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CLAVE_TEMA}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
