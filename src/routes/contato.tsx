import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contato")({
  head: () => seo("Contato", "Fale com a Associação dos Skatistas de Guararema."),
  component: () => (
    <>
      <PageHero eyebrow="Fale com a gente" title="Contato" />
      <Section className="grid gap-10 md:grid-cols-2">
        <div className="space-y-3 text-muted-foreground">
          <p>Canais oficiais (e-mail, redes sociais e endereço) serão informados pela associação.</p>
        </div>
        <Card>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <label className="block"><span className="eyebrow">Nome</span><input required maxLength={100} className="field mt-1" /></label>
            <label className="block"><span className="eyebrow">E-mail</span><input required type="email" maxLength={255} className="field mt-1" /></label>
            <label className="block"><span className="eyebrow">Mensagem</span><textarea required maxLength={1000} rows={4} className="field mt-1" /></label>
            <button className="btn-stamp w-full justify-center">Enviar (em breve)</button>
          </form>
        </Card>
      </Section>
    </>
  ),
});
