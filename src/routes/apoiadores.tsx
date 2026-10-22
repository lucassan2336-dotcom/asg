import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero, Section, DemoNotice } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/apoiadores")({
  head: () => seo("Apoiadores e parceiros", "Empresas e pessoas que apoiam o skate em Guararema junto com a A.S.G."),
  component: () => (
    <>
      <PageHero eyebrow="Juntos" title="Apoiadores e parceiros">Quem acredita no skate e fortalece a associação.</PageHero>
      <Section>
        <DemoNotice>Os apoiadores reais serão cadastrados pela diretoria.</DemoNotice>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex h-28 items-center justify-center rounded-md border-2 border-ink bg-card font-condensed font-bold uppercase text-muted-foreground shadow-stamp-sm">
              Espaço do apoiador
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/contato" className="btn-stamp">Quero apoiar</Link>
        </div>
      </Section>
    </>
  ),
});
