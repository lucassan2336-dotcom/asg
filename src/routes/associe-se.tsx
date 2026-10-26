import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { useSession } from "@/lib/auth";
import { seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ApplicationStatusBadge } from "@/components/ApplicationStatus";
import { membershipSchema } from "@/lib/membership";

export const Route = createFileRoute("/associe-se")({
  head: () => seo("Como se associar", "Solicite sua associação à A.S.G. Cada pedido é analisado pela diretoria."),
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

  const { data: existing, refetch, isLoading: checking, error: lookupError } = useQuery({
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
    const parsed = membershipSchema.safeParse({ full_name: fullName, email: user.email ?? "", phone, birth_date: birthDate, motivation });
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? "Revise os campos."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("membership_applications").insert({
        user_id: user.id, ...parsed.data, phone: parsed.data.phone || null, motivation: parsed.data.motivation || null,
      });
      if (error) {
        if (error.code === "23505") { await refetch(); setFormError("Já existe uma solicitação para sua conta. Consulte sua situação."); }
        else setFormError("Não foi possível enviar. Confira os dados e a confirmação do seu e-mail.");
        return;
      }
      setSent(true);
      await refetch();
      toast.success("Solicitação recebida. Aguarde a análise da diretoria.");
    } catch { setFormError("Não foi possível conectar. Tente novamente."); }
    finally { setBusy(false); }
  }

  const steps = ["Crie sua conta", "Envie a solicitação", "A diretoria analisa", "Acesse a área do associado"];

  return (
    <>
      <PageHero eyebrow="Faça parte" title="Como se associar">
        Crie sua conta e preencha a solicitação. Ela começa como <strong>Pendente</strong> e é analisada pela diretoria.
      </PageHero>
      <Section className="grid gap-10 md:grid-cols-[1fr_1.3fr]">
        <ol className="space-y-5">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-olive font-display text-cream">
                {i + 1}
              </span>
              <span className="font-condensed text-xl font-bold uppercase">{s}</span>
            </li>
          ))}
        </ol>
        <Card>
          {loading || checking ? (
            <p className="py-8 text-center text-muted-foreground">Carregando…</p>
          ) : !user ? (
            <div className="py-8 text-center">
              <h2 className="text-2xl">Primeiro, crie sua conta</h2>
              <p className="mt-2 text-muted-foreground">
                A solicitação fica ligada à sua conta para você acompanhar a análise.
              </p>
              <Link to="/auth" search={{ redirect: "/associe-se" }} className="btn-stamp mt-6 inline-flex">
                Entrar ou criar conta
              </Link>
            </div>
          ) : lookupError ? (<p role="alert">Não foi possível consultar sua solicitação. <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></p>) : sent || existing ? (
            <div className="py-8 text-center">
              <h2 className="text-2xl">Solicitação registrada</h2>
              <p className="mt-2 text-muted-foreground">
                Situação atual:{" "}
                <ApplicationStatusBadge status={existing?.status ?? "pendente"} />
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {existing?.status === "rejeitada" ? "Seu pedido foi rejeitado. Para solicitar reanálise, entre em contato com a diretoria." : existing?.status === "aprovada" ? "Sua associação foi aprovada. Acesse sua área." : "Seu cadastro ainda precisa ser analisado. O envio não concede acesso como associado."}
              </p>
              <Link to="/area" className="btn-stamp mt-6 inline-flex">
                Ir para a área do associado
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="eyebrow">Nome completo</span>
                <input required maxLength={100} className="field mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>
              <label className="block">
                <span className="eyebrow">E-mail da conta</span>
                <input type="email" readOnly className="field mt-1" value={user.email ?? ""} />
              </label>
              <label className="block">
                <span className="eyebrow">Telefone (opcional)</span>
                <input type="tel" maxLength={20} className="field mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block">
                <span className="eyebrow">Data de nascimento</span>
                <input type="date" required className="field mt-1" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="eyebrow">Por que quer se associar? (opcional)</span>
                <textarea maxLength={500} rows={3} className="field mt-1" value={motivation} onChange={(e) => setMotivation(e.target.value)} />
              </label>
              {formError && <p role="alert" className="text-destructive">{formError}</p>}
              <Button disabled={busy} className="btn-stamp h-auto w-full justify-center">
                {busy ? "Enviando…" : "Enviar solicitação"}
              </Button>
            </form>
          )}
        </Card>
      </Section>
    </>
  );
}
