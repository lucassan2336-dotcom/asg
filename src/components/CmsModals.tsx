import { useState, useRef } from "react";
import {
  X,
  Trash2,
  Upload,
  ImagePlus,
  Loader2,
  Camera,
  Star,
  Plus,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  type ProjectItem,
  type CompetitionResultItem,
  type GalleryPhotoItem,
  type GalleryAlbumItem,
  type NewsArticleItem,
  type EventItem,
  type SponsorItem,
  useSaveProject,
  useDeleteProject,
  useSaveCompetitionResult,
  useDeleteCompetitionResult,
  useSaveGalleryPhoto,
  useSaveMultipleGalleryPhotos,
  useDeleteGalleryPhoto,
  useSaveGalleryAlbum,
  useDeleteGalleryAlbum,
  useSaveNewsArticle,
  useDeleteNewsArticle,
  useSaveSiteEvent,
  useDeleteSiteEvent,
  useSaveSponsor,
  useDeleteSponsor,
  uploadGalleryPhoto,
  safeImageUrl,
} from "@/lib/cms";

// ==========================================
// Modal de Projetos
// ==========================================

export function ProjectModal({
  project,
  onClose,
}: {
  project?: ProjectItem | null;
  onClose: () => void;
}) {
  const saveMutation = useSaveProject();
  const deleteMutation = useDeleteProject();

  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [category, setCategory] = useState(project?.category || "Social");
  const [targetAudience, setTargetAudience] = useState(project?.target_audience || "");
  const [imageUrl, setImageUrl] = useState(project?.image_url || "");
  const [published, setPublished] = useState(project?.published ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Preencha o título e a descrição.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...(project?.id ? { id: project.id } : {}),
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        target_audience: targetAudience.trim() || null,
        image_url: imageUrl.trim() || null,
        published,
      });
      toast.success(project ? "Projeto atualizado!" : "Projeto criado com sucesso!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o projeto.");
    }
  };

  const handleDelete = async () => {
    if (!project?.id) return;
    if (confirm(`Deseja realmente excluir o projeto "${project.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(project.id);
        toast.success("Projeto excluído.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir o projeto.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <h2 className="font-display text-2xl">
            {project ? "Editar Projeto" : "Novo Projeto Social"}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="eyebrow">Título do Projeto</span>
            <input
              required
              maxLength={160}
              className="field mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Categoria</span>
            <input
              maxLength={80}
              className="field mt-1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Social, Esportivo, Educacional"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Público Alvo</span>
            <input
              maxLength={120}
              className="field mt-1"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ex: Crianças e jovens da rede pública"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Descrição Completa</span>
            <textarea
              required
              rows={4}
              className="field mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">URL da Imagem (opcional)</span>
            <input
              className="field mt-1"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publicar imediatamente no site
          </label>
          <div className="flex items-center justify-between pt-3">
            {project?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-sm text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn-stamp disabled:opacity-60"
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar Projeto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Modal de Notícias
// ==========================================

export function NewsModal({
  article,
  onClose,
}: {
  article?: NewsArticleItem | null;
  onClose: () => void;
}) {
  const saveMutation = useSaveNewsArticle();
  const deleteMutation = useDeleteNewsArticle();

  const [title, setTitle] = useState(article?.title || "");
  const [summary, setSummary] = useState(article?.summary || "");
  const [body, setBody] = useState(article?.body || "");
  const [coverUrl, setCoverUrl] = useState(article?.cover_url || "");
  const [published, setPublished] = useState(article?.published ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Preencha título e corpo da notícia.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...(article?.id ? { id: article.id } : {}),
        title: title.trim(),
        summary: summary.trim() || null,
        body: body.trim(),
        cover_url: coverUrl.trim() || null,
        published,
      });
      toast.success(article ? "Notícia atualizada!" : "Notícia publicada!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a notícia.");
    }
  };

  const handleDelete = async () => {
    if (!article?.id) return;
    if (confirm(`Deseja excluir a notícia "${article.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(article.id);
        toast.success("Notícia excluída.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir a notícia.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <h2 className="font-display text-2xl">{article ? "Editar Notícia" : "Nova Notícia"}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="eyebrow">Título</span>
            <input
              required
              maxLength={160}
              className="field mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Resumo</span>
            <textarea
              rows={2}
              maxLength={300}
              className="field mt-1"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Conteúdo da Notícia</span>
            <textarea
              required
              rows={5}
              className="field mt-1"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">URL da Imagem de Capa (opcional)</span>
            <input
              className="field mt-1"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publicar imediatamente no site
          </label>
          <div className="flex items-center justify-between pt-3">
            {article?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-sm text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn-stamp disabled:opacity-60"
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar Notícia"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Modal de Eventos
// ==========================================

export function EventModal({ event, onClose }: { event?: EventItem | null; onClose: () => void }) {
  const saveMutation = useSaveSiteEvent();
  const deleteMutation = useDeleteSiteEvent();

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [startsAt, setStartsAt] = useState(event?.starts_at ? event.starts_at.slice(0, 16) : "");
  const [registrationOpen, setRegistrationOpen] = useState(event?.registration_open ?? false);
  const [published, setPublished] = useState(event?.published ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Preencha título e descrição do evento.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...(event?.id ? { id: event.id } : {}),
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        registration_open: registrationOpen,
        published,
      });
      toast.success(event ? "Evento atualizado!" : "Evento criado com sucesso!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o evento.");
    }
  };

  const handleDelete = async () => {
    if (!event?.id) return;
    if (confirm(`Deseja excluir o evento "${event.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(event.id);
        toast.success("Evento excluído.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir o evento.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <h2 className="font-display text-2xl">{event ? "Editar Evento" : "Novo Evento"}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="eyebrow">Título do Evento</span>
            <input
              required
              maxLength={160}
              className="field mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Descrição</span>
            <textarea
              required
              rows={3}
              className="field mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Local</span>
            <input
              className="field mt-1"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Pista Pública de Skate"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Data e Hora</span>
            <input
              type="datetime-local"
              className="field mt-1"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={registrationOpen}
              onChange={(e) => setRegistrationOpen(e.target.checked)}
            />
            Inscrições abertas aos associados
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publicar imediatamente no site
          </label>
          <div className="flex items-center justify-between pt-3">
            {event?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-sm text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn-stamp disabled:opacity-60"
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar Evento"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Modal de Resultados
// ==========================================

export function ResultModal({
  result,
  onClose,
}: {
  result?: CompetitionResultItem | null;
  onClose: () => void;
}) {
  const saveMutation = useSaveCompetitionResult();
  const deleteMutation = useDeleteCompetitionResult();

  const [championship, setChampionship] = useState(result?.championship_name || "");
  const [category, setCategory] = useState(result?.category || "Amador");
  const [position, setPosition] = useState(result?.position || 1);
  const [athleteName, setAthleteName] = useState(result?.athlete_name || "");
  const [score, setScore] = useState(result?.score || "");
  const [notes, setNotes] = useState(result?.notes || "");
  const [published, setPublished] = useState(result?.published ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!championship.trim() || !athleteName.trim()) {
      toast.error("Preencha campeonato e nome do atleta.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...(result?.id ? { id: result.id } : {}),
        championship_name: championship.trim(),
        category: category.trim(),
        position: Number(position) || 1,
        athlete_name: athleteName.trim(),
        score: score.trim() || null,
        notes: notes.trim() || null,
        published,
      });
      toast.success(result ? "Resultado atualizado!" : "Resultado cadastrado!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o resultado.");
    }
  };

  const handleDelete = async () => {
    if (!result?.id) return;
    if (confirm(`Deseja excluir o resultado de "${result.athlete_name}"?`)) {
      try {
        await deleteMutation.mutateAsync(result.id);
        toast.success("Resultado excluído.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir o resultado.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <h2 className="font-display text-2xl">
            {result ? "Editar Resultado" : "Novo Resultado de Campeonato"}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="eyebrow">Campeonato / Evento</span>
            <input
              required
              maxLength={160}
              className="field mt-1"
              value={championship}
              onChange={(e) => setChampionship(e.target.value)}
              placeholder="Ex: 1º Guararema Street Open"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow">Categoria</span>
              <input
                required
                maxLength={80}
                className="field mt-1"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Iniciante, Amador, Feminino"
              />
            </label>
            <label className="block">
              <span className="eyebrow">Posição (Colocação)</span>
              <input
                required
                type="number"
                min={1}
                max={100}
                className="field mt-1"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow">Nome do Atleta</span>
              <input
                required
                maxLength={120}
                className="field mt-1"
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="eyebrow">Nota / Pontuação (opcional)</span>
              <input
                maxLength={50}
                className="field mt-1"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Ex: 87.5"
              />
            </label>
          </div>
          <label className="block">
            <span className="eyebrow">Observações / Destaques</span>
            <textarea
              rows={2}
              maxLength={500}
              className="field mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Destaque com manobra no gap"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publicar imediatamente no site
          </label>
          <div className="flex items-center justify-between pt-3">
            {result?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-sm text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn-stamp disabled:opacity-60"
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar Resultado"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Modal de Fotos da Galeria
// ==========================================

interface PendingAlbumPhoto {
  tempId: string;
  imageUrl: string;
  title: string;
  isCover: boolean;
}

export function GalleryModal({
  photo,
  defaultEventName,
  existingAlbums = [],
  onClose,
}: {
  photo?: GalleryPhotoItem | null;
  defaultEventName?: string | null;
  existingAlbums?: string[];
  onClose: () => void;
}) {
  const saveMutation = useSaveGalleryPhoto();
  const saveMultiMutation = useSaveMultipleGalleryPhotos();
  const deleteMutation = useDeleteGalleryPhoto();

  const [title, setTitle] = useState(photo?.title || "");
  const [imageUrl, setImageUrl] = useState(photo?.image_url || "");
  const [caption, setCaption] = useState(photo?.caption || "");
  const [eventName, setEventName] = useState(photo?.event_name || defaultEventName || "");
  const [published, setPublished] = useState(photo?.published ?? true);
  const [isCover, setIsCover] = useState<boolean>(Boolean(photo && (photo.sort_order ?? 0) < 0));

  // Lote de múltiplas fotos ao adicionar fotos a um álbum
  const [batchPhotos, setBatchPhotos] = useState<PendingAlbumPhoto[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const formatFileNameAsTitle = (fileName: string) => {
    const cleanName = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();
    if (!cleanName) return "Registro A.S.G.";
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Modo Edição de uma foto existente: substitui apenas aquela imagem
    if (photo?.id) {
      const singleFile = files[0]!;
      try {
        setUploading(true);
        setUploadProgressText("Enviando foto…");
        const url = await uploadGalleryPhoto(singleFile);
        setImageUrl(url);
        if (!title.trim()) {
          setTitle(formatFileNameAsTitle(singleFile.name));
        }
        toast.success("Foto carregada com sucesso!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao carregar imagem.");
      } finally {
        setUploading(false);
        setUploadProgressText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    // Modo Adição: permite selecionar 1 ou várias fotos de uma só vez e acumular no álbum
    try {
      setUploading(true);
      const uploadedItems: PendingAlbumPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        setUploadProgressText(`Enviando foto ${i + 1} de ${files.length}…`);
        const url = await uploadGalleryPhoto(f);
        uploadedItems.push({
          tempId: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          imageUrl: url,
          title: formatFileNameAsTitle(f.name),
          isCover: false,
        });
      }

      setBatchPhotos((prev) => {
        const combined = [...prev, ...uploadedItems];
        // Se nenhuma foto estiver marcada como capa e for a primeira, podemos sincronizar imageUrl/title principal
        if (combined.length === 1) {
          setImageUrl(combined[0]!.imageUrl);
          if (!title.trim()) setTitle(combined[0]!.title);
        }
        return combined;
      });

      toast.success(
        files.length === 1
          ? "Foto adicionada à seleção!"
          : `${files.length} fotos selecionadas e carregadas!`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar imagens.");
    } finally {
      setUploading(false);
      setUploadProgressText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleToggleBatchCover = (tempId: string) => {
    setBatchPhotos((prev) =>
      prev.map((item) => ({
        ...item,
        isCover: item.tempId === tempId ? !item.isCover : false,
      })),
    );
  };

  const handleUpdateBatchTitle = (tempId: string, newTitle: string) => {
    setBatchPhotos((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, title: newTitle } : item)),
    );
  };

  const handleRemoveBatchPhoto = (tempId: string) => {
    setBatchPhotos((prev) => {
      const next = prev.filter((item) => item.tempId !== tempId);
      if (next.length === 0) {
        setImageUrl("");
      } else if (next.length === 1) {
        setImageUrl(next[0]!.imageUrl);
        setTitle(next[0]!.title);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Se estiver adicionando múltiplas fotos de uma vez (ou via lote)
    if (!photo?.id && batchPhotos.length > 1) {
      try {
        await saveMultiMutation.mutateAsync({
          items: batchPhotos.map((bp, idx) => ({
            title:
              bp.title.trim() ||
              (title.trim() ? `${title.trim()} (${idx + 1})` : `Foto ${idx + 1}`),
            image_url: bp.imageUrl,
            caption: caption.trim() || null,
            event_name: eventName.trim() || null,
            published,
            is_cover: bp.isCover,
          })),
        });
        toast.success(`${batchPhotos.length} fotos adicionadas ao álbum com sucesso!`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível salvar as fotos.");
      }
      return;
    }

    // Modo de foto única (edição ou envio de 1 foto)
    const effectiveImageUrl = batchPhotos[0]?.imageUrl || imageUrl.trim();
    const effectiveTitle = title.trim() || batchPhotos[0]?.title.trim() || "";
    const effectiveIsCover =
      batchPhotos.length === 1 ? batchPhotos[0]!.isCover || isCover : isCover;

    if (!effectiveTitle || !effectiveImageUrl) {
      toast.error("Adicione pelo menos uma foto e informe o título do registro.");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        ...(photo?.id ? { id: photo.id } : {}),
        title: effectiveTitle,
        image_url: effectiveImageUrl,
        caption: caption.trim() || null,
        event_name: eventName.trim() || null,
        published,
        is_cover: effectiveIsCover,
      });
      toast.success(photo ? "Foto atualizada!" : "Foto adicionada ao álbum da galeria!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a foto.");
    }
  };

  const handleDelete = async () => {
    if (!photo?.id) return;
    if (confirm(`Deseja excluir a foto "${photo.title}" do álbum?`)) {
      try {
        await deleteMutation.mutateAsync(photo.id);
        toast.success("Foto excluída do álbum.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir a foto.");
      }
    }
  };

  const isBusy = saveMutation.isPending || saveMultiMutation.isPending || uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-rust" />
            <h2 className="font-display text-2xl">
              {photo
                ? "Editar Foto do Álbum"
                : defaultEventName
                  ? `Adicionar Fotos • ${defaultEventName}`
                  : "Adicionar Fotos ao Álbum"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Seleção de Álbum / Evento */}
          <div>
            <label className="block">
              <span className="eyebrow">Álbum / Evento / Sessão</span>
              <input
                maxLength={120}
                className="field mt-1"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ex: Sessão Noturna, Campeonato Street 2026"
              />
            </label>

            {existingAlbums.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-condensed uppercase tracking-wider text-muted-foreground">
                  Álbuns existentes:
                </span>
                {existingAlbums.map((alb) => (
                  <button
                    key={alb}
                    type="button"
                    onClick={() => setEventName(alb)}
                    className={`rounded-sm border px-2 py-0.5 font-condensed text-xs uppercase transition-colors ${
                      eventName.trim() === alb
                        ? "border-ink bg-amber text-ink font-bold"
                        : "border-ink/30 bg-secondary text-foreground hover:bg-muted"
                    }`}
                  >
                    {alb}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload direto do computador ou galeria (1 ou mais fotos) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="eyebrow">
                {photo ? "Foto do Registro" : "Fotos (Selecione 1 ou várias fotos de uma vez)"}
              </span>
              {!photo && batchPhotos.length > 0 && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-stamp bg-amber text-ink text-xs inline-flex items-center gap-1 px-2.5 py-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Selecionar Mais Fotos
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              multiple={!photo}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {photo ? (
              /* Modo Edição de 1 Foto Existente */
              imageUrl ? (
                <div className="relative overflow-hidden rounded-md border-2 border-ink bg-muted">
                  <img
                    src={safeImageUrl(imageUrl)}
                    alt="Pré-visualização"
                    className="h-52 w-full object-cover"
                  />
                  {isCover && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm border border-ink bg-amber px-2.5 py-0.5 font-condensed text-xs font-bold uppercase text-ink shadow-xs">
                      <Star className="h-3.5 w-3.5 fill-current" /> Capa do Álbum
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-90 sm:opacity-0 sm:hover:opacity-100 transition-opacity p-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn-stamp bg-cream text-ink text-xs inline-flex items-center gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" /> Escolher Outra Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="btn-ghost-stamp bg-card text-destructive text-xs inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-ink/50 bg-secondary/60 p-6 text-center cursor-pointer transition-all hover:border-ink hover:bg-secondary"
                >
                  <ImagePlus className="h-10 w-10 text-rust mb-2" />
                  <p className="font-condensed font-bold uppercase text-sm text-foreground">
                    Clique para escolher foto do computador ou celular
                  </p>
                </div>
              )
            ) : batchPhotos.length > 0 ? (
              /* Grade de Fotos Selecionadas para o Álbum */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                  {batchPhotos.map((bp, idx) => (
                    <div
                      key={bp.tempId}
                      className={`relative rounded-md border-2 p-2 bg-secondary/40 transition-all ${
                        bp.isCover ? "border-amber ring-2 ring-amber/50 bg-amber/10" : "border-ink"
                      }`}
                    >
                      <div className="relative h-32 w-full overflow-hidden rounded border border-ink/20 bg-muted">
                        <img
                          src={safeImageUrl(bp.imageUrl)}
                          alt={bp.title}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleBatchCover(bp.tempId)}
                          className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-condensed text-[11px] font-bold uppercase shadow-xs transition-colors ${
                            bp.isCover
                              ? "border-ink bg-amber text-ink"
                              : "border-cream/40 bg-black/70 text-cream hover:bg-amber hover:text-ink"
                          }`}
                          title="Definir esta foto como capa do álbum"
                        >
                          <Star className={`h-3 w-3 ${bp.isCover ? "fill-current" : ""}`} />
                          {bp.isCover ? "Capa Selecionada" : "Definir Capa"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveBatchPhoto(bp.tempId)}
                          className="absolute top-1.5 right-1.5 rounded bg-black/70 p-1 text-cream hover:bg-destructive transition-colors"
                          title="Remover foto da seleção"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={160}
                        value={bp.title}
                        onChange={(e) => handleUpdateBatchTitle(bp.tempId, e.target.value)}
                        placeholder={`Título da foto ${idx + 1}`}
                        className="field mt-2 py-1 text-xs"
                      />
                    </div>
                  ))}
                </div>
                {uploading && (
                  <div className="flex items-center justify-center gap-2 text-xs font-condensed uppercase text-rust py-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{uploadProgressText || "Enviando fotos…"}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Dropzone Inicial para Selecionar 1 ou Mais Fotos */
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed border-ink/50 bg-secondary/60 p-6 text-center cursor-pointer transition-all hover:border-ink hover:bg-secondary ${
                  uploading ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-9 w-9 animate-spin text-rust mb-2" />
                    <p className="font-condensed font-bold uppercase text-sm">
                      {uploadProgressText || "Processando e enviando imagens…"}
                    </p>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-rust mb-2" />
                    <p className="font-condensed font-bold uppercase text-sm text-foreground">
                      Clique para selecionar 1 ou várias fotos do computador ou celular
                    </p>
                    <span className="text-xs text-muted-foreground mt-1">
                      Você pode selecionar várias fotos de uma só vez e escolher qual será a capa do
                      álbum (JPG, PNG ou WebP)
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {showUrlInput ? "Ocultar campo de link externo" : "Ou informar URL externa da foto"}
              </button>
            </div>

            {showUrlInput && (
              <div className="mt-2">
                <input
                  className="field text-xs"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
            )}
          </div>

          {batchPhotos.length <= 1 && (
            <label className="block">
              <span className="eyebrow">Título da Foto / Manobra</span>
              <input
                required={batchPhotos.length === 0}
                maxLength={160}
                className="field mt-1"
                value={batchPhotos.length === 1 ? batchPhotos[0]!.title : title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (batchPhotos.length === 1) {
                    handleUpdateBatchTitle(batchPhotos[0]!.tempId, e.target.value);
                  }
                }}
                placeholder="Ex: Kickflip no gap da praça"
              />
            </label>
          )}

          <label className="block">
            <span className="eyebrow">Legenda / Créditos</span>
            <textarea
              rows={2}
              maxLength={500}
              className="field mt-1"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Detalhes da sessão, fotógrafo, skatista ou data..."
            />
          </label>

          {/* Opção de Definir como Capa do Álbum */}
          {batchPhotos.length <= 1 && (
            <label className="flex items-center gap-2 rounded-md border border-ink/30 bg-amber/15 p-2.5 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={batchPhotos.length === 1 ? batchPhotos[0]!.isCover || isCover : isCover}
                onChange={(e) => {
                  setIsCover(e.target.checked);
                  if (batchPhotos.length === 1) {
                    setBatchPhotos((prev) =>
                      prev.map((p, i) => (i === 0 ? { ...p, isCover: e.target.checked } : p)),
                    );
                  }
                }}
              />
              <Star className="h-4 w-4 text-amber-600 fill-amber-500 shrink-0" />
              <span>Definir esta foto como Capa do Álbum {eventName ? `"${eventName}"` : ""}</span>
            </label>
          )}

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publicar imediatamente no álbum da galeria
          </label>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            {photo?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-sm text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Excluir do Álbum
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {batchPhotos.length > 1 ? `${batchPhotos.length} fotos prontas para envio` : ""}
              </span>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button type="submit" disabled={isBusy} className="btn-stamp disabled:opacity-60">
                {isBusy
                  ? "Salvando…"
                  : batchPhotos.length > 1
                    ? `Salvar ${batchPhotos.length} Fotos no Álbum`
                    : "Salvar no Álbum"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Modal de Criação / Edição de Álbum da Galeria
// ==========================================

export function AlbumFormModal({
  album,
  onClose,
  onAlbumSaved,
}: {
  album?: GalleryAlbumItem | null;
  onClose: () => void;
  onAlbumSaved?: (albumName: string) => void;
}) {
  const saveAlbumMutation = useSaveGalleryAlbum();
  const deleteAlbumMutation = useDeleteGalleryAlbum();

  const [name, setName] = useState(album?.name || "");
  const [description, setDescription] = useState(album?.description || "");
  const [coverUrl, setCoverUrl] = useState(album?.cover_url || "");
  const [extraPhotos, setExtraPhotos] = useState<PendingAlbumPhoto[]>([]);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const extraPhotosInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [progressText, setProgressText] = useState("");

  const formatFileNameAsTitle = (fileName: string) => {
    const clean = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();
    if (!clean) return "Foto do Álbum";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const url = await uploadGalleryPhoto(file);
      setCoverUrl(url);
      toast.success("Foto de capa do álbum carregada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar a capa.");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleExtraPhotosSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      setUploadingExtra(true);
      const added: PendingAlbumPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        setProgressText(`Carregando foto ${i + 1} de ${files.length}…`);
        const url = await uploadGalleryPhoto(f);
        added.push({
          tempId: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          imageUrl: url,
          title: formatFileNameAsTitle(f.name),
          isCover: false,
        });
      }
      setExtraPhotos((prev) => {
        const next = [...prev, ...added];
        if (!coverUrl && next.length > 0) {
          setCoverUrl(next[0]!.imageUrl);
        }
        return next;
      });
      toast.success(
        files.length === 1
          ? "Foto adicionada ao álbum!"
          : `${files.length} fotos adicionadas ao álbum!`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar fotos.");
    } finally {
      setUploadingExtra(false);
      setProgressText("");
      if (extraPhotosInputRef.current) extraPhotosInputRef.current.value = "";
    }
  };

  const handleRemoveExtraPhoto = (tempId: string) => {
    setExtraPhotos((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      toast.error("Informe o nome do álbum (mínimo de 2 caracteres).");
      return;
    }

    const initialPhotos: Array<{
      title: string;
      image_url: string;
      caption?: string | null;
      is_cover?: boolean;
    }> = [];

    if (coverUrl && !album) {
      initialPhotos.push({
        title: `${cleanName} - Capa`,
        image_url: coverUrl,
        caption: description.trim() || null,
        is_cover: true,
      });
    }

    for (const ep of extraPhotos) {
      if (ep.imageUrl === coverUrl && !album) continue;
      initialPhotos.push({
        title: ep.title.trim() || cleanName,
        image_url: ep.imageUrl,
        caption: description.trim() || null,
        is_cover: ep.imageUrl === coverUrl,
      });
    }

    try {
      await saveAlbumMutation.mutateAsync({
        oldName: album?.name ?? null,
        name: cleanName,
        description: description.trim() || null,
        coverUrl: coverUrl || null,
        initialPhotos,
      });
      toast.success(album ? "Álbum atualizado com sucesso!" : `Álbum "${cleanName}" criado!`);
      onAlbumSaved?.(cleanName);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o álbum.");
    }
  };

  const handleDeleteAlbum = async () => {
    if (!album?.name) return;
    if (
      confirm(
        `Deseja excluir o álbum "${album.name}" e todas as fotos vinculadas a ele? Esta ação não pode ser desfeita.`,
      )
    ) {
      try {
        await deleteAlbumMutation.mutateAsync(album.name);
        toast.success(`Álbum "${album.name}" excluído.`);
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir o álbum.");
      }
    }
  };

  const isBusy =
    saveAlbumMutation.isPending ||
    deleteAlbumMutation.isPending ||
    uploadingCover ||
    uploadingExtra;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-rust" />
            <h2 className="font-display text-2xl">
              {album ? `Editar Álbum • ${album.name}` : "Criar Novo Álbum de Fotos"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="eyebrow">Nome do Álbum *</span>
            <input
              required
              maxLength={120}
              className="field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Campeonato Street 2026, Sessão de Domingo, Oficina Social..."
            />
          </label>

          <label className="block">
            <span className="eyebrow">Descrição do Álbum (Opcional)</span>
            <textarea
              rows={2}
              maxLength={400}
              className="field mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição sobre o evento, data ou sessão deste álbum..."
            />
          </label>

          {/* Capa do Álbum */}
          <div>
            <span className="eyebrow block mb-1.5">Foto de Capa do Álbum</span>
            <input
              type="file"
              ref={coverInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverSelect}
            />

            {coverUrl ? (
              <div className="relative overflow-hidden rounded-md border-2 border-amber bg-muted">
                <img
                  src={safeImageUrl(coverUrl)}
                  alt="Capa do álbum"
                  className="h-48 w-full object-cover"
                />
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-sm border border-ink bg-amber px-2.5 py-0.5 font-condensed text-xs font-bold uppercase text-ink shadow-xs">
                  <Star className="h-3.5 w-3.5 fill-current" /> Capa Oficial do Álbum
                </span>
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button
                    type="button"
                    disabled={uploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    className="btn-stamp bg-cream text-ink text-xs px-2.5 py-1 inline-flex items-center gap-1"
                  >
                    <Upload className="h-3.5 w-3.5" /> Trocar Capa
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => !uploadingCover && coverInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-ink/50 bg-secondary/60 p-5 text-center cursor-pointer transition-all hover:border-ink hover:bg-secondary"
              >
                {uploadingCover ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-rust mb-1.5" />
                    <span className="font-condensed font-bold uppercase text-xs">
                      Carregando foto de capa…
                    </span>
                  </>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-rust mb-1.5" />
                    <span className="font-condensed font-bold uppercase text-sm">
                      Clique para selecionar a Foto de Capa do Álbum
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Esta será a foto principal exibida no card de acesso ao álbum
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Seleção opcional de fotos adicionais para o álbum já na criação */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="eyebrow">
                Fotos do Álbum ({extraPhotos.length} selecionada
                {extraPhotos.length === 1 ? "" : "s"})
              </span>
              <button
                type="button"
                disabled={uploadingExtra}
                onClick={() => extraPhotosInputRef.current?.click()}
                className="btn-stamp bg-amber text-ink text-xs inline-flex items-center gap-1 px-2.5 py-1"
              >
                <Plus className="h-3.5 w-3.5" /> Selecionar Mais Fotos para o Álbum
              </button>
            </div>

            <input
              type="file"
              ref={extraPhotosInputRef}
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleExtraPhotosSelect}
            />

            {uploadingExtra && (
              <div className="flex items-center gap-2 rounded-md border border-ink/20 bg-secondary p-3 text-xs font-condensed uppercase text-rust mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{progressText || "Carregando fotos…"}</span>
              </div>
            )}

            {extraPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {extraPhotos.map((ep) => {
                  const isCurrentCover = coverUrl === ep.imageUrl;
                  return (
                    <div
                      key={ep.tempId}
                      className={`relative rounded border-2 p-1.5 bg-secondary/40 ${
                        isCurrentCover ? "border-amber" : "border-ink/40"
                      }`}
                    >
                      <div className="relative h-24 w-full overflow-hidden rounded bg-muted">
                        <img
                          src={safeImageUrl(ep.imageUrl)}
                          alt={ep.title}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setCoverUrl(ep.imageUrl)}
                          className={`absolute top-1 left-1 rounded px-1.5 py-0.5 font-condensed text-[10px] font-bold uppercase ${
                            isCurrentCover
                              ? "bg-amber text-ink"
                              : "bg-black/70 text-cream hover:bg-amber hover:text-ink"
                          }`}
                        >
                          {isCurrentCover ? "★ Capa" : "Usar como Capa"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraPhoto(ep.tempId)}
                          className="absolute top-1 right-1 rounded bg-black/70 p-1 text-cream hover:bg-destructive"
                          title="Remover foto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Você pode selecionar várias fotos agora ou criar o álbum primeiro e adicionar mais
                fotos dentro dele quando quiser.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            {album?.name ? (
              <button
                type="button"
                onClick={handleDeleteAlbum}
                disabled={isBusy}
                className="flex items-center gap-1 text-sm text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Excluir Álbum
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button type="submit" disabled={isBusy} className="btn-stamp disabled:opacity-60">
                {isBusy ? "Salvando…" : album ? "Salvar Alterações" : "Criar Álbum"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// Modal de Apoiadores
// ==========================================

export function SponsorModal({
  sponsor,
  onClose,
}: {
  sponsor?: SponsorItem | null;
  onClose: () => void;
}) {
  const saveMutation = useSaveSponsor();
  const deleteMutation = useDeleteSponsor();

  const [name, setName] = useState(sponsor?.name || "");
  const [logoUrl, setLogoUrl] = useState(sponsor?.logo_url || "");
  const [website, setWebsite] = useState(sponsor?.website || "");
  const [published, setPublished] = useState(sponsor?.published ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do apoiador.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...(sponsor?.id ? { id: sponsor.id } : {}),
        name: name.trim(),
        logo_url: logoUrl.trim() || null,
        website: website.trim() || null,
        published,
      });
      toast.success(sponsor ? "Apoiador atualizado!" : "Apoiador cadastrado!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o apoiador.");
    }
  };

  const handleDelete = async () => {
    if (!sponsor?.id) return;
    if (confirm(`Deseja remover o apoiador "${sponsor.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(sponsor.id);
        toast.success("Apoiador removido.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível remover o apoiador.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <h2 className="font-display text-2xl">{sponsor ? "Editar Apoiador" : "Novo Apoiador"}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="eyebrow">Nome da Empresa ou Pessoa</span>
            <input
              required
              maxLength={120}
              className="field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Website / Link (Instagram, etc.)</span>
            <input
              className="field mt-1"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="block">
            <span className="eyebrow">URL do Logo (opcional)</span>
            <input
              className="field mt-1"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publicar imediatamente no site
          </label>
          <div className="flex items-center justify-between pt-3">
            {sponsor?.id ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1 text-sm text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="btn-stamp disabled:opacity-60"
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar Apoiador"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
