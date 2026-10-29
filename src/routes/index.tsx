import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, Users, Trophy, HeartHandshake, ArrowRight, Calendar, Sparkles } from "lucide-react";
import { AsgLogo, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import { usePageContent, useSiteEvents, safeInternalLink, type HomeContent } from "@/lib/cms";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";

export const Route = createFileRoute("/")({
  head: () =>
    seo(
      "Início",
      "Associação dos Skatistas de Guararema: comunidade, eventos, campeonatos e projetos sociais sobre rodinhas.",
    ),
  component: Index,
});

const ICON_MAP: Record<string, any> = {
  Users,
  Trophy,
  HeartHandshake,
  Sparkles,
};

function Index() {
  const { content } = usePageContent<HomeContent>("home");
  const { data: events } = useSiteEvents();

  const hero = content?.hero;
  const pillars = content?.pillars || [];
  const ctaBanner = content?.ctaBanner;

  const upcomingEvents = (events || []).filter((e) => e.published).slice(0, 2);

  return (
    <>
      <EditablePageToolbar pageSlug="home" pageName="Página Inicial" />

      <section className="grain-olive border-b-2 border-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="eyebrow mb-4 flex items-center gap-2 text-cream">
              <Star className="h-4 w-4 fill-current" /> {hero?.eyebrow || "Guararema · SP"}{" "}
              <Star className="h-4 w-4 fill-current" />
            </p>
            <h1 className="text-5xl text-cream drop-shadow-[4px_4px_0_var(--ink)] md:text-7xl">
              {hero?.title || "Skate é comunidade."}
            </h1>
            <p className="mt-6 max-w-lg text-lg text-cream/95">
              {hero?.description ||
                "A Associação dos Skatistas de Guararema reúne quem anda, quem apoia e quem acredita no skate como ferramenta de transformação."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={safeInternalLink(hero?.primaryCtaLink, "/associe-se")}
                className="btn-stamp"
              >
                {hero?.primaryCtaText || "Quero me associar"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={safeInternalLink(hero?.secondaryCtaLink, "/sobre")}
                className="btn-ghost-stamp"
              >
                {hero?.secondaryCtaText || "Conheça a A.S.G."}
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <AsgLogo
              alt="Logo da A.S.G. — capivara de boné e óculos sobre um skate"
              className="w-64 rotate-[-4deg] drop-shadow-[6px_6px_0_var(--ink)] md:w-96"
            />
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((item, idx) => {
            const IconComponent = ICON_MAP[item.icon] || Sparkles;
            return (
              <Card key={idx}>
                <IconComponent className="mb-3 h-8 w-8 text-accent" />
                <h3 className="text-2xl">{item.title}</h3>
                <p className="mt-2 text-muted-foreground">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section className="pt-0">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Programação</span>
            <h2 className="text-3xl md:text-4xl">Próximos eventos</h2>
          </div>
          <Link
            to="/eventos"
            className="font-condensed font-bold uppercase text-accent hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((ev) => {
              const dateObj = ev.starts_at ? new Date(ev.starts_at) : null;
              const day = dateObj ? String(dateObj.getDate()).padStart(2, "0") : "--";
              const month = dateObj
                ? dateObj.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()
                : "MÊS";

              return (
                <Card key={ev.id} className="flex gap-5">
                  <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded border-2 border-ink bg-olive text-cream">
                    <span className="font-display text-3xl">{day}</span>
                    <span className="eyebrow text-[0.65rem]">{month}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{ev.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {ev.description}
                    </p>
                    {ev.location && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                        {ev.location}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="col-span-2 text-center text-muted-foreground py-8">
              Nenhum evento agendado no momento. Acompanhe a nossa agenda!
            </Card>
          )}
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          <div className="rounded-md border-2 border-ink bg-ink p-8 text-cream shadow-stamp md:p-12 lg:col-span-8 flex flex-col justify-between">
            <div>
              <h2 className="text-3xl md:text-5xl">{ctaBanner?.title || "Faça parte da A.S.G."}</h2>
              <p className="mt-4 max-w-xl opacity-85">
                {ctaBanner?.description ||
                  "Envie sua solicitação. A diretoria analisa cada pedido e retorna com a aprovação."}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to={safeInternalLink(ctaBanner?.buttonLink, "/associe-se")}
                className="btn-stamp inline-flex"
              >
                {ctaBanner?.buttonText || "Solicitar associação"}
              </Link>
              <Link
                to="/contato"
                className="btn-stamp bg-rust text-cream inline-flex items-center gap-2 hover:brightness-110"
              >
                <HeartHandshake className="h-4 w-4" /> DOAÇÃO
              </Link>
            </div>
          </div>

          <div className="rounded-md border-2 border-ink bg-secondary p-8 shadow-stamp lg:col-span-4 flex flex-col justify-between">
            <div>
              <span className="eyebrow block text-rust">Fortaleça a Cena</span>
              <h3 className="text-2xl md:text-3xl font-display uppercase mt-1">Apoie com PIX</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Toda contribuição apoia diretamente a reforma da pista, oficinas gratuitas e eventos
                para a juventude de Guararema.
              </p>
            </div>
            <div className="mt-6">
              <Link
                to="/contato"
                className="btn-stamp w-full justify-center bg-rust text-cream hover:brightness-110"
              >
                <HeartHandshake className="h-4 w-4" /> DOAÇÃO
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
