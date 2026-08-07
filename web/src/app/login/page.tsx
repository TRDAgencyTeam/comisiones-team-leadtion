import { Logo } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

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
          <Logo height={34} />
        </div>
        <h1>Portal Colaboradores</h1>
        <p className="sub">Customer Success · TRD Agency</p>

        <LoginForm error={error} />
      </div>
    </main>
  );
}
