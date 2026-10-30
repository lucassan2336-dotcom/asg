import { useEffect, useState } from "react";
import { Download, Smartphone, Share, PlusSquare, X } from "lucide-react";
import logo from "@/assets/logo-asg-nova.png.asset.json";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_STORAGE_KEY = "asg_pwa_banner_dismissed_v1";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Registrar Service Worker do PWA
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // ignora erro em ambientes de preview sem HTTPS
        });
      });
      if (document.readyState === "complete") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }

    // 2. Verificar se já está rodando instalado em modo standalone
    const standaloneMatch =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      Boolean((window.navigator as any).standalone);
    setIsInstalled(standaloneMatch);

    // 3. Detectar iOS (iPhone / iPad)
    const ua = window.navigator.userAgent || "";
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(iosDevice);

    try {
      const dismissed = localStorage.getItem(DISMISS_STORAGE_KEY) === "1";
      setBannerDismissed(dismissed);
    } catch {
      setBannerDismissed(false);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
      return;
    }
    setShowIosGuide(true);
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch {
      // ignora erro de storage
    }
  };

  const canInstall = !isInstalled && (Boolean(deferredPrompt) || isIos);

  return {
    canInstall,
    isInstalled,
    isIos,
    hasNativePrompt: Boolean(deferredPrompt),
    showIosGuide,
    setShowIosGuide,
    bannerDismissed,
    triggerInstall,
    dismissBanner,
  };
}

export function PwaInstallModal({
  open,
  onClose,
  isIos,
}: {
  open: boolean;
  onClose: () => void;
  isIos: boolean;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Como instalar o aplicativo A.S.G."
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2.5">
            <img src={logo.url} alt="A.S.G." className="h-9 w-9 object-contain" />
            <div>
              <span className="eyebrow block text-[10px]">Aplicativo Oficial</span>
              <h2 className="font-display text-xl uppercase leading-none">Instalar App A.S.G.</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <p className="text-muted-foreground">
            Adicione o aplicativo da <strong>Associação dos Skatistas de Guararema</strong> à tela
            inicial do seu aparelho para acesso rápido ao Ranking, Galeria e sua Carteira A.S.G.:
          </p>

          {isIos ? (
            <ol className="space-y-3 rounded-md border border-ink/30 bg-secondary p-4">
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-condensed text-xs font-bold text-amber">
                  1
                </span>
                <span>
                  Toque no botão <strong>Compartilhar</strong>{" "}
                  <Share className="inline h-4 w-4 text-rust" /> na barra do Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-condensed text-xs font-bold text-amber">
                  2
                </span>
                <span>
                  Role as opções e selecione <strong>Adicionar à Tela de Início</strong>{" "}
                  <PlusSquare className="inline h-4 w-4 text-rust" />.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-condensed text-xs font-bold text-amber">
                  3
                </span>
                <span>
                  Toque em <strong>Adicionar</strong> no canto superior direito.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 rounded-md border border-ink/30 bg-secondary p-4">
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-condensed text-xs font-bold text-amber">
                  1
                </span>
                <span>
                  No menu do navegador (ícone <strong>⋮</strong> ou barra de endereço), clique em{" "}
                  <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-condensed text-xs font-bold text-amber">
                  2
                </span>
                <span>
                  Confirme clicando em <strong>Instalar</strong> para criar o atalho oficial da
                  A.S.G.
                </span>
              </li>
            </ol>
          )}

          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-stamp text-xs">
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PwaInstallBanner() {
  const {
    canInstall,
    isInstalled,
    isIos,
    showIosGuide,
    setShowIosGuide,
    bannerDismissed,
    triggerInstall,
    dismissBanner,
  } = usePwaInstall();

  if (isInstalled) return null;

  return (
    <>
      {canInstall && !bannerDismissed && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-40 rounded-md border-2 border-ink bg-ink text-cream p-3.5 shadow-stamp">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={logo.url}
                alt="App A.S.G."
                className="h-11 w-11 shrink-0 rounded border border-cream/20 bg-cream/10 p-1 object-contain"
              />
              <div>
                <span className="inline-flex items-center gap-1 font-condensed text-[10px] font-bold uppercase tracking-widest text-amber">
                  <Smartphone className="h-3 w-3" /> App Oficial A.S.G.
                </span>
                <h3 className="font-display text-base uppercase leading-tight text-cream">
                  Instale a A.S.G. no celular
                </h3>
                <p className="text-xs text-cream/75 mt-0.5">
                  Acesso rápido ao Ranking, Galeria e Carteira de Skatista.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dispensar aviso de instalação"
              className="rounded p-1 text-cream/60 hover:text-cream"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dismissBanner}
              className="px-2.5 py-1 font-condensed text-xs uppercase text-cream/70 hover:text-cream"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={triggerInstall}
              className="btn-stamp bg-amber text-ink text-xs px-3 py-1 inline-flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Instalar App
            </button>
          </div>
        </div>
      )}

      <PwaInstallModal open={showIosGuide} onClose={() => setShowIosGuide(false)} isIos={isIos} />
    </>
  );
}
