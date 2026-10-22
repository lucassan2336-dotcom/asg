import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/SiteLayout";
import { DemoList } from "@/components/DemoList";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/eventos")({
  head: () => seo("Eventos e campeonatos", "Agenda de sessões, eventos e campeonatos da A.S.G. em Guararema."),
  component: () => (
    <>
      <PageHero eyebrow="Agenda" title="Eventos e campeonatos" />
      <DemoList cols={2} items={[
        { title: "Sessão aberta", meta: "DD/MM/AAAA", text: "Evento de exemplo. Local e horário a definir." },
        { title: "Campeonato amador", meta: "DD/MM/AAAA", text: "Evento de exemplo com categorias iniciante e amador." },
      ]} />
    </>
  ),
});
