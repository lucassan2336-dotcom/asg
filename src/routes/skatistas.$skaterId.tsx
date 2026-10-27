import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Edit3, Sparkles, Trophy, Award, Clock } from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import { usePublicSkaterProfile } from "@/lib/ranking";
import { useSession } from "@/lib/auth";
import {
  ChampionshipMedalBadge,
  ModalityBadge,
  RankingTrophyBadge,
  SkaterAvatar,
} from "@/components/TrophyBadges";

export const Route = createFileRoute("/skatistas/$skaterId")({
  head: () =>
    seo(
      "Perfil Público do Skatista",
      "Ficha oficial, pontuação no ranking, troféus e histórico em campeonatos da A.S.G.",
    ),
  component: PublicSkaterProfilePage,
});

function PublicSkaterProfilePage() {
  const { skaterId } = Route.useParams();
  const { user } = useSession();
  const { data, isLoading } = usePublicSkaterProfile(skaterId);

  if (isLoading) {
    return (
      <>
        <PageHero eyebrow="Perfil Competitivo" title="Carregando skatista…">
          Buscando dados oficiais do ranking e histórico de campeonatos.
        </PageHero>
        <Section>
          <p className="text-muted-foreground">Carregando perfil…</p>
        </Section>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHero eyebrow="Perfil não encontrado" title="Skatista não localizado">
          O perfil consultado não está ativo ou não existe no Ranking da A.S.G.
        </PageHero>
        <Section>
          <Link to="/ranking" className="btn-stamp inline-flex">
            <ArrowLeft className="h-4 w-4" /> Voltar para o Ranking
          </Link>
        </Section>
      </>
    );
  }

  const { skater, history } = data;
  const isOwner = Boolean(user?.id && user.id === skater.user_id);

  return (
    <>
      <section className="border-b-2 border-ink bg-ink text-cream">
        <div className="container py-10 md:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Link
              to="/ranking"
              className="inline-flex items-center gap-1.5 font-condensed text-xs font-bold uppercase tracking-widest text-cream/80 hover:text-amber"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar ao Ranking{" "}
              {skater.modality === "street" ? "Street" : "Vert"}
            </Link>

            {isOwner && (
              <Link
                to="/area"
                className="inline-flex items-center gap-1.5 rounded-sm border-2 border-cream bg-rust px-3 py-1.5 font-condensed text-xs font-bold uppercase tracking-wider text-cream hover:brightness-110"
              >
                <Edit3 className="h-3.5 w-3.5" /> Editar meu perfil
              </Link>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <SkaterAvatar
                name={skater.full_name}
                avatarUrl={skater.avatar_url}
                size="xl"
                trophyTier={skater.trophy_tier}
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <ModalityBadge modality={skater.modality} />
                  <RankingTrophyBadge tier={skater.trophy_tier} size="md" />
                </div>

                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl uppercase leading-none text-cream">
                  {skater.full_name}
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-cream/80">
                  {skater.age != null && (
                    <span className="rounded-sm border border-cream/20 bg-cream/10 px-2.5 py-1 font-condensed uppercase tracking-wider">
                      Idade: <strong>{skater.age} anos</strong>
                    </span>
                  )}
                  {skater.years_practicing && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-cream/20 bg-cream/10 px-2.5 py-1 font-condensed uppercase tracking-wider">
                      <Clock className="h-3.5 w-3.5 text-amber" /> Tempo de skate:{" "}
                      <strong>{skater.years_practicing}</strong>
                    </span>
                  )}
                  {skater.favorite_trick && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-amber/40 bg-amber/15 px-2.5 py-1 font-condensed uppercase tracking-wider text-amber">
                      <Sparkles className="h-3.5 w-3.5" /> Manobra:{" "}
                      <strong>{skater.favorite_trick}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Painel de Classificação Oficial no Ranking */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4 rounded-md border-2 border-cream/25 bg-cream/5 p-5">
              <div className="border-r border-cream/15 pr-4">
                <span className="block font-condensed text-xs font-bold uppercase tracking-widest text-cream/70">
                  Posição no Ranking {skater.modality === "street" ? "Street" : "Vert"}
                </span>
                <p className="mt-1 font-display text-5xl text-amber">{skater.rank_position}º</p>
                <span className="text-[11px] text-cream/60">
                  {skater.trophy_tier
                    ? `Pódio Oficial (${skater.trophy_tier.toUpperCase()})`
                    : "Classificação Geral"}
                </span>
              </div>

              <div className="pl-2">
                <span className="block font-condensed text-xs font-bold uppercase tracking-widest text-cream/70">
                  Pontuação Acumulada
                </span>
                <p className="mt-1 font-display text-5xl text-cream">
                  {skater.total_points}{" "}
                  <span className="font-condensed text-xl text-cream/70">PTS</span>
                </p>
                <span className="text-[11px] text-cream/60">
                  {skater.first_places}x 1º • {skater.second_places}x 2º • {skater.third_places}x 3º
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section className="space-y-8">
        {/* Diferenciação visual clara entre Troféu de Ranking Atual e Medalhas Históricas */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-amber text-ink shadow-stamp">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <span className="eyebrow">Troféu de Classificação Atual</span>
              <h2 className="text-xl mt-0.5">
                {skater.trophy_tier === "ouro"
                  ? "Detentor do Troféu de Ouro (1º Lugar Atual)"
                  : skater.trophy_tier === "prata"
                    ? "Detentor do Troféu de Prata (2º Lugar Atual)"
                    : skater.trophy_tier === "bronze"
                      ? "Detentor do Troféu de Bronze (3º Lugar Atual)"
                      : `Atualmente na ${skater.rank_position}ª colocação geral`}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Os troféus de Ouro, Prata e Bronze do ranking acompanham dinamicamente os 3
                primeiros colocados da modalidade{" "}
                <strong>{skater.modality === "street" ? "Street" : "Vert"}</strong>.
              </p>
            </div>
          </Card>

          <Card className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-secondary text-ink shadow-stamp">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="eyebrow">Colocações Históricas em Campeonatos</span>
              <h2 className="text-xl mt-0.5">
                {history.length}{" "}
                {history.length === 1
                  ? "pódio oficial conquistado"
                  : "pódios oficiais conquistados"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Medalhas históricas registram permanentemente a colocação e os pontos obtidos pelo
                skatista em cada campeonato oficial da A.S.G.
              </p>
            </div>
          </Card>
        </div>

        {/* Histórico de Resultados em Campeonatos */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <span className="eyebrow">Currículo Competitivo</span>
              <h2 className="text-2xl md:text-3xl">Histórico de Campeonatos</h2>
            </div>
            <Link to="/resultados" className="btn-ghost-stamp text-xs">
              Ver todos os campeonatos
            </Link>
          </div>

          {history.length === 0 ? (
            <div className="rounded-md border border-dashed border-border py-10 text-center text-muted-foreground">
              Este skatista ainda não possui resultados publicados em pódios de campeonatos.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border-2 border-ink bg-card shadow-stamp">
              <table className="w-full text-left">
                <thead className="bg-ink text-cream">
                  <tr>
                    <th className="eyebrow px-4 py-3">Campeonato / Evento</th>
                    <th className="eyebrow px-4 py-3">Data</th>
                    <th className="eyebrow px-4 py-3">Modalidade</th>
                    <th className="eyebrow px-4 py-3">Medalha Histórica</th>
                    <th className="eyebrow px-4 py-3 text-right">Pontos Conquistados</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      key={item.championship_id}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold">{item.championship_name}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(item.event_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ModalityBadge modality={item.modality} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <ChampionshipMedalBadge placement={item.placement} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rust whitespace-nowrap">
                        +{item.points_awarded} PTS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>
    </>
  );
}
