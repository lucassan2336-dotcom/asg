import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteLayout";
import { DemoList } from "@/components/DemoList";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/noticias")({
  head: () => seo("Notícias", "Novidades, comunicados e histórias da cena do skate em Guararema."),
  component: () => (
    <>
      <PageHero eyebrow="Fique por dentro" title="Notícias" />
      <DemoList cols={2} items={[
        { title: "Título de notícia de exemplo", meta: "DD/MM/AAAA", text: "Resumo demonstrativo de uma notícia publicada pela diretoria." },
        { title: "Outro comunicado de exemplo", meta: "DD/MM/AAAA", text: "Espaço para avisos públicos da associação." },
      ]} />
    </>
  ),
});
