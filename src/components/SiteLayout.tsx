import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Menu, X, Star, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles, useSession } from "@/lib/auth";
import { usePwaInstall, PwaInstallModal } from "@/components/PwaManager";
import logo from "@/assets/logo-asg-nova.png.asset.json";

export const NAV = [
  { to: "/", label: "Início" },
  { to: "/sobre", label: "Sobre" },
  { to: "/projetos", label: "Projetos sociais" },
  { to: "/noticias", label: "Notícias" },
  { to: "/eventos", label: "Eventos" },
  { to: "/resultados", label: "Resultados" },
  { to: "/ranking", label: "Ranking" },
  { to: "/galeria", label: "Galeria" },
  { to: "/transparencia", label: "Transparência" },
  { to: "/apoiadores", label: "Apoiadores" },
  { to: "/contato", label: "Contato" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isInstalled, isIos, showIosGuide, setShowIosGuide, triggerInstall } = usePwaInstall();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="site-header sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur transition-all">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Logo alinhada à esquerda com espaçamento adequado */}
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 pr-2 xl:pr-5"
          onClick={() => setOpen(false)}
        >
          <img
            src={logo.url}
            alt="Logo A.S.G."
            className="h-10 w-10 sm:h-11 sm:w-11 object-contain"
          />
          <span className="font-display text-xl tracking-tight whitespace-nowrap">A.S.G.</span>
        </Link>

        {/* Links de navegação desktop uniformes em uma única linha */}
        <nav className="hidden items-center justify-center gap-1 xl:gap-2 2xl:gap-3 lg:flex flex-1 mx-2">
          {NAV.slice(1).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded px-2 py-1 xl:px-2.5 xl:py-1 font-condensed text-xs xl:text-sm font-bold uppercase tracking-wider whitespace-nowrap hover:bg-muted transition-colors"
              activeProps={{ className: "text-accent bg-muted" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Botões de ação alinhados à direita */}
        <div className="flex items-center gap-2 shrink-0">
          {!isInstalled && (
            <button
              type="button"
              onClick={triggerInstall}
              className="btn-ghost-stamp hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 whitespace-nowrap"
              title="Instalar aplicativo oficial da A.S.G."
            >
              <Download className="h-3.5 w-3.5 text-rust" /> App
            </button>
          )}
          {user ? (
            <>
              {roles.includes("diretoria") && (
                <Link
                  to="/diretoria"
                  className="btn-ghost-stamp hidden sm:inline-flex text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  Diretoria
                </Link>
              )}
              <Link
                to="/area"
                className="btn-stamp hidden sm:inline-flex text-xs px-3.5 py-1.5 whitespace-nowrap"
              >
                Minha área
              </Link>
              <button
                onClick={handleSignOut}
                className="btn-ghost-stamp hidden sm:inline-flex text-xs px-3 py-1.5 whitespace-nowrap"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="btn-ghost-stamp hidden sm:inline-flex text-xs px-3 py-1.5 whitespace-nowrap"
              >
                Entrar
              </Link>
              <Link
                to="/associe-se"
                className="btn-stamp hidden sm:inline-flex text-xs px-3.5 py-1.5 whitespace-nowrap"
              >
                Associe-se
              </Link>
            </>
          )}
          <button
            aria-label="Abrir Menu"
            className="lg:hidden flex items-center justify-center rounded-sm border-2 border-ink bg-card p-2 text-ink shadow-stamp-sm hover:bg-muted active:translate-y-0.5 transition-all"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
          <div className="space-y-2 p-4">
            {!isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void triggerInstall();
                }}
                className="btn-ghost-stamp w-full justify-center inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4 text-rust" /> Instalar App A.S.G.
              </button>
            )}
            {user ? (
              <>
                {roles.includes("diretoria") && (
                  <Link
                    to="/diretoria"
                    onClick={() => setOpen(false)}
                    className="btn-ghost-stamp w-full justify-center"
                  >
                    Painel da diretoria
                  </Link>
                )}
                <Link
                  to="/area"
                  onClick={() => setOpen(false)}
                  className="btn-stamp w-full justify-center"
                >
                  Minha área
                </Link>
                <button onClick={handleSignOut} className="btn-ghost-stamp w-full justify-center">
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="btn-ghost-stamp w-full justify-center"
                >
                  Entrar
                </Link>
                <Link
                  to="/associe-se"
                  onClick={() => setOpen(false)}
                  className="btn-stamp w-full justify-center"
                >
                  Quero me associar
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
      <PwaInstallModal open={showIosGuide} onClose={() => setShowIosGuide(false)} isIos={isIos} />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t-4 border-ink bg-ink text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div className="flex items-center gap-4">
          <img src={logo.url} alt="" className="h-20 w-20 object-contain" />
          <div>
            <p className="font-display text-2xl">A.S.G.</p>
            <p className="text-sm opacity-80">Associação dos Skatistas de Guararema</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="opacity-80 hover:opacity-100">
              {n.label}
            </Link>
          ))}
        </div>
        <div className="text-sm opacity-80">
          <p className="eyebrow mb-2 text-olive">Guararema · SP</p>
          <p>Dados institucionais (CNPJ, endereço, diretoria) serão publicados pela associação.</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-cream/15 py-4 text-xs opacity-60">
        <Star className="h-3 w-3" /> © {new Date().getFullYear()} A.S.G.{" "}
        <Star className="h-3 w-3" />
      </div>
    </footer>
  );
}

export function PageHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="grain-olive border-b-2 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <p className="eyebrow mb-3 flex items-center gap-2 text-cream">
          <Star className="h-4 w-4 fill-current" /> {eyebrow}
        </p>
        <h1 className="text-4xl text-cream drop-shadow-[3px_3px_0_var(--ink)] md:text-6xl">
          {title}
        </h1>
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
  return (
    <div className={`rounded-md border-2 border-ink bg-card p-5 shadow-stamp ${className}`}>
      {children}
    </div>
  );
}
