import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, Users, Trophy, HeartHandshake, ArrowRight } from "lucide-react";
import logo from "@/assets/logo-asg.png.asset.json";
import { Section, Card, DemoTag } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => seo("Início", "Associação dos Skatistas de Guararema: comunidade, eventos, campeonatos e projetos sociais sobre rodinhas."),
  component: Index,
});

function Index() {
  return (
    <>
      <section className="grain-olive border-b-2 border-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="eyebrow mb-4 flex items-center gap-2 text-cream">
              <Star className="h-4 w-4 fill-current" /> Guararema · SP <Star className="h-4 w-4 fill-current" />
            </p>
            <h1 className="text-5xl text-cream drop-shadow-[4px_4px_0_var(--ink)] md:text-7xl">
              Skate é comunidade.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-cream/95">
              A Associação dos Skatistas de Guararema reúne quem anda, quem apoia e quem acredita no skate como ferramenta de transformação.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/associe-se" className="btn-stamp">Quero me associar <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/sobre" className="btn-ghost-stamp">Conheça a A.S.G.</Link>
            </div>
          </div>
          <div className="flex justify-center">
            <img src={logo.url} alt="Logo da A.S.G. — capivara de boné e óculos sobre um skate" className="w-64 rotate-[-4deg] rounded-full bg-card shadow-stamp md:w-96" />
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Users, t: "Comunidade", d: "Encontros, sessões coletivas e um espaço para todas as idades." },
            { icon: Trophy, t: "Eventos", d: "Campeonatos e eventos que movimentam a cena local." },
            { icon: HeartHandshake, t: "Projetos sociais", d: "Iniciativas que levam o skate a crianças e jovens." },
          ].map(({ icon: Icon, t, d }) => (
            <Card key={t}>
              <Icon className="mb-3 h-8 w-8 text-accent" />
              <h3 className="text-2xl">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-3xl md:text-4xl">Próximos eventos</h2>
          <Link to="/eventos" className="font-condensed font-bold uppercase text-accent">Ver todos →</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {["Sessão aberta na pista", "Campeonato amador"].map((t, i) => (
            <Card key={t} className="flex gap-5">
              <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded border-2 border-ink bg-olive text-cream">
                <span className="font-display text-3xl">{i ? "12" : "05"}</span>
                <span className="eyebrow text-[0.65rem]">mês</span>
              </div>
              <div>
                <DemoTag />
                <h3 className="mt-2 text-xl">{t}</h3>
                <p className="text-sm text-muted-foreground">Data e local a definir pela diretoria.</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-md border-2 border-ink bg-ink p-8 text-cream shadow-stamp md:p-12">
          <h2 className="text-3xl md:text-5xl">Faça parte da A.S.G.</h2>
          <p className="mt-4 max-w-xl opacity-85">Envie sua solicitação. A diretoria analisa cada pedido e retorna com a aprovação.</p>
          <Link to="/associe-se" className="btn-stamp mt-6">Solicitar associação</Link>
        </div>
      </Section>
    </>
  );
}
