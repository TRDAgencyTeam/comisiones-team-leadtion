import Link from "next/link";

/** Datos que el formulario puede precargar (para editar). */
export interface ClienteFormData {
  id: number;
  nombre: string;
  fechaActivacion: string | null;
  planTipo: "agente_ai" | "reactivacion" | null;
  soporteValor: number | null;
  incluyeCrmMarketing: boolean;
  valorLicencia: number | null;
}

/**
 * Formulario compartido para crear/editar un cliente. Sin JS de cliente.
 * Los campos comerciales (plan de entrada, soporte, marketing) permiten reflejar
 * el estado real del cliente en el sistema.
 */
export function ClienteForm({
  action,
  cliente,
  error,
  textoBoton,
}: {
  action: (formData: FormData) => void;
  cliente?: ClienteFormData;
  error?: string;
  textoBoton: string;
}) {
  return (
    <form action={action} className="form-vert">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <label>
        Nombre del cliente *
        <input type="text" name="nombre" required defaultValue={cliente?.nombre ?? ""} autoFocus />
      </label>
      <label>
        Fecha de activación *
        <input type="date" name="fechaActivacion" required defaultValue={cliente?.fechaActivacion ?? ""} />
        <small>Determina desde cuándo genera comisión y sus hitos.</small>
      </label>
      <label>
        Plan con que entró / plan actual
        <select name="planTipo" defaultValue={cliente?.planTipo ?? ""}>
          <option value="">— Sin especificar</option>
          <option value="agente_ai">Agente AI (entra pagando $847)</option>
          <option value="reactivacion">Reactivación ($991 en 3 fases)</option>
        </select>
      </label>
      <label>
        Soporte activo
        <select name="soporteValor" defaultValue={cliente?.soporteValor?.toString() ?? ""}>
          <option value="">— Sin soporte (solo membresía)</option>
          <option value="87">Soporte $87</option>
          <option value="119">Soporte $119</option>
          <option value="157">Soporte $157</option>
        </select>
        <small>El soporte ya incluye la membresía. Para Agente IA solo aplican $119 o $157.</small>
      </label>
      <label className="check-label">
        <input type="checkbox" name="marketing" value="1" defaultChecked={cliente?.incluyeCrmMarketing ?? false} />
        Está en plan de marketing (la licencia se paga dentro del plan de mkt)
      </label>
      <label>
        Valor mostrado (opcional)
        <input type="number" name="valorLicencia" step="0.01" defaultValue={cliente?.valorLicencia?.toString() ?? ""} placeholder="Ej. 197" />
        <small>Solo referencia. La base de comisión es $67/$69 según la fecha.</small>
      </label>

      {error && <p className="login-error">{error}</p>}

      <div className="form-actions">
        <Link href={cliente ? `/clientes/${cliente.id}` : "/clientes"} className="btn-secondary">
          Cancelar
        </Link>
        <button type="submit" className="btn-primary">{textoBoton}</button>
      </div>
    </form>
  );
}
