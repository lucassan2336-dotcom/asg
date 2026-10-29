import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Camera,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Images,
  Plus,
  Filter,
  Star,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useGalleryPhotos,
  useSetAlbumCover,
  getAlbumCoverPhoto,
  isAlbumCoverPhoto,
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
      "Álbum de Fotos",
      "Fotos oficiais e álbuns das sessões, eventos e projetos da Associação dos Skatistas de Guararema.",
    ),
  component: GaleriaPage,
});

function AlbumViewerModal({
  photos,
  currentIndex,
  onClose,
  onChangeIndex,
  onEditPhoto,
  onSetCoverPhoto,
  isPhotoCover,
  isDiretoria,
}: {
  photos: GalleryPhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onChangeIndex: (newIndex: number) => void;
  onEditPhoto: (photo: GalleryPhotoItem) => void;
  onSetCoverPhoto: (photo: GalleryPhotoItem) => void;
  isPhotoCover: (photo: GalleryPhotoItem) => boolean;
  isDiretoria: boolean;
}) {
  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  const total = photos.length;
  const hasPrev = total > 1;
  const hasNext = total > 1;
  const currentIsCover = isPhotoCover(currentPhoto);

  const prevPhoto = () => {
    onChangeIndex((currentIndex - 1 + total) % total);
  };

  const nextPhoto = () => {
    onChangeIndex((currentIndex + 1) % total);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "ArrowRight") nextPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, total]);

  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0);
    if (diff > 50) nextPhoto();
    else if (diff < -50) prevPhoto();
    touchStartX.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Visualizador do Álbum - ${currentPhoto.title}`}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-cream backdrop-blur-md animate-fade-in select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barra Superior do Álbum */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream/15 bg-black/40">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-amber/40 bg-amber/20 px-2.5 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-amber">
            <Camera className="h-3.5 w-3.5" /> Álbum A.S.G.
          </span>
          <span className="font-condensed text-xs text-cream/80 tracking-widest uppercase">
            Foto <strong>{currentIndex + 1}</strong> de <strong>{total}</strong>
          </span>
          {currentPhoto.event_name && (
            <span className="hidden sm:inline-block rounded-sm bg-cream/10 px-2 py-0.5 text-xs text-cream/80 font-condensed uppercase tracking-wider">
              {currentPhoto.event_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentIsCover && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-amber bg-amber px-2 py-0.5 font-condensed text-xs font-bold uppercase text-ink">
              <Star className="h-3.5 w-3.5 fill-current" /> Capa do Álbum
            </span>
          )}
          {isDiretoria && !currentIsCover && (
            <button
              onClick={() => onSetCoverPhoto(currentPhoto)}
              className="btn-stamp bg-amber text-ink text-xs inline-flex items-center gap-1 px-2.5 py-1"
              title="Definir esta foto como capa do álbum"
            >
              <Star className="h-3.5 w-3.5" /> Definir como Capa
            </button>
          )}
          {isDiretoria && (
            <button
              onClick={() => onEditPhoto(currentPhoto)}
              className="btn-stamp bg-card text-ink text-xs inline-flex items-center gap-1 px-2.5 py-1"
              title="Editar esta foto do álbum"
            >
              <Edit3 className="h-3.5 w-3.5 text-rust" /> Editar Foto
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full bg-cream/10 p-2 text-cream hover:bg-cream/20 transition-colors"
            title="Fechar álbum (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Foto Central Ampliada */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {hasPrev && (
          <button
            onClick={prevPhoto}
            aria-label="Foto anterior"
            className="absolute left-2 sm:left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-cream/20 bg-black/60 text-cream shadow-stamp hover:bg-black/90 hover:scale-105 transition-all"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="relative max-h-full max-w-5xl flex items-center justify-center">
          <img
            key={currentPhoto.id}
            src={safeImageUrl(currentPhoto.image_url)}
            alt={currentPhoto.title}
            className="max-h-[62vh] sm:max-h-[70vh] w-auto max-w-full object-contain rounded-md border-2 border-cream/20 shadow-2xl transition-all"
          />
        </div>

        {hasNext && (
          <button
            onClick={nextPhoto}
            aria-label="Próxima foto"
            className="absolute right-2 sm:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-cream/20 bg-black/60 text-cream shadow-stamp hover:bg-black/90 hover:scale-105 transition-all"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Legenda e Miniaturas */}
      <div className="border-t border-cream/15 bg-black/60 px-4 py-3 space-y-3">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wider text-cream">
              {currentPhoto.title}
            </h3>
            {currentPhoto.caption && (
              <p className="mt-1 text-xs sm:text-sm text-cream/70 max-w-2xl leading-relaxed">
                {currentPhoto.caption}
              </p>
            )}
          </div>
          <span className="text-[11px] font-condensed tracking-wider uppercase text-cream/50 self-start sm:self-auto">
            Use ← → no teclado ou deslize para navegar
          </span>
        </div>

        {total > 1 && (
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
            {photos.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => onChangeIndex(idx)}
                className={`relative shrink-0 h-12 w-16 overflow-hidden rounded border transition-all ${
                  idx === currentIndex
                    ? "border-amber ring-2 ring-amber/50 scale-105"
                    : "border-cream/20 opacity-50 hover:opacity-90"
                }`}
                title={p.title}
              >
                <img
                  src={safeImageUrl(p.image_url)}
                  alt={p.title}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GaleriaPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("galeria");
  const { data: photos, isLoading } = useGalleryPhotos();
  const setAlbumCoverMutation = useSetAlbumCover();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhotoItem | null>(null);
  const [modalDefaultAlbum, setModalDefaultAlbum] = useState<string | null>(null);
  const [activeAlbumIndex, setActiveAlbumIndex] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const hero = content?.hero;
  const rawList = isDiretoria ? photos || [] : (photos || []).filter((p) => p.published);

  // Extrair álbuns / eventos únicos para filtragem
  const eventsList = Array.from(
    new Set(rawList.map((p) => p.event_name?.trim()).filter(Boolean)),
  ) as string[];

  // Agrupar fotos por álbum para identificar capas e contagens
  const albumsSummary = eventsList.map((albumName) => {
    const albumPhotos = rawList.filter((p) => p.event_name?.trim() === albumName);
    const coverPhoto = getAlbumCoverPhoto(albumPhotos);
    return {
      albumName,
      photos: albumPhotos,
      coverPhoto,
      count: albumPhotos.length,
    };
  });

  // Lista filtrada por evento/álbum
  const filteredList = selectedEvent
    ? rawList.filter((p) => p.event_name?.trim() === selectedEvent)
    : rawList;

  const isPhotoAlbumCover = (photo: GalleryPhotoItem): boolean => {
    const albumKey = photo.event_name?.trim() || null;
    const sameAlbumPhotos = rawList.filter((p) => (p.event_name?.trim() || null) === albumKey);
    return isAlbumCoverPhoto(photo, sameAlbumPhotos);
  };

  const handleSetCover = async (photo: GalleryPhotoItem) => {
    try {
      await setAlbumCoverMutation.mutateAsync({
        photoId: photo.id,
        eventName: photo.event_name?.trim() || null,
      });
      toast.success(
        photo.event_name
          ? `Foto definida como capa do álbum "${photo.event_name}"!`
          : "Foto definida como capa principal!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível definir a capa.");
    }
  };

  const handleNewPhoto = (albumName?: string | null) => {
    setSelectedPhoto(null);
    setModalDefaultAlbum(albumName ?? selectedEvent ?? null);
    setModalOpen(true);
  };

  const handleEditPhoto = (item: GalleryPhotoItem) => {
    setSelectedPhoto(item);
    setModalDefaultAlbum(item.event_name ?? null);
    setModalOpen(true);
  };

  const handleStartAlbumViewer = (index = 0) => {
    if (filteredList.length > 0) {
      setActiveAlbumIndex(index);
    }
  };

  return (
    <>
      <EditablePageToolbar
        pageSlug="galeria"
        pageName="Galeria & Álbum de Fotos"
        addItemLabel="Adicionar Fotos ao Álbum"
        onAddItem={() => handleNewPhoto(selectedEvent)}
      />

      <PageHero
        eyebrow={hero?.eyebrow || "Registros Visuais"}
        title={hero?.title || "Álbum de Fotos"}
      >
        {hero?.description ||
          "Álbum fotográfico das sessões, campeonatos, oficinas e projetos da Associação dos Skatistas de Guararema."}
      </PageHero>

      <Section className="space-y-8">
        {/* Álbuns com Capa Oficial e Botão de Adicionar Mais Fotos */}
        {albumsSummary.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl uppercase flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-rust" /> Álbuns da Galeria
              </h2>
              {selectedEvent && (
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="btn-ghost-stamp text-xs px-3 py-1"
                >
                  Ver Todos os Álbuns ({rawList.length} fotos)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {albumsSummary.map(({ albumName, coverPhoto, count }) => {
                const isSelected = selectedEvent === albumName;
                return (
                  <div
                    key={albumName}
                    onClick={() => setSelectedEvent(isSelected ? null : albumName)}
                    className={`group relative cursor-pointer overflow-hidden rounded-md border-2 bg-card p-2 transition-all hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-rust ring-2 ring-rust/40 shadow-lg"
                        : "border-ink shadow-stamp"
                    }`}
                  >
                    <div className="relative aspect-16/10 w-full overflow-hidden rounded-sm bg-muted border border-ink/20">
                      {coverPhoto ? (
                        <img
                          src={safeImageUrl(coverPhoto.image_url)}
                          alt={`Capa do álbum ${albumName}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm border border-ink bg-amber px-2 py-0.5 font-condensed text-[10px] font-bold uppercase tracking-wider text-ink shadow-xs">
                        <Star className="h-3 w-3 fill-current" /> Capa do Álbum
                      </span>
                      <span className="absolute bottom-2 right-2 rounded-sm bg-black/80 px-2 py-0.5 font-condensed text-[11px] font-bold uppercase text-cream">
                        {count} {count === 1 ? "foto" : "fotos"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <div className="min-w-0">
                        <h3 className="font-display text-base uppercase truncate group-hover:text-rust transition-colors">
                          {albumName}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {isSelected ? "Álbum aberto abaixo" : "Clique para abrir o álbum"}
                        </p>
                      </div>

                      {isDiretoria && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewPhoto(albumName);
                          }}
                          className="btn-stamp bg-amber text-ink text-[11px] px-2 py-1 shrink-0 inline-flex items-center gap-1"
                          title={`Adicionar mais fotos ao álbum ${albumName}`}
                        >
                          <Plus className="h-3 w-3" /> + Fotos
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra de Controle do Álbum */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-ink bg-secondary p-4 shadow-stamp">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-condensed text-xs font-bold uppercase tracking-widest text-muted-foreground mr-1">
              <Filter className="h-3.5 w-3.5 text-rust" /> Filtrar Álbum:
            </span>

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className={
                selectedEvent === null
                  ? "btn-stamp text-xs px-3 py-1.5"
                  : "btn-ghost-stamp text-xs px-3 py-1.5 bg-card"
              }
            >
              Todos os Registros ({rawList.length})
            </button>

            {eventsList.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => setSelectedEvent(ev)}
                className={
                  selectedEvent === ev
                    ? "btn-stamp text-xs px-3 py-1.5"
                    : "btn-ghost-stamp text-xs px-3 py-1.5 bg-card"
                }
              >
                {ev}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {filteredList.length > 0 && (
              <button
                type="button"
                onClick={() => handleStartAlbumViewer(0)}
                className="btn-stamp bg-olive text-cream text-xs inline-flex items-center gap-1.5 shadow-stamp hover:brightness-105"
              >
                <Images className="h-4 w-4" /> Abrir Apresentação do Álbum
              </button>
            )}

            {isDiretoria && (
              <button
                type="button"
                onClick={() => handleNewPhoto(selectedEvent)}
                className="btn-stamp bg-rust text-cream text-xs inline-flex items-center gap-1.5 shadow-stamp hover:brightness-105"
              >
                <Plus className="h-4 w-4" />{" "}
                {selectedEvent ? `Adicionar + Fotos em "${selectedEvent}"` : "Adicionar Fotos"}
              </button>
            )}
          </div>
        </div>

        {/* Grade de Fotos em Estilo Álbum Fotográfico */}
        {isLoading ? (
          <p className="text-muted-foreground">Carregando fotos do álbum…</p>
        ) : filteredList.length === 0 ? (
          <Card className="text-center py-12 text-muted-foreground space-y-3">
            <Camera className="mx-auto h-12 w-12 text-muted-foreground/60" />
            <h3 className="font-display text-2xl uppercase">Nenhuma foto encontrada neste álbum</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isDiretoria
                ? "Envie uma ou várias fotos diretamente do seu computador ou da galeria do celular para compor o álbum."
                : "Em breve novas fotos das sessões e campeonatos da A.S.G. serão publicadas aqui."}
            </p>
            {isDiretoria && (
              <button
                type="button"
                onClick={() => handleNewPhoto(selectedEvent)}
                className="btn-stamp inline-flex items-center gap-1.5 mt-2"
              >
                <Plus className="h-4 w-4" /> Adicionar Fotos ao Álbum
              </button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((photo, index) => {
              const isCover = isPhotoAlbumCover(photo);
              return (
                <div
                  key={photo.id}
                  onClick={() => handleStartAlbumViewer(index)}
                  className={`group relative cursor-pointer overflow-hidden rounded-md border-2 bg-card p-2.5 shadow-stamp transition-all hover:-translate-y-1 hover:shadow-lg ${
                    isCover ? "border-amber ring-2 ring-amber/40" : "border-ink"
                  }`}
                >
                  {/* Moldura da Foto */}
                  <div className="relative aspect-4/3 w-full overflow-hidden rounded-sm bg-muted border border-ink/20">
                    <img
                      src={safeImageUrl(photo.image_url)}
                      alt={photo.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=600&q=80";
                      }}
                    />

                    {/* Overlay ao passar o mouse: Abrir no Álbum */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 rounded-sm border-2 border-cream bg-ink px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wider text-cream shadow-stamp">
                        <Maximize2 className="h-3.5 w-3.5 text-amber" /> Ver no Álbum
                      </span>
                    </div>

                    <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
                      {photo.event_name && (
                        <span className="inline-flex items-center rounded-sm border border-ink bg-amber-400 px-2 py-0.5 font-condensed text-[11px] font-bold uppercase tracking-wider text-ink shadow-xs">
                          {photo.event_name}
                        </span>
                      )}
                      {isCover && (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-ink bg-ink px-2 py-0.5 font-condensed text-[10px] font-bold uppercase tracking-wider text-amber shadow-xs">
                          <Star className="h-3 w-3 fill-current" /> Capa do Álbum
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Legenda & Informações */}
                  <div className="p-2.5 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg uppercase leading-snug group-hover:text-rust transition-colors">
                        {photo.title}
                      </h3>

                      {isDiretoria && (
                        <div className="flex items-center gap-1 shrink-0">
                          {!isCover && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetCover(photo);
                              }}
                              disabled={setAlbumCoverMutation.isPending}
                              className="inline-flex items-center gap-1 rounded border border-ink/40 bg-amber/20 px-2 py-1 font-condensed text-[11px] font-bold uppercase text-ink hover:bg-amber transition-colors"
                              title="Definir esta foto como capa do álbum"
                            >
                              <Star className="h-3 w-3" /> Capa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPhoto(photo);
                            }}
                            className="rounded border border-ink/30 bg-muted p-1 text-xs hover:bg-amber-400 hover:text-ink transition-colors"
                            title="Editar foto do álbum"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {photo.caption && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Visualizador de Álbum em Tela Cheia */}
      {activeAlbumIndex !== null && (
        <AlbumViewerModal
          photos={filteredList}
          currentIndex={activeAlbumIndex}
          onClose={() => setActiveAlbumIndex(null)}
          onChangeIndex={setActiveAlbumIndex}
          onEditPhoto={(photo) => {
            setActiveAlbumIndex(null);
            handleEditPhoto(photo);
          }}
          onSetCoverPhoto={handleSetCover}
          isPhotoCover={isPhotoAlbumCover}
          isDiretoria={isDiretoria}
        />
      )}

      {/* Modal de Adição / Edição da Diretoria */}
      {modalOpen && (
        <GalleryModal
          photo={selectedPhoto}
          defaultEventName={modalDefaultAlbum}
          existingAlbums={eventsList}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
