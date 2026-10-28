import { useState, useRef } from "react";
import { X, Trash2, Upload, ImagePlus, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import {
  type ProjectItem,
  type CompetitionResultItem,
  type GalleryPhotoItem,
  type NewsArticleItem,
  type EventItem,
  type SponsorItem,
  useSaveProject,
  useDeleteProject,
  useSaveCompetitionResult,
  useDeleteCompetitionResult,
  useSaveGalleryPhoto,
  useDeleteGalleryPhoto,
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

export function GalleryModal({
  photo,
  onClose,
}: {
  photo?: GalleryPhotoItem | null;
  onClose: () => void;
}) {
  const saveMutation = useSaveGalleryPhoto();
  const deleteMutation = useDeleteGalleryPhoto();

  const [title, setTitle] = useState(photo?.title || "");
  const [imageUrl, setImageUrl] = useState(photo?.image_url || "");
  const [caption, setCaption] = useState(photo?.caption || "");
  const [eventName, setEventName] = useState(photo?.event_name || "");
  const [published, setPublished] = useState(photo?.published ?? true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadGalleryPhoto(file);
      setImageUrl(url);

      if (!title.trim()) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .trim();
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      toast.success("Foto carregada com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao carregar imagem.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      toast.error("Adicione a foto e informe o título do registro.");
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...(photo?.id ? { id: photo.id } : {}),
        title: title.trim(),
        image_url: imageUrl.trim(),
        caption: caption.trim() || null,
        event_name: eventName.trim() || null,
        published,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-rust" />
            <h2 className="font-display text-2xl">
              {photo ? "Editar Foto do Álbum" : "Adicionar Foto ao Álbum"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Upload direto do computador ou galeria */}
          <div>
            <span className="eyebrow block mb-1.5">Foto (Upload do Computador ou Celular)</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {imageUrl ? (
              <div className="relative overflow-hidden rounded-md border-2 border-ink bg-muted">
                <img
                  src={safeImageUrl(imageUrl)}
                  alt="Pré-visualização"
                  className="h-52 w-full object-cover"
                />
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
                className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed border-ink/50 bg-secondary/60 p-6 text-center cursor-pointer transition-all hover:border-ink hover:bg-secondary ${
                  uploading ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-9 w-9 animate-spin text-rust mb-2" />
                    <p className="font-condensed font-bold uppercase text-sm">
                      Processando e enviando imagem…
                    </p>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-rust mb-2" />
                    <p className="font-condensed font-bold uppercase text-sm text-foreground">
                      Clique para escolher foto do computador ou galeria do celular
                    </p>
                    <span className="text-xs text-muted-foreground mt-1">
                      Formatos: JPG, PNG ou WebP (até 10MB)
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

          <label className="block">
            <span className="eyebrow">Título da Foto / Manobra</span>
            <input
              required
              maxLength={160}
              className="field mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Kickflip no gap da praça"
            />
          </label>

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

          <label className="block">
            <span className="eyebrow">Legenda / Créditos da Foto</span>
            <textarea
              rows={2}
              maxLength={500}
              className="field mt-1"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Detalhes da sessão, fotógrafo, skatista ou data..."
            />
          </label>

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
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-ghost-stamp">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending || uploading}
                className="btn-stamp disabled:opacity-60"
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar no Álbum"}
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
