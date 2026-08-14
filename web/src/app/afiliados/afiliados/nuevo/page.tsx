import Link from "next/link";
import { crearAfiliado } from "../../acciones";

export const dynamic = "force-dynamic";

export default async function NuevoAfiliadoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="wrap">
      <p className="volver"><Link href="/afiliados/afiliados">← Afiliados</Link></p>
      <header className="page"><h1>Nuevo afiliado</h1></header>

      <section className="card">
        <form action={crearAfiliado} className="form-vert">
          <div className="form-2col">
            <label>Nombre *<input type="text" name="nombre" required autoFocus placeholder="Nombre completo" /></label>
            <label>Email<input type="email" name="email" placeholder="correo@email.com" /></label>
          </div>
          <div className="form-2col">
            <label>
              Tipo de afiliado
              <select name="tipo" defaultValue="agencia">
                <option value="agencia">Agencia</option>
                <option value="partner">Partner</option>
              </select>
            </label>
            <label>Mes de ingreso<input type="date" name="ingreso" /></label>
          </div>

          <div className="nota-info">
            <b>Comisión.</b> Agencia: mes 1 = % sobre el servicio vendido; meses 2 y 3 = % por
            nivel sobre la licencia. Partner: % por nivel los 3 meses (1-3 clientes 30%,
            4-6 40%, 7+ 50%).
          </div>

          <label>
            % Comisión sobre servicios (solo agencia, mes 1)
            <input type="number" name="comision_agencia" step="0.1" placeholder="Ej: 5 o 10" />
          </label>
          <label>Notas<input type="text" name="notas" placeholder="Opcional" /></label>

          {error && <p className="login-error">{error}</p>}
          <div className="form-actions">
            <Link href="/afiliados/afiliados" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </section>
    </main>
  );
}
