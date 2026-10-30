import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Trophy,
  Edit3,
  Medal,
  Plus,
  Settings,
  Calendar,
  Ban,
  RotateCcw,
  X,
  Flame,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  useActiveSkatersByModality,
  useCancelChampionshipPodium,
  useChampionshipPodiums,
  useSaveChampionshipPodium,
  useSaveScoringConfig,
  useScoringConfig,
  type ChampionshipPodiumRow,
  type SkateModality,
  type TiebreakerRule,
} from "@/lib/ranking";
import { ChampionshipMedalBadge, ModalityBadge, SkaterAvatar } from "@/components/TrophyBadges";
import { ChampionshipPodiumModal, ScoringConfigModal } from "@/components/RankingModals";

export const Route = createFileRoute("/resultados")({
  head: () =>
    seo(
      "Resultados de Campeonatos",
      "Pódios oficiais, classificações e pontuação dos campeonatos Street e Vert organizados pela A.S.G.",
    ),
  component: ResultadosPage,
});

function ResultadosPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("resultados");
  const { data: podiums = [], isLoading: loadingPodiums } = useChampionshipPodiums(isDiretoria);
  const { data: legacyResults = [] } = useCompetitionResults();
  const cancelMutation = useCancelChampionshipPodium();

  const [modalityFilter, setModalityFilter] = useState<"todos" | "street" | "vert">("todos");
  const [podiumModalOpen, setPodiumModalOpen] = useState(false);
  const [selectedPodium, setSelectedPodium] = useState<ChampionshipPodiumRow | null>(null);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);

  // Modal legado preservado
  const [legacyModalOpen, setLegacyModalOpen] = useState(false);
  const [selectedLegacyResult, setSelectedLegacyResult] = useState<CompetitionResultItem | null>(
    null,
  );

  const hero = content?.hero;

  const visiblePodiums = podiums.filter((p) => {
    if (!isDiretoria && (!p.published || p.cancelled)) return false;
    if (modalityFilter !== "todos" && p.modality !== modalityFilter) return false;
    return true;
  });

  const visibleLegacy = isDiretoria ? legacyResults : legacyResults.filter((r) => r.published);
  const legacyChampionships = Array.from(new Set(visibleLegacy.map((r) => r.championship_name)));

  const handleNewPodium = () => {
    setSelectedPodium(null);
    setPodiumModalOpen(true);
  };

  const handleEditPodium = (podium: ChampionshipPodiumRow) => {
    setSelectedPodium(podium);
    setPodiumModalOpen(true);
  };

  async function handleToggleCancel(podium: ChampionshipPodiumRow) {
    try {
      await cancelMutation.mutateAsync({
        id: podium.id,
        cancelled: !podium.cancelled,
      });
      toast.success(
        podium.cancelled
          ? "Resultado restaurado e pontos recalculados no ranking!"
          : "Resultado cancelado e pontos estornados automaticamente do ranking!",
      );
    } catch {
      toast.error("Não foi possível alterar o status deste resultado.");
    }
  }

  return (
    <>
      <EditablePageToolbar
        pageSlug="resultados"
        pageName="Resultados"
        addItemLabel="Registrar Pódio Oficial"
        onAddItem={handleNewPodium}
      />

      <PageHero
        eyebrow={hero?.eyebrow || "Pódios Homologados"}
        title={hero?.title || "Resultados de Campeonatos"}
        actions={
          <Link to="/ranking" className="btn-stamp bg-rust text-cream">
            <Trophy className="h-4 w-4" /> Ver Ranking Street & Vert
          </Link>
        }
      >
        {hero?.description ||
          "Resultados oficiais dos campeonatos de Street e Vert da A.S.G. Clique no nome ou na foto de qualquer medalhista para abrir seu perfil público."}
      </PageHero>

      <Section className="space-y-8">
        {/* Barra de Filtros e Controles Administrativos da Diretoria */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-ink bg-secondary p-4 shadow-stamp">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalityFilter("todos")}
              className={
                modalityFilter === "todos"
                  ? "btn-stamp text-xs px-3.5 py-2"
                  : "btn-ghost-stamp text-xs px-3.5 py-2 bg-card"
              }
            >
              Todas as Modalidades
            </button>
            <button
              type="button"
              onClick={() => setModalityFilter("street")}
              className={
                modalityFilter === "street"
                  ? "btn-stamp bg-rust text-cream text-xs px-3.5 py-2"
                  : "btn-ghost-stamp text-xs px-3.5 py-2 bg-card"
              }
            >
              <Flame className="h-4 w-4" /> Street
            </button>
            <button
              type="button"
              onClick={() => setModalityFilter("vert")}
              className={
                modalityFilter === "vert"
                  ? "btn-stamp bg-olive text-cream text-xs px-3.5 py-2"
                  : "btn-ghost-stamp text-xs px-3.5 py-2 bg-card"
              }
            >
              <Shield className="h-4 w-4" /> Vert
            </button>
          </div>

          {isDiretoria && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScoringModalOpen(true)}
                className="btn-ghost-stamp bg-card text-xs px-3 py-2"
              >
                <Settings className="h-4 w-4" /> Configurar Pontuação
              </button>
              <button
                type="button"
                onClick={handleNewPodium}
                className="btn-stamp bg-rust text-cream text-xs px-3.5 py-2"
              >
                <Plus className="h-4 w-4" /> Novo Resultado Oficial
              </button>
            </div>
          )}
        </div>

        {/* Lista de Pódios Oficiais de Campeonatos (Street / Vert) */}
        {loadingPodiums ? (
          <p className="text-muted-foreground">Carregando resultados oficiais…</p>
        ) : visiblePodiums.length === 0 ? (
          <Card className="py-12 text-center text-muted-foreground space-y-2">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">
              Nenhum pódio oficial registrado para o filtro selecionado.
            </p>
            {isDiretoria && (
              <button
                type="button"
                onClick={handleNewPodium}
                className="btn-stamp mt-2 inline-flex text-xs"
              >
                <Plus className="h-4 w-4" /> Registrar primeiro campeonato
              </button>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {visiblePodiums.map((podium) => {
              const podiumPlaces = [
                {
                  placement: 1 as const,
                  skater: podium.first_skater,
                  skaterId: podium.first_place_skater_id,
                  points: podium.first_place_points,
                },
                {
                  placement: 2 as const,
                  skater: podium.second_skater,
                  skaterId: podium.second_place_skater_id,
                  points: podium.second_place_points,
                },
                {
                  placement: 3 as const,
                  skater: podium.third_skater,
                  skaterId: podium.third_place_skater_id,
                  points: podium.third_place_points,
                },
              ];

              return (
                <Card
                  key={podium.id}
                  className={`space-y-5 ${podium.cancelled ? "opacity-60 border-dashed" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ModalityBadge modality={podium.modality} />
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-condensed uppercase">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(podium.event_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        {podium.cancelled && (
                          <span className="rounded bg-rust px-2 py-0.5 font-condensed text-xs font-bold uppercase text-cream">
                            Cancelado (Pontos Estornados)
                          </span>
                        )}
                        {!podium.published && !podium.cancelled && (
                          <span className="rounded bg-amber px-2 py-0.5 font-condensed text-xs font-bold uppercase text-ink">
                            Rascunho
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-display uppercase">
                        {podium.championship_name}
                      </h2>
                      {podium.notes && (
                        <p className="text-sm text-muted-foreground">{podium.notes}</p>
                      )}
                    </div>

                    {isDiretoria && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditPodium(podium)}
                          className="btn-ghost-stamp text-xs px-3 py-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCancel(podium)}
                          className="btn-ghost-stamp text-xs px-3 py-1.5 text-rust border-rust"
                        >
                          {podium.cancelled ? (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                            </>
                          ) : (
                            <>
                              <Ban className="h-3.5 w-3.5" /> Cancelar
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cartões Clicáveis dos 3 Colocados do Pódio */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {podiumPlaces.map(({ placement, skater, skaterId, points }) => (
                      <Link
                        key={placement}
                        to="/skatistas/$skaterId"
                        params={{ skaterId }}
                        className="group flex items-center gap-4 rounded-md border-2 border-ink bg-secondary/40 p-4 transition-all hover:-translate-y-0.5 hover:bg-secondary shadow-stamp"
                      >
                        <SkaterAvatar
                          name={skater?.full_name ?? `${placement}º Colocado`}
                          avatarUrl={skater?.avatar_url}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <ChampionshipMedalBadge placement={placement} size="sm" />
                          <h3 className="mt-1.5 font-display text-2xl uppercase truncate group-hover:text-rust">
                            {skater?.full_name ?? "Ver perfil do skatista"}
                          </h3>
                          <p className="mt-0.5 font-mono text-xs font-bold text-rust">
                            +{points} PTS no Ranking {podium.modality.toUpperCase()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Seção Complementar de Registros Históricos / Categorias Gerais (Legado Preservado) */}
        {legacyChampionships.length > 0 && (
          <div className="space-y-6 pt-6 border-t-2 border-ink/20">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display uppercase">
                Outros Registros e Baterias Históricas
              </h2>
              {isDiretoria && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLegacyResult(null);
                    setLegacyModalOpen(true);
                  }}
                  className="btn-ghost-stamp text-xs"
                >
                  Adicionar registro complementar
                </button>
              )}
            </div>

            {legacyChampionships.map((champName) => {
              const champResults = visibleLegacy.filter((r) => r.championship_name === champName);
              return (
                <div key={champName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" />
                    <h3 className="text-xl font-display">{champName}</h3>
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
                                  onClick={() => {
                                    setSelectedLegacyResult(item);
                                    setLegacyModalOpen(true);
                                  }}
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

      {podiumModalOpen && (
        <ChampionshipPodiumModal
          initialPodium={selectedPodium}
          onClose={() => setPodiumModalOpen(false)}
        />
      )}

      {scoringModalOpen && <ScoringConfigModal onClose={() => setScoringModalOpen(false)} />}

      {legacyModalOpen && (
        <ResultModal result={selectedLegacyResult} onClose={() => setLegacyModalOpen(false)} />
      )}
    </>
  );
}
