import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-wrap">
      <div className="login-card">
        <h1>Comisiones CS</h1>
        <p className="sub">Panel de administración · TRD Agency</p>

        <form action={login} className="login-form">
          <label>
            Email
            <input type="email" name="email" required autoComplete="email" autoFocus />
          </label>
          <label>
            Contraseña
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit">Entrar</button>
        </form>
      </div>
    </main>
  );
}
