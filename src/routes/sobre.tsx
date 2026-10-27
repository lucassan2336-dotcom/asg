import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import { usePageContent, type SobreContent } from "@/lib/cms";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { Compass, Eye, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () =>
    seo(
      "Sobre a associação",
      "Conheça a missão, a história e a governança da Associação dos Skatistas de Guararema.",
    ),
  component: SobrePage,
});

const PILLAR_ICONS = [Compass, Eye, ShieldCheck];

function SobrePage() {
  const { content } = usePageContent<SobreContent>("sobre");
  const hero = content?.hero;
  const pillars = content?.pillars || [];
  const history = content?.history;
  const board = content?.board;

  return (
    <>
      <EditablePageToolbar pageSlug="sobre" pageName="Sobre a A.S.G." />

      <PageHero eyebrow={hero?.eyebrow || "Quem somos"} title={hero?.title || "Sobre a A.S.G."}>
        {hero?.description ||
          "Uma associação feita por skatistas, para fortalecer o skate em Guararema."}
      </PageHero>

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((item, idx) => {
            const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
            return (
              <Card key={idx}>
                <Icon className="mb-3 h-7 w-7 text-accent" />
                <h2 className="text-2xl">{item.title}</h2>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {history && (
            <Card className="space-y-3">
              <h3 className="text-2xl font-bold">{history.title || "Nossa História"}</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {history.text}
              </p>
            </Card>
          )}

          {board && (
            <Card className="space-y-3">
              <h3 className="text-2xl font-bold">{board.title || "Diretoria e Governança"}</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {board.members}
              </p>
            </Card>
          )}
        </div>
      </Section>
    </>
  );
}
