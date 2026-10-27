import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Trophy,
  Edit3,
  Medal,
  Plus,
  Settings,
  Calendar,
  Ban,
  RotateCcw,
  X,
  Flame,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useCompetitionResults,
  type GenericPageContent,
  type CompetitionResultItem,
} from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { ResultModal } from "@/components/CmsModals";
import {
  useActiveSkatersByModality,
  useCancelChampionshipPodium,
  useChampionshipPodiums,
  useSaveChampionshipPodium,
  useSaveScoringConfig,
  useScoringConfig,
  type ChampionshipPodiumRow,
  type SkateModality,
  type TiebreakerRule,
} from "@/lib/ranking";
import { ChampionshipMedalBadge, ModalityBadge, SkaterAvatar } from "@/components/TrophyBadges";

export const Route = createFileRoute("/resultados")({
  head: () =>
    seo(
      "Resultados de Campeonatos",
      "Pódios oficiais, classificações e pontuação dos campeonatos Street e Vert organizados pela A.S.G.",
    ),
  component: ResultadosPage,
});

function ChampionshipPodiumModal({
  initialPodium,
  onClose,
}: {
  initialPodium: ChampionshipPodiumRow | null;
  onClose: () => void;
}) {
  const { data: scoringConfig } = useScoringConfig();
  const saveMutation = useSaveChampionshipPodium();

  const [championshipName, setChampionshipName] = useState(initialPodium?.championship_name ?? "");
  const [eventDate, setEventDate] = useState(
    initialPodium?.event_date ?? new Date().toISOString().slice(0, 10),
  );
  const [modality, setModality] = useState<SkateModality>(initialPodium?.modality ?? "street");
  const [firstPlaceId, setFirstPlaceId] = useState(initialPodium?.first_place_skater_id ?? "");
  const [secondPlaceId, setSecondPlaceId] = useState(initialPodium?.second_place_skater_id ?? "");
  const [thirdPlaceId, setThirdPlaceId] = useState(initialPodium?.third_place_skater_id ?? "");
  const [firstPoints, setFirstPoints] = useState(
    String(initialPodium?.first_place_points ?? scoringConfig?.first_place_points ?? 100),
  );
  const [secondPoints, setSecondPoints] = useState(
    String(initialPodium?.second_place_points ?? scoringConfig?.second_place_points ?? 70),
  );
  const [thirdPoints, setThirdPoints] = useState(
    String(initialPodium?.third_place_points ?? scoringConfig?.third_place_points ?? 50),
  );
  const [notes, setNotes] = useState(initialPodium?.notes ?? "");
  const [published, setPublished] = useState(initialPodium?.published ?? true);

  const { data: modalitySkaters = [], isLoading: loadingSkaters } =
    useActiveSkatersByModality(modality);

  useEffect(() => {
    if (!initialPodium && scoringConfig) {
      setFirstPoints(String(scoringConfig.first_place_points));
      setSecondPoints(String(scoringConfig.second_place_points));
      setThirdPoints(String(scoringConfig.third_place_points));
    }
  }, [initialPodium, scoringConfig]);

  const handleModalityChange = (nextModality: SkateModality) => {
    setModality(nextModality);
    setFirstPlaceId("");
    setSecondPlaceId("");
    setThirdPlaceId("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (championshipName.trim().length < 3) {
      toast.error("Informe o nome do campeonato (mínimo de 3 caracteres).");
      return;
    }
    if (!firstPlaceId || !secondPlaceId || !thirdPlaceId) {
      toast.error(
        "Selecione obrigatoriamente o 1º, 2º e 3º colocados dentre os skatistas cadastrados.",
      );
      return;
    }
    if (
      firstPlaceId === secondPlaceId ||
      firstPlaceId === thirdPlaceId ||
      secondPlaceId === thirdPlaceId
    ) {
      toast.error("O 1º, 2º e 3º colocados devem ser três skatistas distintos da modalidade.");
      return;
    }

    const p1 = Number(firstPoints);
    const p2 = Number(secondPoints);
    const p3 = Number(thirdPoints);
    if (
      !Number.isInteger(p1) ||
      !Number.isInteger(p2) ||
      !Number.isInteger(p3) ||
      p1 < 0 ||
      p2 < 0 ||
      p3 < 0 ||
      p1 < p2 ||
      p2 < p3
    ) {
      toast.error(
        "A pontuação deve conter números inteiros válidos (1º lugar >= 2º lugar >= 3º lugar).",
      );
      return;
    }

    try {
      await saveMutation.mutateAsync({
        id: initialPodium?.id,
        championship_name: championshipName,
        event_date: eventDate,
        modality,
        first_place_skater_id: firstPlaceId,
        second_place_skater_id: secondPlaceId,
        third_place_skater_id: thirdPlaceId,
        first_place_points: p1,
        second_place_points: p2,
        third_place_points: p3,
        notes,
        published,
      });
      toast.success(
        initialPodium
          ? "Resultado atualizado e ranking recalculado automaticamente!"
          : "Resultado oficial publicado e pontos creditados no ranking!",
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.toLowerCase().includes("uq_active_championship_podium") ||
        msg.includes("duplicate")
      ) {
        toast.error(
          "Este campeonato já possui um pódio ativo registrado para esta modalidade e data.",
        );
      } else {
        toast.error(msg || "Não foi possível salvar o resultado do campeonato.");
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="eyebrow">Homologação Oficial A.S.G.</span>
            <h2 className="text-2xl">
              {initialPodium ? "Editar Resultado de Campeonato" : "Registrar Pódio de Campeonato"}
            </h2>
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

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="eyebrow">Nome do Campeonato ou Evento</span>
              <input
                required
                maxLength={140}
                placeholder="Ex: 1ª Etapa Circuito Guararema de Skate"
                className="field mt-1"
                value={championshipName}
                onChange={(e) => setChampionshipName(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="eyebrow">Data de Realização</span>
              <input
                required
                type="date"
                className="field mt-1"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="eyebrow block mb-1.5">Modalidade do Campeonato</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleModalityChange("street")}
                className={`flex items-center justify-center gap-2 rounded-sm border-2 py-2.5 font-condensed text-sm font-bold uppercase tracking-wider ${
                  modality === "street"
                    ? "border-ink bg-rust text-cream shadow-stamp"
                    : "border-border bg-muted/40 text-foreground"
                }`}
              >
                <Flame className="h-4 w-4" /> Street (Conta p/ Ranking Street)
              </button>
              <button
                type="button"
                onClick={() => handleModalityChange("vert")}
                className={`flex items-center justify-center gap-2 rounded-sm border-2 py-2.5 font-condensed text-sm font-bold uppercase tracking-wider ${
                  modality === "vert"
                    ? "border-ink bg-olive text-cream shadow-stamp"
                    : "border-border bg-muted/40 text-foreground"
                }`}
              >
                <Shield className="h-4 w-4" /> Vert (Conta p/ Ranking Vert)
              </button>
            </div>
          </div>

          {loadingSkaters ? (
            <p className="text-sm text-muted-foreground">
              Carregando skatistas cadastrados em {modality.toUpperCase()}…
            </p>
          ) : modalitySkaters.length < 3 ? (
            <div className="rounded-md border-2 border-rust bg-rust/10 p-3 text-xs text-rust font-semibold">
              Atenção: Existem atualmente {modalitySkaters.length} skatista(s) ativo(s) na
              modalidade {modality.toUpperCase()}. São necessários pelo menos 3 skatistas
              cadastrados nessa modalidade para homologar um pódio completo.
            </div>
          ) : null}

          {/* Seleção dos 3 Colocados e Pontuação */}
          <div className="space-y-3 rounded-md border-2 border-ink bg-muted/30 p-4">
            <span className="eyebrow block">
              Pódio Oficial (Seleção obrigatória de skatistas cadastrados)
            </span>

            {/* 1º Colocado */}
            <div className="grid gap-3 sm:grid-cols-12 items-end">
              <label className="block sm:col-span-8">
                <span className="text-xs font-condensed font-bold uppercase text-amber-700">
                  🥇 1º Colocado ({modality.toUpperCase()})
                </span>
                <select
                  required
                  className="field mt-1"
                  value={firstPlaceId}
                  onChange={(e) => setFirstPlaceId(e.target.value)}
                >
                  <option value="">Selecione o 1º colocado…</option>
                  {modalitySkaters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.total_points} pts atuais)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-4">
                <span className="text-xs font-condensed font-bold uppercase">Pontos (1º)</span>
                <input
                  required
                  type="number"
                  min={0}
                  max={100000}
                  className="field mt-1 font-mono"
                  value={firstPoints}
                  onChange={(e) => setFirstPoints(e.target.value)}
                />
              </label>
            </div>

            {/* 2º Colocado */}
            <div className="grid gap-3 sm:grid-cols-12 items-end">
              <label className="block sm:col-span-8">
                <span className="text-xs font-condensed font-bold uppercase text-slate-600">
                  🥈 2º Colocado ({modality.toUpperCase()})
                </span>
                <select
                  required
                  className="field mt-1"
                  value={secondPlaceId}
                  onChange={(e) => setSecondPlaceId(e.target.value)}
                >
                  <option value="">Selecione o 2º colocado…</option>
                  {modalitySkaters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.total_points} pts atuais)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-4">
                <span className="text-xs font-condensed font-bold uppercase">Pontos (2º)</span>
                <input
                  required
                  type="number"
                  min={0}
                  max={100000}
                  className="field mt-1 font-mono"
                  value={secondPoints}
                  onChange={(e) => setSecondPoints(e.target.value)}
                />
              </label>
            </div>

            {/* 3º Colocado */}
            <div className="grid gap-3 sm:grid-cols-12 items-end">
              <label className="block sm:col-span-8">
                <span className="text-xs font-condensed font-bold uppercase text-orange-800">
                  🥉 3º Colocado ({modality.toUpperCase()})
                </span>
                <select
                  required
                  className="field mt-1"
                  value={thirdPlaceId}
                  onChange={(e) => setThirdPlaceId(e.target.value)}
                >
                  <option value="">Selecione o 3º colocado…</option>
                  {modalitySkaters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.total_points} pts atuais)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-4">
                <span className="text-xs font-condensed font-bold uppercase">Pontos (3º)</span>
                <input
                  required
                  type="number"
                  min={0}
                  max={100000}
                  className="field mt-1 font-mono"
                  value={thirdPoints}
                  onChange={(e) => setThirdPoints(e.target.value)}
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="eyebrow">Observações Opcionais</span>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Ex: Final disputada na pista municipal de Guararema com bateria extra."
              className="field mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-rust"
            />
            <span>Publicar imediatamente e contabilizar pontos no Ranking Oficial</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost-stamp">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-stamp disabled:opacity-60"
            >
              {saveMutation.isPending ? "Salvando…" : "Salvar Resultado Oficial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScoringConfigModal({ onClose }: { onClose: () => void }) {
  const { data: config } = useScoringConfig();
  const saveConfig = useSaveScoringConfig();

  const [firstPts, setFirstPts] = useState(String(config?.first_place_points ?? 1000));
  const [secondPts, setSecondPts] = useState(String(config?.second_place_points ?? 750));
  const [thirdPts, setThirdPts] = useState(String(config?.third_place_points ?? 500));
  const [tiebreakerRule, setTiebreakerRule] = useState<TiebreakerRule>(
    config?.tiebreaker_rule ?? "podium_counts",
  );

  useEffect(() => {
    if (config) {
      setFirstPts(String(config.first_place_points));
      setSecondPts(String(config.second_place_points));
      setThirdPts(String(config.third_place_points));
      setTiebreakerRule(config.tiebreaker_rule);
    }
  }, [config]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p1 = Number(firstPts);
    const p2 = Number(secondPts);
    const p3 = Number(thirdPts);
    if (
      !Number.isInteger(p1) ||
      !Number.isInteger(p2) ||
      !Number.isInteger(p3) ||
      p1 <= 0 ||
      p2 < 0 ||
      p3 < 0 ||
      p1 < p2 ||
      p2 < p3
    ) {
      toast.error("Defina pontuações inteiras válidas com 1º >= 2º >= 3º lugar.");
      return;
    }

    try {
      await saveConfig.mutateAsync({
        first_place_points: p1,
        second_place_points: p2,
        third_place_points: p3,
        tiebreaker_rule: tiebreakerRule,
      });
      toast.success("Configuração de pontuação e critério de desempate atualizados!");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar a configuração de pontuação.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-md border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="eyebrow">Sistema Centralizado de Pontuação</span>
            <h2 className="text-2xl">Regras do Ranking A.S.G.</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <p className="text-xs text-muted-foreground">
            Defina a pontuação padrão atribuída aos três colocados nos campeonatos oficiais e o
            critério de desempate do Ranking Street e Vert.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="eyebrow">1º Lugar (Ouro)</span>
              <input
                required
                type="number"
                min={1}
                className="field mt-1 font-mono"
                value={firstPts}
                onChange={(e) => setFirstPts(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="eyebrow">2º Lugar (Prata)</span>
              <input
                required
                type="number"
                min={0}
                className="field mt-1 font-mono"
                value={secondPts}
                onChange={(e) => setSecondPts(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="eyebrow">3º Lugar (Bronze)</span>
              <input
                required
                type="number"
                min={0}
                className="field mt-1 font-mono"
                value={thirdPts}
                onChange={(e) => setThirdPts(e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="eyebrow">Critério Oficial de Desempate</span>
            <select
              className="field mt-1"
              value={tiebreakerRule}
              onChange={(e) => setTiebreakerRule(e.target.value as TiebreakerRule)}
            >
              <option value="podium_counts">
                Maior nº de 1ºs lugares → 2ºs lugares → 3ºs lugares (persistindo, posição
                compartilhada)
              </option>
              <option value="shared_position_only">
                Compartilhar posição imediatamente em caso de empate de pontos
              </option>
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost-stamp">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveConfig.isPending}
              className="btn-stamp disabled:opacity-60"
            >
              {saveConfig.isPending ? "Salvando…" : "Salvar Configuração"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResultadosPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("resultados");
  const { data: podiums = [], isLoading: loadingPodiums } = useChampionshipPodiums(isDiretoria);
  const { data: legacyResults = [] } = useCompetitionResults();
  const cancelMutation = useCancelChampionshipPodium();

  const [modalityFilter, setModalityFilter] = useState<"todos" | "street" | "vert">("todos");
  const [podiumModalOpen, setPodiumModalOpen] = useState(false);
  const [selectedPodium, setSelectedPodium] = useState<ChampionshipPodiumRow | null>(null);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);

  // Modal legado preservado
  const [legacyModalOpen, setLegacyModalOpen] = useState(false);
  const [selectedLegacyResult, setSelectedLegacyResult] = useState<CompetitionResultItem | null>(
    null,
  );

  const hero = content?.hero;

  const visiblePodiums = podiums.filter((p) => {
    if (!isDiretoria && (!p.published || p.cancelled)) return false;
    if (modalityFilter !== "todos" && p.modality !== modalityFilter) return false;
    return true;
  });

  const visibleLegacy = isDiretoria ? legacyResults : legacyResults.filter((r) => r.published);
  const legacyChampionships = Array.from(new Set(visibleLegacy.map((r) => r.championship_name)));

  const handleNewPodium = () => {
    setSelectedPodium(null);
    setPodiumModalOpen(true);
  };

  const handleEditPodium = (podium: ChampionshipPodiumRow) => {
    setSelectedPodium(podium);
    setPodiumModalOpen(true);
  };

  async function handleToggleCancel(podium: ChampionshipPodiumRow) {
    try {
      await cancelMutation.mutateAsync({
        id: podium.id,
        cancelled: !podium.cancelled,
      });
      toast.success(
        podium.cancelled
          ? "Resultado restaurado e pontos recalculados no ranking!"
          : "Resultado cancelado e pontos estornados automaticamente do ranking!",
      );
    } catch {
      toast.error("Não foi possível alterar o status deste resultado.");
    }
  }

  return (
    <>
      <EditablePageToolbar
        pageSlug="resultados"
        pageName="Resultados"
        addItemLabel="Registrar Pódio Oficial"
        onAddItem={handleNewPodium}
      />

      <PageHero
        eyebrow={hero?.eyebrow || "Pódios Homologados"}
        title={hero?.title || "Resultados de Campeonatos"}
        actions={
          <Link to="/ranking" className="btn-stamp bg-rust text-cream">
            <Trophy className="h-4 w-4" /> Ver Ranking Street & Vert
          </Link>
        }
      >
        {hero?.description ||
          "Resultados oficiais dos campeonatos de Street e Vert da A.S.G. Clique no nome ou na foto de qualquer medalhista para abrir seu perfil público."}
      </PageHero>

      <Section className="space-y-8">
        {/* Barra de Filtros e Controles Administrativos da Diretoria */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border-2 border-ink bg-secondary p-4 shadow-stamp">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalityFilter("todos")}
              className={
                modalityFilter === "todos"
                  ? "btn-stamp text-xs px-3.5 py-2"
                  : "btn-ghost-stamp text-xs px-3.5 py-2 bg-card"
              }
            >
              Todas as Modalidades
            </button>
            <button
              type="button"
              onClick={() => setModalityFilter("street")}
              className={
                modalityFilter === "street"
                  ? "btn-stamp bg-rust text-cream text-xs px-3.5 py-2"
                  : "btn-ghost-stamp text-xs px-3.5 py-2 bg-card"
              }
            >
              <Flame className="h-4 w-4" /> Street
            </button>
            <button
              type="button"
              onClick={() => setModalityFilter("vert")}
              className={
                modalityFilter === "vert"
                  ? "btn-stamp bg-olive text-cream text-xs px-3.5 py-2"
                  : "btn-ghost-stamp text-xs px-3.5 py-2 bg-card"
              }
            >
              <Shield className="h-4 w-4" /> Vert
            </button>
          </div>

          {isDiretoria && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScoringModalOpen(true)}
                className="btn-ghost-stamp bg-card text-xs px-3 py-2"
              >
                <Settings className="h-4 w-4" /> Configurar Pontuação
              </button>
              <button
                type="button"
                onClick={handleNewPodium}
                className="btn-stamp bg-rust text-cream text-xs px-3.5 py-2"
              >
                <Plus className="h-4 w-4" /> Novo Resultado Oficial
              </button>
            </div>
          )}
        </div>

        {/* Lista de Pódios Oficiais de Campeonatos (Street / Vert) */}
        {loadingPodiums ? (
          <p className="text-muted-foreground">Carregando resultados oficiais…</p>
        ) : visiblePodiums.length === 0 ? (
          <Card className="py-12 text-center text-muted-foreground space-y-2">
            <Trophy className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">
              Nenhum pódio oficial registrado para o filtro selecionado.
            </p>
            {isDiretoria && (
              <button
                type="button"
                onClick={handleNewPodium}
                className="btn-stamp mt-2 inline-flex text-xs"
              >
                <Plus className="h-4 w-4" /> Registrar primeiro campeonato
              </button>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {visiblePodiums.map((podium) => {
              const podiumPlaces = [
                {
                  placement: 1 as const,
                  skater: podium.first_skater,
                  skaterId: podium.first_place_skater_id,
                  points: podium.first_place_points,
                },
                {
                  placement: 2 as const,
                  skater: podium.second_skater,
                  skaterId: podium.second_place_skater_id,
                  points: podium.second_place_points,
                },
                {
                  placement: 3 as const,
                  skater: podium.third_skater,
                  skaterId: podium.third_place_skater_id,
                  points: podium.third_place_points,
                },
              ];

              return (
                <Card
                  key={podium.id}
                  className={`space-y-5 ${podium.cancelled ? "opacity-60 border-dashed" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ModalityBadge modality={podium.modality} />
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-condensed uppercase">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(podium.event_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        {podium.cancelled && (
                          <span className="rounded bg-rust px-2 py-0.5 font-condensed text-xs font-bold uppercase text-cream">
                            Cancelado (Pontos Estornados)
                          </span>
                        )}
                        {!podium.published && !podium.cancelled && (
                          <span className="rounded bg-amber px-2 py-0.5 font-condensed text-xs font-bold uppercase text-ink">
                            Rascunho
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-display uppercase">
                        {podium.championship_name}
                      </h2>
                      {podium.notes && (
                        <p className="text-sm text-muted-foreground">{podium.notes}</p>
                      )}
                    </div>

                    {isDiretoria && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditPodium(podium)}
                          className="btn-ghost-stamp text-xs px-3 py-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCancel(podium)}
                          className="btn-ghost-stamp text-xs px-3 py-1.5 text-rust border-rust"
                        >
                          {podium.cancelled ? (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                            </>
                          ) : (
                            <>
                              <Ban className="h-3.5 w-3.5" /> Cancelar
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cartões Clicáveis dos 3 Colocados do Pódio */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {podiumPlaces.map(({ placement, skater, skaterId, points }) => (
                      <Link
                        key={placement}
                        to="/skatistas/$skaterId"
                        params={{ skaterId }}
                        className="group flex items-center gap-4 rounded-md border-2 border-ink bg-secondary/40 p-4 transition-all hover:-translate-y-0.5 hover:bg-secondary shadow-stamp"
                      >
                        <SkaterAvatar
                          name={skater?.full_name ?? `${placement}º Colocado`}
                          avatarUrl={skater?.avatar_url}
                          size="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <ChampionshipMedalBadge placement={placement} size="sm" />
                          <h3 className="mt-1.5 font-display text-2xl uppercase truncate group-hover:text-rust">
                            {skater?.full_name ?? "Ver perfil do skatista"}
                          </h3>
                          <p className="mt-0.5 font-mono text-xs font-bold text-rust">
                            +{points} PTS no Ranking {podium.modality.toUpperCase()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Seção Complementar de Registros Históricos / Categorias Gerais (Legado Preservado) */}
        {legacyChampionships.length > 0 && (
          <div className="space-y-6 pt-6 border-t-2 border-ink/20">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display uppercase">
                Outros Registros e Baterias Históricas
              </h2>
              {isDiretoria && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLegacyResult(null);
                    setLegacyModalOpen(true);
                  }}
                  className="btn-ghost-stamp text-xs"
                >
                  Adicionar registro complementar
                </button>
              )}
            </div>

            {legacyChampionships.map((champName) => {
              const champResults = visibleLegacy.filter((r) => r.championship_name === champName);
              return (
                <div key={champName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent" />
                    <h3 className="text-xl font-display">{champName}</h3>
                  </div>

                  <div className="overflow-x-auto rounded-md border-2 border-ink bg-card shadow-stamp">
                    <table className="w-full text-left">
                      <thead className="bg-ink text-cream">
                        <tr>
                          <th className="eyebrow px-4 py-3">Posição</th>
                          <th className="eyebrow px-4 py-3">Atleta</th>
                          <th className="eyebrow px-4 py-3">Categoria</th>
                          <th className="eyebrow px-4 py-3">Pontuação</th>
                          <th className="eyebrow px-4 py-3">Observações</th>
                          {isDiretoria && <th className="eyebrow px-4 py-3 text-right">Ação</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {champResults.map((item) => (
                          <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-4 py-3 font-display text-xl whitespace-nowrap">
                              <span className="flex items-center gap-1.5">
                                {item.position === 1 && (
                                  <Medal className="h-4 w-4 text-amber-500 fill-amber-500" />
                                )}
                                {item.position === 2 && (
                                  <Medal className="h-4 w-4 text-slate-400 fill-slate-400" />
                                )}
                                {item.position === 3 && (
                                  <Medal className="h-4 w-4 text-amber-700 fill-amber-700" />
                                )}
                                {item.position}º
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold">{item.athlete_name}</td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-muted px-2 py-0.5 text-xs font-condensed font-bold uppercase">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm">{item.score || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {item.notes || "—"}
                            </td>
                            {isDiretoria && (
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedLegacyResult(item);
                                    setLegacyModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-semibold hover:bg-accent hover:text-accent-foreground"
                                >
                                  <Edit3 className="h-3 w-3" /> Editar
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {podiumModalOpen && (
        <ChampionshipPodiumModal
          initialPodium={selectedPodium}
          onClose={() => setPodiumModalOpen(false)}
        />
      )}

      {scoringModalOpen && <ScoringConfigModal onClose={() => setScoringModalOpen(false)} />}

      {legacyModalOpen && (
        <ResultModal result={selectedLegacyResult} onClose={() => setLegacyModalOpen(false)} />
      )}
    </>
  );
}
