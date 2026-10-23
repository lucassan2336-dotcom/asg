import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Menu, X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles, useSession } from "@/lib/auth";
import logo from "@/assets/logo-asg.png.asset.json";

export const NAV = [
  { to: "/", label: "Início" },
  { to: "/sobre", label: "Sobre" },
  { to: "/projetos", label: "Projetos sociais" },
  { to: "/noticias", label: "Notícias" },
  { to: "/eventos", label: "Eventos" },
  { to: "/resultados", label: "Resultados" },
  { to: "/galeria", label: "Galeria" },
  { to: "/apoiadores", label: "Apoiadores" },
  { to: "/contato", label: "Contato" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src={logo.url} alt="Logo A.S.G." className="h-12 w-12 rounded-full" />
          <span className="font-display text-xl">A.S.G.</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.slice(1).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded px-2 py-1 font-condensed text-sm font-semibold uppercase tracking-wide hover:bg-muted"
              activeProps={{ className: "text-accent" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/associe-se" className="btn-stamp hidden sm:inline-flex">Associe-se</Link>
          <button aria-label="Menu" className="lg:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t-2 border-ink bg-cream lg:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className="block border-b border-border px-5 py-3 font-condensed text-lg font-semibold uppercase"
              activeProps={{ className: "text-accent" }}
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
          <div className="p-4">
            <Link to="/associe-se" onClick={() => setOpen(false)} className="btn-stamp w-full justify-center">
              Quero me associar
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t-4 border-ink bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div className="flex items-center gap-4">
          <img src={logo.url} alt="" className="h-20 w-20 rounded-full" />
          <div>
            <p className="font-display text-2xl">A.S.G.</p>
            <p className="text-sm opacity-80">Associação dos Skatistas de Guararema</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="opacity-80 hover:opacity-100">{n.label}</Link>
          ))}
        </div>
        <div className="text-sm opacity-80">
          <p className="eyebrow mb-2 text-olive">Guararema · SP</p>
          <p>Dados institucionais (CNPJ, endereço, diretoria) serão publicados pela associação.</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-cream/15 py-4 text-xs opacity-60">
        <Star className="h-3 w-3" /> © {new Date().getFullYear()} A.S.G. <Star className="h-3 w-3" />
      </div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="grain-olive border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <p className="eyebrow mb-3 flex items-center gap-2 text-cream">
          <Star className="h-4 w-4 fill-current" /> {eyebrow}
        </p>
        <h1 className="text-4xl text-cream drop-shadow-[3px_3px_0_var(--ink)] md:text-6xl">{title}</h1>
        {children && <div className="mt-4 max-w-2xl text-lg text-cream/90">{children}</div>}
      </div>
    </section>
  );
}

export function DemoTag() {
  return (
    <span className="inline-block rounded-sm border border-ink bg-cream px-2 py-0.5 font-condensed text-[0.7rem] font-bold uppercase tracking-widest text-ink">
      Exemplo
    </span>
  );
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-8 rounded-md border-2 border-dashed border-olive-dark bg-muted p-4 text-sm text-muted-foreground">
      <strong className="text-foreground">Conteúdo demonstrativo.</strong>{" "}
      {children ?? "Os itens abaixo são exemplos de layout e não representam fatos reais."}
    </div>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-4 py-12 ${className}`}>{children}</section>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border-2 border-ink bg-card p-5 shadow-stamp ${className}`}>{children}</div>;
}
