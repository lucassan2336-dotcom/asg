import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Flame,
  Shield,
  Trophy,
  Sparkles,
  ChevronRight,
  Users,
  Settings2,
  Plus,
} from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { useSession, useMyRoles } from "@/lib/auth";
import { usePageContent, type GenericPageContent } from "@/lib/cms";
import { seo } from "@/lib/seo";
import {
  useModalityRanking,
  useScoringConfig,
  type RankingEntry,
  type SkateModality,
} from "@/lib/ranking";
import { ModalityBadge, RankingTrophyBadge, SkaterAvatar } from "@/components/TrophyBadges";
import { ChampionshipPodiumModal, ScoringConfigModal } from "@/components/RankingModals";

export const Route = createFileRoute("/ranking")({
  head: () =>
    seo(
      "Ranking Oficial Street & Vert",
      "Classificação oficial dos skatistas locais da A.S.G. nas modalidades Street e Vert.",
    ),
  component: RankingPage,
});

function PodiumCard({ entry }: { entry: RankingEntry }) {
  const tierStyles = {
    ouro: {
      border: "border-amber-500 bg-gradient-to-b from-amber-50/90 to-card",
      rankBadge: "bg-amber-400 text-ink border-ink",
      orderClass: "md:order-2 md:-translate-y-2",
    },
    prata: {
      border: "border-slate-400 bg-gradient-to-b from-slate-100/90 to-card",
      rankBadge: "bg-slate-300 text-ink border-ink",
      orderClass: "md:order-1",
    },
    bronze: {
      border: "border-amber-700 bg-gradient-to-b from-orange-50/80 to-card",
      rankBadge: "bg-amber-700 text-cream border-ink",
      orderClass: "md:order-3",
    },
  }[entry.trophy_tier ?? "bronze"];

  return (
    <Link
      to="/skatistas/$skaterId"
      params={{ skaterId: entry.skater_id }}
      className={`group relative flex flex-col items-center rounded-md border-2 p-4 text-center shadow-stamp transition-transform hover:-translate-y-1 ${tierStyles.border} ${tierStyles.orderClass}`}
    >
      <div className="mb-2">
        <RankingTrophyBadge tier={entry.trophy_tier} size="sm" />
      </div>

      <div className="relative">
        <SkaterAvatar
          name={entry.full_name}
          avatarUrl={entry.avatar_url}
          size="lg"
          trophyTier={entry.trophy_tier}
        />
        <span
          className={`absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 font-display text-sm shadow-stamp-sm ${tierStyles.rankBadge}`}
        >
          {entry.rank_position}º
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg uppercase truncate max-w-full group-hover:text-rust">
        {entry.full_name}
      </h3>

      <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        {entry.stance && (
          <span className="font-semibold text-foreground uppercase">
            {entry.stance === "goofy" ? "Goofy" : "Regular"}
          </span>
        )}
        {entry.age != null && <span>• {entry.age} anos</span>}
        {entry.years_practicing && <span>• {entry.years_practicing}</span>}
      </div>

      {entry.favorite_trick && (
        <p className="mt-1.5 inline-flex items-center gap-1 rounded-sm border border-ink/20 bg-secondary px-2 py-0.5 font-condensed text-[11px] font-bold uppercase tracking-wider line-clamp-1">
          <Sparkles className="h-3 w-3 text-rust shrink-0" /> {entry.favorite_trick}
        </p>
      )}

      <div className="mt-3 w-full rounded-sm border-2 border-ink bg-ink px-3 py-1.5 text-cream flex items-center justify-center gap-2">
        <span className="font-display text-2xl text-amber">{entry.total_points}</span>{" "}
        <span className="font-condensed text-xs font-bold uppercase text-cream/80">PTS</span>
      </div>

      <span className="mt-2 inline-flex items-center gap-1 font-condensed text-[11px] font-bold uppercase tracking-widest text-rust group-hover:underline">
        Perfil <ChevronRight className="h-3 w-3" />
      </span>
    </Link>
  );
}

