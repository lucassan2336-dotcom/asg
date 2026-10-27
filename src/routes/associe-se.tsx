import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { useSession } from "@/lib/auth";
import { seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge } from "@/components/ApplicationStatus";
import { membershipSchema } from "@/lib/membership";

export const Route = createFileRoute("/associe-se")({
  head: () =>
    seo(
      "Como se associar",
      "Solicite sua associação à A.S.G. Cada pedido é analisado pela diretoria.",
    ),
  component: AssocieSe,
});

function AssocieSe() {
  const { user, loading } = useSession();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [motivation, setMotivation] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const {
    data: existing,
    refetch,
    isLoading: checking,
    error: lookupError,
  } = useQuery({
    queryKey: ["my-application", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("membership_applications")
        .select("id, status, created_at, reviewed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setFormError("");
    const parsed = membershipSchema.safeParse({
      full_name: fullName,
      email: user.email ?? "",
      phone,
      birth_date: birthDate,
      motivation,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Revise os campos do formulário.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("membership_applications").insert({
        user_id: user.id,
        ...parsed.data,
        phone: parsed.data.phone || null,
        motivation: parsed.data.motivation || null,
      });
      if (error) {
        if (error.code === "23505") {
          await refetch();
          setFormError(
            "Já existe uma solicitação registrada para esta conta. Você pode consultar sua situação abaixo.",
          );
        } else if (error.message?.includes("Confirme o e-mail")) {
          setFormError("Confirme o e-mail da sua conta antes de solicitar associação.");
        } else {
          setFormError(
            "Não foi possível enviar a solicitação. Confira seus dados e tente novamente.",
          );
        }
        return;
      }
      setSent(true);
      await refetch();
      toast.success("Solicitação recebida com sucesso! Aguarde a análise da diretoria.");
    } catch {
      setFormError("Não foi possível conectar ao servidor. Tente novamente em instantes.");
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    "Crie e confirme sua conta",
    "Preencha a solicitação de associação",
    "Análise confidencial pela diretoria",
    "Resultado seguro e acesso ao quadro",
  ];

  return (
    <>
      <PageHero eyebrow="Faça parte da A.S.G." title="Como se associar">
        Junte-se à Associação dos Skatistas de Guararema. Cada solicitação é registrada com status{" "}
        <strong>Pendente</strong> e avaliada com responsabilidade pela diretoria.
      </PageHero>
      <Section className="grid gap-10 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-olive font-display text-cream">
                  {i + 1}
                </span>
                <span className="font-condensed text-lg font-bold uppercase">{s}</span>
              </li>
            ))}
          </ol>

          <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-olive shrink-0" />
              <span>Privacidade e Segurança</span>
            </div>
            <p>
              Solicitamos apenas dados essenciais para o processo associativo (nome, e-mail,
              nascimento e contato).{" "}
              <strong>Não solicitamos documentos sensíveis por padrão</strong>.
            </p>
          </div>
        </div>

        <Card>
          {loading || checking ? (
            <p className="py-8 text-center text-muted-foreground">Carregando informações…</p>
          ) : !user ? (
            <div className="py-8 text-center">
              <h2 className="text-2xl">Primeiro, acesse sua conta</h2>
              <p className="mt-2 text-muted-foreground">
                Sua solicitação fica vinculada com segurança ao seu perfil para que somente você e a
                diretoria possam acompanhá-la.
              </p>
              <Link
                to="/auth"
                search={{ redirect: "/associe-se" }}
                className="btn-stamp mt-6 inline-flex"
              >
                Entrar ou criar conta
              </Link>
            </div>
          ) : lookupError ? (
            <div role="alert" className="py-6 text-center space-y-4">
              <p className="text-destructive">
                Não foi possível consultar sua solicitação anterior.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : sent || existing ? (
            <div className="py-6 text-center space-y-5">
              <h2 className="text-2xl font-bold">Solicitação de Associação Registrada</h2>
              <div className="flex justify-center">
                <ApplicationStatusBadge status={existing?.status ?? "pendente"} />
              </div>
              <div className="rounded-md border border-border bg-card/60 p-4 text-left text-sm space-y-2">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Info className="h-4 w-4 text-olive" />
                  Informação do processo:
                </p>
                <p className="text-muted-foreground">
                  {existing?.status === "rejeitada"
                    ? "Seu pedido foi analisado e rejeitado pela diretoria. Caso haja circunstâncias excepcionais a revisar, entre em contato para solicitar reanálise formal."
                    : existing?.status === "aprovada"
                      ? "Parabéns! Sua associação foi aprovada pela diretoria da A.S.G. Seu acesso de associado já está liberado."
                      : "Seu cadastro foi registrado com status Pendente e está na fila privada de avaliação da diretoria. O envio inicial não concede acesso de associado até a deliberação formal."}
                </p>
                {existing?.created_at && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Registrado em: {new Date(existing.created_at).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(existing.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {existing?.reviewed_at && (
                  <p className="text-xs text-muted-foreground">
                    Decisão registrada em:{" "}
                    {new Date(existing.reviewed_at).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(existing.reviewed_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <div>
                <Link to="/area" className="btn-stamp inline-flex">
                  {existing?.status === "aprovada"
                    ? "Acessar área do associado"
                    : "Acompanhar situação na Minha Área"}
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <h2 className="text-2xl">Formulário de Associação</h2>
              <p className="text-xs text-muted-foreground">
                Preencha os campos abaixo. Eles serão enviados à diretoria para deliberação.
              </p>

              <label className="block">
                <span className="eyebrow">Nome completo *</span>
                <input
                  required
                  maxLength={100}
                  className="field mt-1"
                  value={fullName}
                  placeholder="Seu nome completo"
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="eyebrow">E-mail vinculado da conta</span>
                <input
                  type="email"
                  readOnly
                  className="field mt-1 bg-muted/50 cursor-not-allowed"
                  value={user.email ?? ""}
                />
                <span className="text-xs text-muted-foreground mt-1 block">
                  Identificador autenticado do solicitante.
                </span>
              </label>

              <label className="block">
                <span className="eyebrow">Telefone (opcional)</span>
                <input
                  type="tel"
                  maxLength={20}
                  className="field mt-1"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="eyebrow">Data de nascimento *</span>
                <input
                  type="date"
                  required
                  className="field mt-1"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="eyebrow">Por que quer se associar? (opcional)</span>
                <textarea
                  maxLength={500}
                  rows={3}
                  className="field mt-1"
                  placeholder="Conte um pouco sobre sua relação com o skate e a associação..."
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                />
              </label>

              {formError && (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {formError}
                </div>
              )}

              <Button disabled={busy} className="btn-stamp h-auto w-full justify-center">
                {busy ? "Enviando solicitação…" : "Enviar solicitação"}
              </Button>
            </form>
          )}
        </Card>
      </Section>
    </>
  );
}
