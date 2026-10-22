import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/sobre")({
  head: () => seo("Sobre a associação", "Conheça a missão e os valores da Associação dos Skatistas de Guararema."),
  component: () => (
    <>
      <PageHero eyebrow="Quem somos" title="Sobre a A.S.G.">
        Uma associação feita por skatistas, para fortalecer o skate em Guararema.
      </PageHero>
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Missão", "Promover o skate como esporte, cultura e ferramenta de inclusão social."],
            ["Visão", "Uma cena local organizada, segura e acessível para todas as idades."],
            ["Valores", "Respeito, coletividade, transparência e amor pelo carrinho."],
          ].map(([t, d]) => (
            <Card key={t}><h2 className="text-2xl">{t}</h2><p className="mt-2 text-muted-foreground">{d}</p></Card>
          ))}
        </div>
        <p className="mt-10 max-w-2xl text-muted-foreground">
          A história completa, a composição da diretoria e os dados institucionais serão publicados pela associação.
        </p>
      </Section>
    </>
  ),
});
