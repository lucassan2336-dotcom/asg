import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteLayout";
import { DemoList } from "@/components/DemoList";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/projetos")({
  head: () => seo("Projetos sociais", "Iniciativas da A.S.G. que levam o skate a crianças, jovens e à comunidade de Guararema."),
  component: () => (
    <>
      <PageHero eyebrow="Impacto" title="Projetos sociais">O skate como porta de entrada para educação, saúde e convivência.</PageHero>
      <DemoList items={[
        { title: "Escolinha de skate", text: "Modelo de projeto: aulas gratuitas para iniciantes." },
        { title: "Skate na escola", text: "Modelo de projeto: oficinas em escolas públicas." },
        { title: "Doação de equipamentos", text: "Modelo de projeto: arrecadação de shapes, rodas e capacetes." },
      ]} />
    </>
  ),
});
