import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { safeRedirect, useSession } from "@/lib/auth";
import { seo } from "@/lib/seo";

type AuthSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => seo("Entrar", "Acesse sua conta da A.S.G. ou crie uma nova para solicitar associação."),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectTarget } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [mode, setMode] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!loading && user) {
    navigate({ to: safeRedirect(redirectTarget) });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
      } else if (mode === "criar") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim().slice(0, 100) },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setConfirmSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: safeRedirect(redirectTarget) });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Conta"
        title={mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Recuperar senha"}
      >
        {mode === "entrar"
          ? "Acesse a área do associado e acompanhe sua solicitação."
          : mode === "criar"
            ? "Crie sua conta para enviar a solicitação de associação."
            : "Informe seu e-mail para receber o link de redefinição de senha."}
      </PageHero>
      <Section className="flex justify-center">
        <Card className="w-full max-w-md">
          {confirmSent ? (
            <div className="py-6 text-center">
              <h2 className="text-2xl">Confira seu e-mail</h2>
              <p className="mt-2 text-muted-foreground">
                Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta e
                depois entre aqui.
              </p>
              <button className="btn-ghost-stamp mt-6" onClick={() => { setConfirmSent(false); setMode("entrar"); }}>
                Voltar para entrar
              </button>
            </div>
          ) : resetSent ? (
            <div className="py-6 text-center">
              <h2 className="text-2xl">Link enviado</h2>
              <p className="mt-2 text-muted-foreground">
                Se existir uma conta com <strong>{email}</strong>, você receberá um link para definir uma nova senha.
              </p>
              <button className="btn-ghost-stamp mt-6" onClick={() => { setResetSent(false); setMode("entrar"); }}>
                Voltar para entrar
              </button>
            </div>
          ) : (
            <>
              {mode !== "recuperar" && (
                <div className="mb-6 grid grid-cols-2 gap-2">
                  <button
                    className={mode === "entrar" ? "btn-stamp justify-center" : "btn-ghost-stamp justify-center"}
                    onClick={() => setMode("entrar")}
                  >
                    Entrar
                  </button>
                  <button
                    className={mode === "criar" ? "btn-stamp justify-center" : "btn-ghost-stamp justify-center"}
                    onClick={() => setMode("criar")}
                  >
                    Criar conta
                  </button>
                </div>
              )}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "criar" && (
                  <label className="block">
                    <span className="eyebrow">Nome completo</span>
                    <input
                      required
                      maxLength={100}
                      className="field mt-1"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </label>
                )}
                <label className="block">
                  <span className="eyebrow">E-mail</span>
                  <input
                    required
                    type="email"
                    maxLength={255}
                    className="field mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Senha</span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    maxLength={72}
                    className="field mt-1"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button disabled={busy} className="btn-stamp w-full justify-center disabled:opacity-60">
                  {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
                </button>
              </form>
            </>
          )}
        </Card>
      </Section>
    </>
  );
}
