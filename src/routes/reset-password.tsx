import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => seo("Redefinir senha", "Defina uma nova senha para sua conta da A.S.G."),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // O link de recuperação chega com type=recovery no hash da URL.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") === "recovery") {
      setReady(true);
      return;
    }
    // Em alguns fluxos a sessão de recuperação já está ativa.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setInvalid(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada! Entre com a nova senha.");
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHero eyebrow="Conta" title="Redefinir senha">
        Defina uma nova senha para acessar sua conta.
      </PageHero>
      <Section className="flex justify-center">
        <Card className="w-full max-w-md">
          {invalid ? (
            <div className="py-6 text-center">
              <h2 className="text-2xl">Link inválido ou expirado</h2>
              <p className="mt-2 text-muted-foreground">
                Solicite um novo link de redefinição na página de entrada.
              </p>
              <button className="btn-ghost-stamp mt-6" onClick={() => navigate({ to: "/auth" })}>
                Ir para entrar
              </button>
            </div>
          ) : !ready ? (
            <p className="py-6 text-center text-muted-foreground">Verificando link…</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="eyebrow">Nova senha</span>
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
              <label className="block">
                <span className="eyebrow">Repita a nova senha</span>
                <input
                  required
                  type="password"
                  minLength={6}
                  maxLength={72}
                  className="field mt-1"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                />
              </label>
              <button disabled={busy} className="btn-stamp w-full justify-center disabled:opacity-60">
                {busy ? "Aguarde…" : "Salvar nova senha"}
              </button>
            </form>
          )}
        </Card>
      </Section>
    </>
  );
}
