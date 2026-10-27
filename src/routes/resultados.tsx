import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy, Edit3, Medal } from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useCompetitionResults,
  type GenericPageContent,
  type CompetitionResultItem,
} from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { ResultModal } from "@/components/CmsModals";

export const Route = createFileRoute("/resultados")({
  head: () =>
    seo("Resultados", "Classificações e resultados dos campeonatos organizados pela A.S.G."),
  component: ResultadosPage,
});

function ResultadosPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("resultados");
  const { data: results, isLoading } = useCompetitionResults();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<CompetitionResultItem | null>(null);

  const hero = content?.hero;
  const list = isDiretoria ? results || [] : (results || []).filter((r) => r.published);

  // Agrupar por campeonato
  const championships = Array.from(new Set(list.map((r) => r.championship_name)));

  const handleNewResult = () => {
    setSelectedResult(null);
    setModalOpen(true);
  };

  const handleEditResult = (item: CompetitionResultItem) => {
    setSelectedResult(item);
    setModalOpen(true);
  };

  return (
    <>
      <EditablePageToolbar
        pageSlug="resultados"
        pageName="Resultados"
        addItemLabel="Novo Resultado"
        onAddItem={handleNewResult}
      />

      <PageHero eyebrow={hero?.eyebrow || "Pódio"} title={hero?.title || "Resultados"}>
        {hero?.description || "Classificações e resultados dos campeonatos organizados pela A.S.G."}
      </PageHero>

      <Section>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando resultados…</p>
        ) : list.length === 0 ? (
          <Card className="text-center py-10 text-muted-foreground">
            Nenhum resultado cadastrado no momento.
          </Card>
        ) : (
          <div className="space-y-10">
            {championships.map((champName) => {
              const champResults = list.filter((r) => r.championship_name === champName);

              return (
                <div key={champName} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl md:text-3xl font-display">{champName}</h2>
                  </div>

                  <div className="overflow-x-auto rounded-md border-2 border-ink bg-card shadow-stamp">
                    <table className="w-full text-left">
                      <thead className="bg-ink text-cream">
                        <tr>
                          <th className="eyebrow px-4 py-3">Posição</th>
                          <th className="eyebrow px-4 py-3">Atleta</th>
                          <th className="eyebrow px-4 py-3">Categoria</th>
                          <th className="eyebrow px-4 py-3">Pontuação</th>
                          <th className="eyebrow px-4 py-3">Observações</th>
                          {isDiretoria && <th className="eyebrow px-4 py-3 text-right">Ação</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {champResults.map((item) => (
                          <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-4 py-3 font-display text-xl whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                {item.position === 1 && (
                                  <Medal className="h-4 w-4 text-amber-500 fill-amber-500" />
                                )}
                                {item.position === 2 && (
                                  <Medal className="h-4 w-4 text-slate-400 fill-slate-400" />
                                )}
                                {item.position === 3 && (
                                  <Medal className="h-4 w-4 text-amber-700 fill-amber-700" />
                                )}
                                {item.position}º
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold">{item.athlete_name}</td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-muted px-2 py-0.5 text-xs font-condensed font-bold uppercase">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm">{item.score || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {item.notes || "—"}
                            </td>
                            {isDiretoria && (
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleEditResult(item)}
                                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-semibold hover:bg-accent hover:text-accent-foreground"
                                >
                                  <Edit3 className="h-3 w-3" /> Editar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {modalOpen && <ResultModal result={selectedResult} onClose={() => setModalOpen(false)} />}
    </>
  );
}