function ModalityRankingView({
  modality,
  entries,
  isLoading,
}: {
  modality: SkateModality;
  entries: RankingEntry[];
  isLoading: boolean;
}) {
  const podiumEntries = entries.filter((e) => e.trophy_tier !== null);
  const title = modality === "street" ? "Ranking Street" : "Ranking Vert";
  const subtitle =
    modality === "street"
      ? "Classificação oficial exclusiva da modalidade Street."
      : "Classificação oficial exclusiva da modalidade Vert.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-3">
        <div className="flex items-center gap-2.5">
          <ModalityBadge modality={modality} />
          <div>
            <h2 className="text-2xl md:text-3xl font-display uppercase leading-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-secondary px-2.5 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider">
          <Users className="h-3.5 w-3.5" /> {entries.length}{" "}
          {entries.length === 1 ? "skatista" : "skatistas"}
        </span>
      </div>

      {isLoading ? (
        <Card className="py-8 text-center text-muted-foreground text-sm">
          Carregando classificação oficial de {modality.toUpperCase()}…
        </Card>
      ) : entries.length === 0 ? (
        <Card className="py-10 text-center space-y-3">
          <Trophy className="mx-auto h-9 w-9 text-muted-foreground" />
          <h3 className="text-xl">Nenhum skatista cadastrado em {modality.toUpperCase()}</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Crie sua conta como <strong>Skatista Local</strong> na modalidade{" "}
            {modality === "street" ? "Street" : "Vert"} para pontuar nesta categoria.
          </p>
          <Link to="/auth" className="btn-stamp inline-flex text-xs mt-1">
            Cadastrar como Skatista Local
          </Link>
        </Card>
      ) : (
        <>
          {/* Pódio Oficial mais compacto e elegante */}
          {podiumEntries.length > 0 && (
            <div className="space-y-2">
              <span className="eyebrow block text-xs">
                Pódio Oficial ({modality.toUpperCase()})
              </span>
              <div className="grid gap-4 md:grid-cols-3 items-stretch pt-1">
                {podiumEntries.map((entry) => (
                  <PodiumCard key={entry.skater_id} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* TABELA DE CLASSIFICAÇÃO REDUZIDA E COMPACTA */}
          <div className="space-y-2">
            <span className="eyebrow block text-xs">Classificação Geral ({entries.length})</span>
            <div className="overflow-hidden rounded-md border-2 border-ink bg-card shadow-stamp">
              <div className="divide-y divide-border">
                {entries.map((entry) => (
                  <Link
                    key={entry.skater_id}
                    to="/skatistas/$skaterId"
                    params={{ skaterId: entry.skater_id }}
                    className="group flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 py-2 px-3 sm:py-2.5 sm:px-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Posição compacta */}
                      <div
                        className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-sm border-2 border-ink font-display text-base sm:text-lg ${
                          entry.trophy_tier === "ouro"
                            ? "bg-amber-400 text-ink"
                            : entry.trophy_tier === "prata"
                              ? "bg-slate-300 text-ink"
                              : entry.trophy_tier === "bronze"
                                ? "bg-amber-700 text-cream"
                                : "bg-muted text-foreground"
                        }`}
                      >
                        {entry.rank_position}º
                      </div>

                      {/* Avatar compacto */}
                      <SkaterAvatar
                        name={entry.full_name}
                        avatarUrl={entry.avatar_url}
                        size="sm"
                        trophyTier={entry.trophy_tier}
                      />

                      {/* Nome e Detalhes reduzidos */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-display text-base sm:text-lg uppercase group-hover:text-rust truncate">
                            {entry.full_name}
                          </span>
                          {entry.trophy_tier && (
                            <RankingTrophyBadge tier={entry.trophy_tier} size="sm" />
                          )}
                          {entry.modality === "versatil" && (
                            <ModalityBadge modality="versatil" size="sm" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          {entry.stance && (
                            <span className="font-semibold text-foreground uppercase">
                              Base: {entry.stance === "goofy" ? "Goofy" : "Regular"}
                            </span>
                          )}
                          {entry.age != null && <span>• {entry.age} anos</span>}
                          {entry.years_practicing && <span>• {entry.years_practicing}</span>}
                          {entry.favorite_trick && (
                            <span className="hidden sm:inline font-semibold text-foreground">
                              • {entry.favorite_trick}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pontuação e Pódios à direita */}
                    <div className="flex items-center gap-3 ml-auto">
                      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground font-condensed uppercase tracking-wider">
                        <span title="Primeiros lugares">{entry.first_places}x 1º</span>
                        <span>•</span>
                        <span title="Segundos lugares">{entry.second_places}x 2º</span>
                        <span>•</span>
                        <span title="Terceiros lugares">{entry.third_places}x 3º</span>
                      </div>

                      {/* Caixa de pontuação reduzida */}
                      <div className="rounded-sm border-2 border-ink bg-ink px-2.5 py-1 text-right text-cream min-w-[85px]">
                        <span className="font-display text-lg sm:text-xl text-amber">
                          {entry.total_points}
                        </span>{" "}
                        <span className="font-condensed text-[10px] font-bold uppercase text-cream/80">
                          PTS
                        </span>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-rust transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RankingPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");
  const { content } = usePageContent<GenericPageContent>("ranking");

  const [activeTab, setActiveTab] = useState<"street" | "vert" | "ambos">("ambos");
  const [podiumModalOpen, setPodiumModalOpen] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);

  const { data: streetRanking = [], isLoading: loadingStreet } = useModalityRanking("street");
  const { data: vertRanking = [], isLoading: loadingVert } = useModalityRanking("vert");
  const { data: scoringConfig } = useScoringConfig();

  const hero = content?.hero;

  return (
    <>
      {/* Barra de Edição da Diretoria */}
      <EditablePageToolbar
        pageSlug="ranking"
        pageName="Ranking Oficial"
        addItemLabel="Lançar Pódio Oficial"
        onAddItem={() => setPodiumModalOpen(true)}
      />

      <PageHero
        eyebrow={hero?.eyebrow || "Circuito Competitivo A.S.G."}
        title={hero?.title || "Ranking Oficial"}
        actions={
          <>
            <Link to="/resultados" className="btn-ghost-stamp bg-cream text-ink">
              Ver Resultados dos Campeonatos
            </Link>
            <Link to="/auth" className="btn-stamp bg-rust text-cream">
              Participar do Ranking
            </Link>
          </>
        }
      >
        {hero?.description || (
          <>
            Classificação oficial e independente das categorias <strong>Street</strong> e{" "}
            <strong>Vert</strong> da Associação dos Skatistas de Guararema. Clique em qualquer
            skatista para abrir seu perfil público completo.
          </>
        )}
      </PageHero>

      <Section className="space-y-8">
        {/* Seletor de Categorias + Resumo de Pontuação e Controles da Diretoria */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-ink bg-secondary p-4 shadow-stamp">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("ambos")}
              className={
                activeTab === "ambos"
                  ? "btn-stamp text-xs px-4 py-2"
                  : "btn-ghost-stamp text-xs px-4 py-2 bg-card"
              }
            >
              <Trophy className="h-4 w-4" /> Street & Vert
            </button>

            {/* Botão Street com a mesma cor exata do botão Vert (bg-olive) */}
            <button
              type="button"
              onClick={() => setActiveTab("street")}
              className={
                activeTab === "street"
                  ? "btn-stamp bg-olive text-cream text-xs px-4 py-2"
                  : "btn-ghost-stamp text-xs px-4 py-2 bg-card"
              }
            >
              <Flame className="h-4 w-4" /> Ranking Street ({streetRanking.length})
            </button>

            {/* Botão Vert com bg-olive */}
            <button
              type="button"
              onClick={() => setActiveTab("vert")}
              className={
                activeTab === "vert"
                  ? "btn-stamp bg-olive text-cream text-xs px-4 py-2"
                  : "btn-ghost-stamp text-xs px-4 py-2 bg-card"
              }
            >
              <Shield className="h-4 w-4" /> Ranking Vert ({vertRanking.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {scoringConfig && (
              <div className="text-xs text-muted-foreground font-condensed uppercase tracking-wider">
                Pontuação oficial:{" "}
                <strong className="text-foreground">
                  1º = {scoringConfig.first_place_points} pts
                </strong>{" "}
                •{" "}
                <strong className="text-foreground">
                  2º = {scoringConfig.second_place_points} pts
                </strong>{" "}
                •{" "}
                <strong className="text-foreground">
                  3º = {scoringConfig.third_place_points} pts
                </strong>
              </div>
            )}

            {isDiretoria && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScoringModalOpen(true)}
                  className="btn-ghost-stamp inline-flex items-center gap-1.5 text-xs py-1.5 px-3 bg-card"
                  title="Editar pontuação oficial e critérios de desempate"
                >
                  <Settings2 className="h-3.5 w-3.5 text-rust" /> Regras de Pontuação
                </button>
                <button
                  type="button"
                  onClick={() => setPodiumModalOpen(true)}
                  className="btn-stamp inline-flex items-center gap-1.5 text-xs py-1.5 px-3 bg-ink text-cream"
                  title="Lançar novo pódio de campeonato e creditar pontos"
                >
                  <Plus className="h-3.5 w-3.5 text-amber" /> Lançar Pódio
                </button>
              </div>
            )}
          </div>
        </div>

        {(activeTab === "ambos" || activeTab === "street") && (
          <ModalityRankingView
            modality="street"
            entries={streetRanking}
            isLoading={loadingStreet}
          />
        )}

        {(activeTab === "ambos" || activeTab === "vert") && (
          <ModalityRankingView modality="vert" entries={vertRanking} isLoading={loadingVert} />
        )}
      </Section>

      {/* Modais de Gestão da Diretoria */}
      {podiumModalOpen && (
        <ChampionshipPodiumModal initialPodium={null} onClose={() => setPodiumModalOpen(false)} />
      )}

      {scoringModalOpen && <ScoringConfigModal onClose={() => setScoringModalOpen(false)} />}
    </>
  );
}
