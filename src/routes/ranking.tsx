import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Shield, Trophy, Sparkles, ChevronRight, Users } from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  useModalityRanking,
  useScoringConfig,
  type RankingEntry,
  type SkateModality,
} from "@/lib/ranking";
import { ModalityBadge, RankingTrophyBadge, SkaterAvatar } from "@/components/TrophyBadges";

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
      orderClass: "md:order-2 md:-translate-y-3",
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
      className={`group relative flex flex-col items-center rounded-md border-2 p-6 text-center shadow-stamp transition-transform hover:-translate-y-1 ${tierStyles.border} ${tierStyles.orderClass}`}
    >
      <div className="mb-3">
        <RankingTrophyBadge tier={entry.trophy_tier} size="md" />
      </div>

      <div className="relative">
        <SkaterAvatar
          name={entry.full_name}
          avatarUrl={entry.avatar_url}
          size="xl"
          trophyTier={entry.trophy_tier}
        />
        <span
          className={`absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-xl shadow-stamp ${tierStyles.rankBadge}`}
        >
          {entry.rank_position}º
        </span>
      </div>

      <h3 className="mt-4 font-display text-2xl uppercase group-hover:text-rust">
        {entry.full_name}
      </h3>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        {entry.stance && (
          <span className="font-semibold text-foreground uppercase">
            Base: {entry.stance === "goofy" ? "Goofy" : "Regular"}
          </span>
        )}
        {entry.age != null && <span>• {entry.age} anos</span>}
        {entry.years_practicing && <span>• {entry.years_practicing} de skate</span>}
      </div>

      {entry.favorite_trick && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-sm border border-ink/20 bg-secondary px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-rust" /> {entry.favorite_trick}
        </p>
      )}

      <div className="mt-5 w-full rounded-sm border-2 border-ink bg-ink px-4 py-2.5 text-cream">
        <span className="block font-condensed text-[11px] uppercase tracking-widest text-cream/70">
          Pontuação Acumulada
        </span>
        <span className="font-display text-3xl text-amber">{entry.total_points}</span>{" "}
        <span className="font-condensed text-sm font-bold uppercase text-cream/80">PTS</span>
      </div>

      <span className="mt-3 inline-flex items-center gap-1 font-condensed text-xs font-bold uppercase tracking-widest text-rust group-hover:underline">
        Abrir perfil público <ChevronRight className="h-3.5 w-3.5" />
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
      ? "Classificação oficial exclusiva dos skatistas cadastrados na modalidade Street."
      : "Classificação oficial exclusiva dos skatistas cadastrados na modalidade Vert.";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink pb-4">
        <div className="flex items-center gap-3">
          <ModalityBadge modality={modality} />
          <div>
            <h2 className="text-3xl md:text-4xl font-display uppercase">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-sm border-2 border-ink bg-secondary px-3 py-1 font-condensed text-xs font-bold uppercase tracking-widest">
          <Users className="h-4 w-4" /> {entries.length}{" "}
          {entries.length === 1 ? "skatista classificado" : "skatistas classificados"}
        </span>
      </div>

      {isLoading ? (
        <Card className="py-10 text-center text-muted-foreground">
          Carregando classificação oficial de {modality.toUpperCase()}…
        </Card>
      ) : entries.length === 0 ? (
        <Card className="py-12 text-center space-y-3">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="text-2xl">Nenhum skatista cadastrado em {modality.toUpperCase()}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Crie sua conta como <strong>Skatista Local</strong> na modalidade{" "}
            {modality === "street" ? "Street" : "Vert"} para estrear nesta categoria.
          </p>
          <Link to="/auth" className="btn-stamp inline-flex mt-2">
            Cadastrar como Skatista Local
          </Link>
        </Card>
      ) : (
        <>
          {/* Destaque Visual do Pódio (1º Ouro, 2º Prata, 3º Bronze) */}
          {podiumEntries.length > 0 && (
            <div className="space-y-3">
              <span className="eyebrow block">Pódio Oficial ({modality.toUpperCase()})</span>
              <div className="grid gap-6 md:grid-cols-3 items-stretch pt-2">
                {podiumEntries.map((entry) => (
                  <PodiumCard key={entry.skater_id} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* Tabela / Cartões Completos de Classificação */}
          <div className="space-y-3">
            <span className="eyebrow block">Classificação Completa</span>
            <div className="overflow-hidden rounded-md border-2 border-ink bg-card shadow-stamp">
              <div className="divide-y divide-border">
                {entries.map((entry) => (
                  <Link
                    key={entry.skater_id}
                    to="/skatistas/$skaterId"
                    params={{ skaterId: entry.skater_id }}
                    className="group flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-4 transition-colors hover:bg-secondary/60"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border-2 border-ink font-display text-2xl ${
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

                      <SkaterAvatar
                        name={entry.full_name}
                        avatarUrl={entry.avatar_url}
                        size="md"
                        trophyTier={entry.trophy_tier}
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-2xl uppercase group-hover:text-rust truncate">
                            {entry.full_name}
                          </span>
                          {/* Apenas top 3 com pontos recebem o troféu do pódio; 4º+ não recebem troféu */}
                          {entry.trophy_tier && (
                            <RankingTrophyBadge tier={entry.trophy_tier} size="sm" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {entry.stance && (
                            <span className="font-semibold text-foreground uppercase">
                              Base: {entry.stance === "goofy" ? "Goofy" : "Regular"}
                            </span>
                          )}
                          {entry.age != null && <span>• {entry.age} anos</span>}
                          {entry.years_practicing && <span>• {entry.years_practicing}</span>}
                          {entry.favorite_trick && (
                            <span className="font-semibold text-foreground">
                              • Manobra: {entry.favorite_trick}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-condensed uppercase">
                        <span title="Primeiros lugares">{entry.first_places}x 1º</span>
                        <span>•</span>
                        <span title="Segundos lugares">{entry.second_places}x 2º</span>
                        <span>•</span>
                        <span title="Terceiros lugares">{entry.third_places}x 3º</span>
                      </div>

                      <div className="rounded-sm border-2 border-ink bg-ink px-3.5 py-1.5 text-right text-cream min-w-[105px]">
                        <span className="font-display text-2xl text-amber">
                          {entry.total_points}
                        </span>{" "}
                        <span className="font-condensed text-xs font-bold uppercase text-cream/80">
                          PTS
                        </span>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-rust transition-transform" />
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
  const [activeTab, setActiveTab] = useState<"street" | "vert" | "ambos">("ambos");
  const { data: streetRanking = [], isLoading: loadingStreet } = useModalityRanking("street");
  const { data: vertRanking = [], isLoading: loadingVert } = useModalityRanking("vert");
  const { data: scoringConfig } = useScoringConfig();

  return (
    <>
      <PageHero
        eyebrow="Circuito Competitivo A.S.G."
        title="Ranking Oficial"
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
        Classificação oficial e independente das categorias <strong>Street</strong> e{" "}
        <strong>Vert</strong> da Associação dos Skatistas de Guararema. Clique em qualquer skatista
        para abrir seu perfil público completo.
      </PageHero>

      <Section className="space-y-10">
        {/* Seletor de Categorias + Resumo de Pontuação */}
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
            <button
              type="button"
              onClick={() => setActiveTab("street")}
              className={
                activeTab === "street"
                  ? "btn-stamp bg-rust text-cream text-xs px-4 py-2"
                  : "btn-ghost-stamp text-xs px-4 py-2 bg-card"
              }
            >
              <Flame className="h-4 w-4" /> Ranking Street ({streetRanking.length})
            </button>
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

          {scoringConfig && (
            <div className="text-xs text-muted-foreground font-condensed uppercase tracking-wider">
              Pontuação oficial padrão:{" "}
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
    </>
  );
}
