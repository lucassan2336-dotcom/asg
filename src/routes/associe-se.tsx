import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { useSession } from "@/lib/auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/associe-se")({
  head: () => seo("Como se associar", "Solicite sua associação à A.S.G. Cada pedido é analisado pela diretoria."),
  component: AssocieSe,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

function AssocieSe() {
  const { user, loading } = useSession();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [motivation, setMotivation] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: existing, refetch } = useQuery({
    queryKey: ["my-application", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("membership_applications")
        .select("id, status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("membership_applications").insert({
      user_id: user.id,
      full_name: fullName.trim().slice(0, 100),
      phone: phone.trim().slice(0, 20) || null,
      birth_date: birthDate,
      motivation: motivation.trim().slice(0, 500) || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar a solicitação. Tente novamente.");
    } else {
      setSent(true);
      refetch();
    }
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
          {loading ? (
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
          ) : sent || existing ? (
            <div className="py-8 text-center">
              <h2 className="text-2xl">Solicitação registrada</h2>
              <p className="mt-2 text-muted-foreground">
                Situação atual:{" "}
                <strong className="uppercase">{STATUS_LABEL[(existing?.status ?? "pendente") as string]}</strong>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                A diretoria analisa cada pedido. Acompanhe pela sua área.
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
                <span className="eyebrow">Telefone</span>
                <input type="tel" maxLength={20} className="field mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block">
                <span className="eyebrow">Data de nascimento</span>
                <input type="date" required className="field mt-1" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="eyebrow">Por que quer se associar?</span>
                <textarea maxLength={500} rows={3} className="field mt-1" value={motivation} onChange={(e) => setMotivation(e.target.value)} />
              </label>
              <button disabled={busy} className="btn-stamp w-full justify-center disabled:opacity-60">
                {busy ? "Enviando…" : "Enviar solicitação"}
              </button>
            </form>
          )}
        </Card>
      </Section>
    </>
  );
}
