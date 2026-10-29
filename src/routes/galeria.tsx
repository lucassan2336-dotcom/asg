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
  Star,
  FolderOpen,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useGalleryPhotos,
  useGalleryAlbums,
  useSetAlbumCover,
  getAlbumCoverPhoto,
  isAlbumCoverPhoto,
  safeImageUrl,
  type GenericPageContent,
  type GalleryPhotoItem,
  type GalleryAlbumItem,
} from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { GalleryModal, AlbumFormModal } from "@/components/CmsModals";

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

const DEFAULT_ALBUM_FALLBACK = "Registros Gerais A.S.G.";

function getPhotoAlbumName(photo: GalleryPhotoItem): string {
  return photo.event_name?.trim() || DEFAULT_ALBUM_FALLBACK;
}

function GaleriaPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("galeria");
  const { data: photos, isLoading } = useGalleryPhotos();
  const { data: savedAlbums = [] } = useGalleryAlbums();
  const setAlbumCoverMutation = useSetAlbumCover();

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhotoItem | null>(null);
  const [modalDefaultAlbum, setModalDefaultAlbum] = useState<string | null>(null);

  const [albumModalOpen, setAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<GalleryAlbumItem | null>(null);

  const [activeAlbumIndex, setActiveAlbumIndex] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const hero = content?.hero;
  const rawList = isDiretoria ? photos || [] : (photos || []).filter((p) => p.published);

  // Unificar álbuns criados explicitamente + álbuns existentes nas fotos
  const albumNamesSet = new Set<string>();
  for (const alb of savedAlbums) {
    if (alb.name?.trim()) albumNamesSet.add(alb.name.trim());
  }
  for (const p of rawList) {
    albumNamesSet.add(getPhotoAlbumName(p));
  }
  const eventsList = Array.from(albumNamesSet);

  // Resumo completo de cada álbum (capa, descrição, fotos e contagem)
  const albumsSummary = eventsList.map((albumName) => {
    const albumMeta = savedAlbums.find(
      (a) => a.name.trim().toLowerCase() === albumName.toLowerCase(),
    );
    const albumPhotos = rawList.filter((p) => getPhotoAlbumName(p) === albumName);
    const coverFromPhotos = getAlbumCoverPhoto(albumPhotos);
    const coverImageUrl = coverFromPhotos?.image_url || albumMeta?.cover_url || null;

    return {
      albumName,
      albumMeta: albumMeta || {
        id: `alb-${albumName}`,
        name: albumName,
        description: null,
        cover_url: coverImageUrl,
      },
      description: albumMeta?.description || null,
      photos: albumPhotos,
      coverPhoto: coverFromPhotos,
      coverImageUrl,
      count: albumPhotos.length,
    };
  });

  const activeAlbumSummary = selectedEvent
    ? albumsSummary.find((a) => a.albumName === selectedEvent) || null
    : null;

  // Fotos do álbum atualmente aberto
  const filteredList = selectedEvent
    ? rawList.filter((p) => getPhotoAlbumName(p) === selectedEvent)
    : [];

  const isPhotoAlbumCover = (photo: GalleryPhotoItem): boolean => {
    const albumKey = getPhotoAlbumName(photo);
    const sameAlbumPhotos = rawList.filter((p) => getPhotoAlbumName(p) === albumKey);
    return isAlbumCoverPhoto(photo, sameAlbumPhotos);
  };

  const handleSetCover = async (photo: GalleryPhotoItem) => {
    try {
      const albumKey = getPhotoAlbumName(photo);
      await setAlbumCoverMutation.mutateAsync({
        photoId: photo.id,
        eventName: photo.event_name?.trim() || null,
        imageUrl: photo.image_url,
      });
      toast.success(`Foto definida como capa do álbum "${albumKey}"!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível definir a capa.");
    }
  };

  const handleOpenCreateAlbum = () => {
    setEditingAlbum(null);
    setAlbumModalOpen(true);
  };

  const handleOpenEditAlbum = (albumMeta: GalleryAlbumItem) => {
    setEditingAlbum(albumMeta);
    setAlbumModalOpen(true);
  };

  const handleAddPhotosToAlbum = (albumName: string) => {
    setSelectedPhoto(null);
    setModalDefaultAlbum(albumName === DEFAULT_ALBUM_FALLBACK ? "" : albumName);
    setPhotoModalOpen(true);
  };

  const handleEditPhoto = (item: GalleryPhotoItem) => {
    setSelectedPhoto(item);
    setModalDefaultAlbum(item.event_name ?? null);
    setPhotoModalOpen(true);
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
        pageName="Galeria & Álbuns de Fotos"
        addItemLabel={selectedEvent ? `Adicionar Fotos em "${selectedEvent}"` : "Criar Novo Álbum"}
        onAddItem={() =>
          selectedEvent ? handleAddPhotosToAlbum(selectedEvent) : handleOpenCreateAlbum()
        }
      />

      <PageHero
        eyebrow={hero?.eyebrow || "Registros Visuais"}
        title={selectedEvent ? selectedEvent : hero?.title || "Álbuns de Fotos"}
      >
        {selectedEvent
          ? activeAlbumSummary?.description ||
            `Confira todas as fotos registradas no álbum "${selectedEvent}".`
          : hero?.description ||
            "Escolha um álbum abaixo para visualizar todas as fotos das sessões, campeonatos, oficinas e projetos da A.S.G."}
      </PageHero>

      <Section className="space-y-8">
        {selectedEvent === null ? (
          /* =========================================================
           * TELA 1: APENAS OS ÁLBUNS (ACESSO AOS ÁLBUNS COM CAPA)
           * ========================================================= */
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-ink bg-secondary p-4 shadow-stamp">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="h-5 w-5 text-rust shrink-0" />
                <div>
                  <h2 className="font-display text-xl uppercase leading-none">
                    Selecione um Álbum ({albumsSummary.length})
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clique em qualquer álbum abaixo para abrir e ver todas as fotos dele.
                  </p>
                </div>
              </div>

              {isDiretoria && (
                <button
                  type="button"
                  onClick={handleOpenCreateAlbum}
                  className="btn-stamp bg-rust text-cream text-xs inline-flex items-center gap-1.5 shadow-stamp hover:brightness-105"
                >
                  <FolderPlus className="h-4 w-4" /> Criar Novo Álbum
                </button>
              )}
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Carregando álbuns da galeria…</p>
            ) : albumsSummary.length === 0 ? (
              <Card className="text-center py-14 text-muted-foreground space-y-3">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/60" />
                <h3 className="font-display text-2xl uppercase">Nenhum álbum publicado ainda</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isDiretoria
                    ? "Crie o primeiro álbum da galeria, escolha uma foto de capa e adicione as fotos do evento."
                    : "Em breve novos álbuns das sessões e campeonatos da A.S.G. serão publicados aqui."}
                </p>
                {isDiretoria && (
                  <button
                    type="button"
                    onClick={handleOpenCreateAlbum}
                    className="btn-stamp inline-flex items-center gap-1.5 mt-2"
                  >
                    <FolderPlus className="h-4 w-4" /> Criar Primeiro Álbum
                  </button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {albumsSummary.map(
                  ({ albumName, albumMeta, description, coverImageUrl, count }) => (
                    <div
                      key={albumName}
                      onClick={() => setSelectedEvent(albumName)}
                      className="group relative flex flex-col justify-between cursor-pointer overflow-hidden rounded-md border-2 border-ink bg-card p-3 shadow-stamp transition-all hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div>
                        {/* Capa do Álbum */}
                        <div className="relative aspect-4/3 w-full overflow-hidden rounded-sm bg-muted border border-ink/20">
                          {coverImageUrl ? (
                            <img
                              src={safeImageUrl(coverImageUrl)}
                              alt={`Capa do álbum ${albumName}`}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=600&q=80";
                              }}
                            />
                          ) : (
                            <div className="flex flex-col h-full w-full items-center justify-center gap-2 text-muted-foreground">
                              <Camera className="h-10 w-10 opacity-50" />
                              <span className="font-condensed text-xs uppercase">
                                Álbum sem capa
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="inline-flex items-center gap-1.5 rounded-sm border-2 border-cream bg-ink px-3.5 py-1.5 font-condensed text-xs font-bold uppercase tracking-wider text-cream shadow-stamp">
                              <FolderOpen className="h-4 w-4 text-amber" /> Abrir Álbum ({count}{" "}
                              {count === 1 ? "foto" : "fotos"})
                            </span>
                          </div>

                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-sm border border-ink bg-amber px-2.5 py-0.5 font-condensed text-[11px] font-bold uppercase tracking-wider text-ink shadow-xs">
                            <Star className="h-3 w-3 fill-current" /> Álbum A.S.G.
                          </span>

                          <span className="absolute bottom-2.5 right-2.5 rounded-sm border border-cream/30 bg-black/80 px-2.5 py-0.5 font-condensed text-xs font-bold uppercase text-cream">
                            {count} {count === 1 ? "foto" : "fotos"}
                          </span>
                        </div>

                        {/* Título e Descrição do Álbum */}
                        <div className="pt-3 px-1">
                          <h3 className="font-display text-2xl uppercase leading-tight group-hover:text-rust transition-colors">
                            {albumName}
                          </h3>
                          {description ? (
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {description}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Clique para visualizar todas as fotos deste álbum.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rodapé do Card do Álbum */}
                      <div className="mt-4 pt-2.5 border-t border-border flex items-center justify-between gap-2 px-1">
                        <span className="font-condensed text-xs font-bold uppercase tracking-wider text-rust group-hover:underline">
                          Ver fotos do álbum →
                        </span>

                        {isDiretoria && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPhotosToAlbum(albumName);
                              }}
                              className="btn-stamp bg-amber text-ink text-[11px] px-2.5 py-1 inline-flex items-center gap-1"
                              title={`Adicionar mais fotos ao álbum ${albumName}`}
                            >
                              <Plus className="h-3 w-3" /> + Fotos
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditAlbum(albumMeta);
                              }}
                              className="rounded border border-ink/30 bg-muted p-1.5 text-xs hover:bg-amber hover:text-ink transition-colors"
                              title="Editar nome, capa ou excluir álbum"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </>
        ) : (
          /* =========================================================
           * TELA 2: DENTRO DO ÁLBUM SELECIONADO (FOTOS DO ÁLBUM)
           * ========================================================= */
          <>
            {/* Barra de Navegação e Ações Internas do Álbum */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-ink bg-secondary p-4 shadow-stamp">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="btn-ghost-stamp bg-card text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar para os Álbuns
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl uppercase leading-none">{selectedEvent}</h2>
                    <span className="rounded-sm bg-ink px-2 py-0.5 font-condensed text-[11px] font-bold uppercase text-amber">
                      {filteredList.length} {filteredList.length === 1 ? "foto" : "fotos"}
                    </span>
                  </div>
                  {activeAlbumSummary?.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeAlbumSummary.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {filteredList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStartAlbumViewer(0)}
                    className="btn-stamp bg-olive text-cream text-xs inline-flex items-center gap-1.5 shadow-stamp hover:brightness-105"
                  >
                    <Images className="h-4 w-4" /> Apresentação em Tela Cheia
                  </button>
                )}

                {isDiretoria && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAddPhotosToAlbum(selectedEvent)}
                      className="btn-stamp bg-rust text-cream text-xs inline-flex items-center gap-1.5 shadow-stamp hover:brightness-105"
                    >
                      <Plus className="h-4 w-4" /> Adicionar + Fotos ao Álbum
                    </button>

                    {activeAlbumSummary && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditAlbum(activeAlbumSummary.albumMeta)}
                        className="btn-ghost-stamp bg-card text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-rust" /> Editar Álbum / Capa
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Grade das Fotos pertencentes a este Álbum */}
            {filteredList.length === 0 ? (
              <Card className="text-center py-14 text-muted-foreground space-y-3">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground/60" />
                <h3 className="font-display text-2xl uppercase">
                  Este álbum ainda não possui fotos
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {isDiretoria
                    ? "Clique no botão abaixo para selecionar uma ou várias fotos de uma só vez e adicioná-las a este álbum."
                    : "Em breve novas fotos serão adicionadas a este álbum."}
                </p>
                {isDiretoria && (
                  <button
                    type="button"
                    onClick={() => handleAddPhotosToAlbum(selectedEvent)}
                    className="btn-stamp inline-flex items-center gap-1.5 mt-2"
                  >
                    <Plus className="h-4 w-4" /> Adicionar Fotos a "{selectedEvent}"
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

                        {/* Overlay ao passar o mouse: Ampliar Foto */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 rounded-sm border-2 border-cream bg-ink px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wider text-cream shadow-stamp">
                            <Maximize2 className="h-3.5 w-3.5 text-amber" /> Ampliar Foto
                          </span>
                        </div>

                        {isCover && (
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center gap-1 rounded-sm border border-ink bg-amber px-2.5 py-0.5 font-condensed text-[11px] font-bold uppercase tracking-wider text-ink shadow-xs">
                              <Star className="h-3 w-3 fill-current" /> Capa do Álbum
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Legenda & Ações da Diretoria */}
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
                                  <Star className="h-3 w-3" /> Definir Capa
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPhoto(photo);
                                }}
                                className="rounded border border-ink/30 bg-muted p-1 text-xs hover:bg-amber-400 hover:text-ink transition-colors"
                                title="Editar ou excluir foto"
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
          </>
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

      {/* Modal de Adição / Edição de Fotos no Álbum */}
      {photoModalOpen && (
        <GalleryModal
          photo={selectedPhoto}
          defaultEventName={modalDefaultAlbum}
          existingAlbums={eventsList}
          onClose={() => setPhotoModalOpen(false)}
        />
      )}

      {/* Modal de Criação / Edição de Álbum */}
      {albumModalOpen && (
        <AlbumFormModal
          album={editingAlbum}
          onClose={() => setAlbumModalOpen(false)}
          onAlbumSaved={(savedAlbumName) => setSelectedEvent(savedAlbumName)}
        />
      )}
    </>
  );
}
