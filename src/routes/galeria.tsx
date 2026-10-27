import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Edit3 } from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useGalleryPhotos,
  safeImageUrl,
  type GenericPageContent,
  type GalleryPhotoItem,
} from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { GalleryModal } from "@/components/CmsModals";

export const Route = createFileRoute("/galeria")({
  head: () =>
    seo(
      "Galeria",
      "Fotos das sessões, eventos e projetos da Associação dos Skatistas de Guararema.",
    ),
  component: GaleriaPage,
});

function GaleriaPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("galeria");
  const { data: photos, isLoading } = useGalleryPhotos();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhotoItem | null>(null);

  const hero = content?.hero;
  const list = isDiretoria ? photos || [] : (photos || []).filter((p) => p.published);

  const handleNewPhoto = () => {
    setSelectedPhoto(null);
    setModalOpen(true);
  };

  const handleEditPhoto = (item: GalleryPhotoItem) => {
    setSelectedPhoto(item);
    setModalOpen(true);
  };

  return (
    <>
      <EditablePageToolbar
        pageSlug="galeria"
        pageName="Galeria de Fotos"
        addItemLabel="Adicionar Foto"
        onAddItem={handleNewPhoto}
      />

      <PageHero eyebrow={hero?.eyebrow || "Registros"} title={hero?.title || "Galeria"}>
        {hero?.description ||
          "Fotos das sessões, eventos e projetos da Associação dos Skatistas de Guararema."}
      </PageHero>

      <Section>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando fotos…</p>
        ) : list.length === 0 ? (
          <Card className="text-center py-10 text-muted-foreground">
            <Camera className="mx-auto mb-2 h-10 w-10 text-muted-foreground/60" />
            Nenhuma foto cadastrada na galeria no momento.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {list.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-md border-2 border-ink bg-card shadow-stamp transition-transform hover:-translate-y-1"
              >
                <div className="aspect-4/3 w-full overflow-hidden bg-muted">
                  <img
                    src={
                      safeImageUrl(photo.image_url) ||
                      "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=600&q=80"
                    }
                    alt={photo.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=600&q=80";
                    }}
                  />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {photo.event_name && (
                        <span className="eyebrow text-accent block mb-1">{photo.event_name}</span>
                      )}
                      <h3 className="font-bold text-lg leading-snug">{photo.title}</h3>
                    </div>

                    {isDiretoria && (
                      <button
                        onClick={() => handleEditPhoto(photo)}
                        className="rounded bg-muted p-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
                        title="Editar foto"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {photo.caption && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {modalOpen && <GalleryModal photo={selectedPhoto} onClose={() => setModalOpen(false)} />}
    </>
  );
}
