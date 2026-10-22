import { createFileRoute } from "@tanstack/react-router";
import { PageHero, Section, DemoNotice, DemoTag } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/resultados")({
  head: () => seo("Resultados", "Classificações e resultados dos campeonatos organizados pela A.S.G."),
  component: () => (
    <>
      <PageHero eyebrow="Pódio" title="Resultados" />
      <Section>
        <DemoNotice />
        <div className="overflow-x-auto rounded-md border-2 border-ink bg-card shadow-stamp">
          <table className="w-full text-left">
            <thead className="bg-ink text-cream">
              <tr>{["Posição", "Atleta", "Categoria", "Nota"].map((h) => <th key={h} className="eyebrow px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((p) => (
                <tr key={p} className="border-t border-border">
                  <td className="px-4 py-3 font-display text-xl">{p}º</td>
                  <td className="px-4 py-3">Nome de exemplo <DemoTag /></td>
                  <td className="px-4 py-3">Amador</td>
                  <td className="px-4 py-3">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  ),
});
