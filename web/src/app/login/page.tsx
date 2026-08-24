import { Logo, TrdLogo } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Iniciar sesión" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-wrap login-brand">
      <div className="login-card">
        <div className="login-logo">
          <TrdLogo height={44} variant="light" />
        </div>
        <h1>Iniciar sesión</h1>
        <p className="sub">Plataforma TRD Investment</p>

        <LoginForm error={error} />

        <div className="login-familia">
          <span>Casa de</span>
          <Logo height={18} variant="light" />
        </div>
      </div>
    </main>
  );
}
