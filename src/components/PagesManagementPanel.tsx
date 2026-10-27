import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  ExternalLink,
  Edit3,
  Plus,
  HeartHandshake,
  Newspaper,
  Calendar,
  Trophy,
  Camera,
  Layers,
} from "lucide-react";
import { Card } from "@/components/SiteLayout";
import {
  useProjects,
  useNewsArticles,
  useSiteEvents,
  useCompetitionResults,
  useGalleryPhotos,
  useSponsors,
} from "@/lib/cms";
import {
  ProjectModal,
  NewsModal,
  EventModal,
  ResultModal,
  GalleryModal,
  SponsorModal,
} from "@/components/CmsModals";
import { EditPageModal } from "@/components/EditablePageToolbar";

interface PageMeta {
  slug: string;
  name: string;
  path: string;
  description: string;
  icon: any;
  hasCollection?: boolean;
}

const PAGES: PageMeta[] = [
  {
    slug: "home",
    name: "Início",
    path: "/",
    description: "Hero principal, 3 pilares de destaque, próximos eventos e banner de convite.",
    icon: Layers,
  },
  {
    slug: "sobre",
    name: "Sobre a Associação",
    path: "/sobre",
    description:
      "Missão, Visão, Valores, história oficial da associação e composição da diretoria.",
    icon: FileText,
  },
  {
    slug: "projetos",
    name: "Projetos Sociais",
    path: "/projetos",
    description: "Iniciativas sociais e esportivas voltadas a crianças e à comunidade.",
    icon: HeartHandshake,
    hasCollection: true,
  },
  {
    slug: "noticias",
    name: "Notícias e Comunicados",
    path: "/noticias",
    description: "Artigos, novidades, editais e matérias oficiais da A.S.G.",
    icon: Newspaper,
    hasCollection: true,
  },
  {
    slug: "eventos",
    name: "Eventos e Campeonatos",
    path: "/eventos",
    description: "Calendário de sessões abertas, campeonatos e oficinas com inscrições.",
    icon: Calendar,
    hasCollection: true,
  },
  {
    slug: "resultados",
    name: "Resultados e Pódios",
    path: "/resultados",
    description: "Classificações, notas, pódios e rankings dos campeonatos.",
    icon: Trophy,
    hasCollection: true,
  },
  {
    slug: "galeria",
    name: "Galeria de Fotos",
    path: "/galeria",
    description: "Acervo fotográfico das sessões, campeonatos e ações comunitárias.",
    icon: Camera,
    hasCollection: true,
  },
  {
    slug: "apoiadores",
    name: "Apoiadores e Parceiros",
    path: "/apoiadores",
    description: "Marcas parceiras, skate shops e empresas apoiadoras da associação.",
    icon: HeartHandshake,
    hasCollection: true,
  },
  {
    slug: "contato",
    name: "Contato Oficial",
    path: "/contato",
    description: "Canais de atendimento, e-mail, redes sociais, telefone e endereço da pista.",
    icon: FileText,
  },
];

export function PagesManagementPanel() {
  const { data: projects } = useProjects();
  const { data: news } = useNewsArticles();
  const { data: events } = useSiteEvents();
  const { data: results } = useCompetitionResults();
  const { data: gallery } = useGalleryPhotos();
  const { data: sponsors } = useSponsors();

  // Modals state
  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [sponsorModalOpen, setSponsorModalOpen] = useState(false);

  const getStats = (slug: string) => {
    switch (slug) {
      case "projetos":
        return `${projects?.length || 0} projetos`;
      case "noticias":
        return `${news?.length || 0} notícias`;
      case "eventos":
        return `${events?.length || 0} eventos`;
      case "resultados":
        return `${results?.length || 0} resultados`;
      case "galeria":
        return `${gallery?.length || 0} fotos`;
      case "apoiadores":
        return `${sponsors?.length || 0} apoiadores`;
      default:
        return null;
    }
  };

  const handleOpenCollectionModal = (slug: string) => {
    switch (slug) {
      case "projetos":
        setProjectModalOpen(true);
        break;
      case "noticias":
        setNewsModalOpen(true);
        break;
      case "eventos":
        setEventModalOpen(true);
        break;
      case "resultados":
        setResultModalOpen(true);
        break;
      case "galeria":
        setGalleryModalOpen(true);
        break;
      case "apoiadores":
        setSponsorModalOpen(true);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold font-display">Gerenciamento de Conteúdo do Site</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as páginas do site são editáveis exclusivamente pela diretoria. Você pode editar
            os textos diretamente aqui ou navegar até a página desejada.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PAGES.map((page) => {
          const Icon = page.icon;
          const stats = getStats(page.slug);

          return (
            <Card key={page.slug} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-condensed uppercase font-bold text-xs text-accent">
                    <Icon className="h-4 w-4" />
                    Página
                  </span>
                  {stats && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium">
                      {stats}
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-xl font-bold">{page.name}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {page.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-2">
                <Link
                  to={page.path}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-accent"
                >
                  Ver página <ExternalLink className="h-3 w-3" />
                </Link>

                <div className="flex items-center gap-2">
                  {page.hasCollection && (
                    <button
                      onClick={() => handleOpenCollectionModal(page.slug)}
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-semibold hover:bg-muted/80"
                      title="Adicionar item"
                    >
                      <Plus className="h-3 w-3" /> Novo
                    </button>
                  )}
                  <button
                    onClick={() => setEditingPageSlug(page.slug)}
                    className="btn-stamp py-1 px-2.5 text-xs inline-flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" /> Editar
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Page Text Modal */}
      {editingPageSlug && (
        <EditPageModal
          pageSlug={editingPageSlug}
          pageName={PAGES.find((p) => p.slug === editingPageSlug)?.name || ""}
          onClose={() => setEditingPageSlug(null)}
        />
      )}

      {/* Collection Modals */}
      {projectModalOpen && <ProjectModal onClose={() => setProjectModalOpen(false)} />}
      {newsModalOpen && <NewsModal onClose={() => setNewsModalOpen(false)} />}
      {eventModalOpen && <EventModal onClose={() => setEventModalOpen(false)} />}
      {resultModalOpen && <ResultModal onClose={() => setResultModalOpen(false)} />}
      {galleryModalOpen && <GalleryModal onClose={() => setGalleryModalOpen(false)} />}
      {sponsorModalOpen && <SponsorModal onClose={() => setSponsorModalOpen(false)} />}
    </div>
  );
}
