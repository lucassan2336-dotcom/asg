import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/associe-se")({
  head: () => seo("Como se associar", "Solicite sua associação à A.S.G. Cada pedido é analisado pela diretoria."),
  component: AssocieSe,
});

function AssocieSe() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHero eyebrow="Faça parte" title="Como se associar">
        Preencha a solicitação. Ela começa como <strong>Pendente</strong> e é analisada pela diretoria.
      </PageHero>
      <Section className="grid gap-10 md:grid-cols-[1fr_1.3fr]">
        <ol className="space-y-5">
          {["Envie a solicitação", "A diretoria analisa", "Receba a aprovação", "Acesse a área do associado"].map((s, i) => (
            <li key={s} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-olive font-display text-cream">{i + 1}</span>
              <span className="font-condensed text-xl font-bold uppercase">{s}</span>
            </li>
          ))}
        </ol>
        <Card>
          {sent ? (
            <div className="py-8 text-center">
              <h2 className="text-2xl">Pré-visualização</h2>
              <p className="mt-2 text-muted-foreground">O envio real das solicitações será ativado na próxima etapa.</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <label className="block"><span className="eyebrow">Nome completo</span><input required maxLength={100} className="field mt-1" /></label>
              <label className="block"><span className="eyebrow">E-mail</span><input required type="email" maxLength={255} className="field mt-1" /></label>
              <label className="block"><span className="eyebrow">Telefone</span><input type="tel" maxLength={20} className="field mt-1" /></label>
              <label className="block"><span className="eyebrow">Data de nascimento</span><input type="date" required className="field mt-1" /></label>
              <label className="block"><span className="eyebrow">Por que quer se associar?</span><textarea maxLength={500} rows={3} className="field mt-1" /></label>
              <button className="btn-stamp w-full justify-center">Enviar solicitação</button>
            </form>
          )}
        </Card>
      </Section>
    </>
  );
}
