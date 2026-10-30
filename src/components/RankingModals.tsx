import { useState, useEffect } from "react";
import { X, Flame, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  useScoringConfig,
  useSaveScoringConfig,
  useSaveChampionshipPodium,
  useActiveSkatersByModality,
  type ChampionshipPodiumRow,
  type SkateModality,
  type TiebreakerRule,
} from "@/lib/ranking";

export function ChampionshipPodiumModal({
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
                    ? "border-ink bg-olive text-cream shadow-stamp"
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

export function ScoringConfigModal({ onClose }: { onClose: () => void }) {
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
