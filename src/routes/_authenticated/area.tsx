import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, ExternalLink, Lock, Trophy, UserCheck, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { useSession } from "@/lib/auth";
import { seo } from "@/lib/seo";
import { ApplicationStatusBadge } from "@/components/ApplicationStatus";
import {
  uploadProfileAvatar,
  useMyAccountProfiles,
  usePublicSkaterProfile,
  validateAvatarFile,
  type AccountKind,
  type SkateStance,
} from "@/lib/ranking";
import {
  ChampionshipMedalBadge,
  ModalityBadge,
  RankingTrophyBadge,
  SkaterAvatar,
  StanceBadge,
} from "@/components/TrophyBadges";

export const Route = createFileRoute("/_authenticated/area")({
  head: () =>
    seo(
      "Meu Perfil e Área do Membro",
      "Gerencie seu perfil de Skatista Local ou Associado A.S.G., acompanhe o ranking e os avisos internos.",
    ),
  component: AreaPage,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  ativa: "Ativa",
  suspensa: "Suspensa",
  encerrada: "Encerrada",
  inscrito: "Inscrito",
  cancelado: "Cancelado",
  presente: "Presente",
};

function StatusChip({ value }: { value: string }) {
  return (
    <span className="inline-block rounded-sm border-2 border-ink bg-olive px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-widest text-cream">
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

function AreaPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: accountData, isLoading: loadingProfiles } = useMyAccountProfiles(userId);
  const baseProfile = accountData?.baseProfile;
  const skaterProfile = accountData?.skaterProfile;
  const associateProfile = accountData?.associateProfile;

  // Determinar tipo de conta respeitando o banco de dados e metadados de autenticação
  const accountType: AccountKind =
    baseProfile?.account_type === "skatista" || skaterProfile?.is_active
      ? "skatista"
      : (user?.user_metadata?.account_type as AccountKind) === "skatista"
        ? "skatista"
        : "associado";

  const { data: publicSkaterData } = usePublicSkaterProfile(skaterProfile?.id ?? "");

  const { data: application } = useQuery({
    queryKey: ["my-application", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("membership_applications")
        .select("id, status, created_at, reviewed_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: membership } = useQuery({
    queryKey: ["my-membership", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("association_memberships")
        .select("status, member_since")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ["announcements-associados"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, published_at")
        .eq("audience", "associados")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ["my-registrations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("id, status, events(title, starts_at, location)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Campos editáveis compartilhados e específicos
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [showAgePublicly, setShowAgePublicly] = useState(true);
  const [yearsPracticing, setYearsPracticing] = useState("");
  const [favoriteTrick, setFavoriteTrick] = useState("");
  const [stance, setStance] = useState<SkateStance | "">("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (skaterProfile) {
      setFullName(skaterProfile.full_name || baseProfile?.full_name || "");
      setAge(skaterProfile.age != null ? String(skaterProfile.age) : "");
      setShowAgePublicly(skaterProfile.show_age_publicly ?? true);
      setYearsPracticing(skaterProfile.years_practicing ?? "");
      setFavoriteTrick(skaterProfile.favorite_trick ?? "");
      setStance(skaterProfile.stance ?? "");
      setAvatarUrl(skaterProfile.avatar_url ?? baseProfile?.avatar_url ?? null);
    } else if (associateProfile) {
      setFullName(associateProfile.full_name || baseProfile?.full_name || "");
      setAge(associateProfile.age != null ? String(associateProfile.age) : "");
      setAvatarUrl(associateProfile.avatar_url ?? baseProfile?.avatar_url ?? null);
    } else if (baseProfile) {
      setFullName(baseProfile.full_name ?? "");
      setAge(baseProfile.age != null ? String(baseProfile.age) : "");
      setShowAgePublicly(baseProfile.show_age_publicly ?? true);
      setAvatarUrl(baseProfile.avatar_url ?? null);
    }
    if (baseProfile) {
      setPhone(baseProfile.phone ?? "");
    }
  }, [baseProfile, skaterProfile, associateProfile]);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;

    const validationErr = validateAvatarFile(file);
    if (validationErr) {
      toast.error(validationErr);
      return;
    }

    setUploadingPhoto(true);
    try {
      const uploadedUrl = await uploadProfileAvatar(userId, file);
      setAvatarUrl(uploadedUrl);

      // Persistir imediatamente no perfil correspondente
      await (supabase as any).from("profiles").update({ avatar_url: uploadedUrl }).eq("id", userId);

      if (skaterProfile) {
        await (supabase as any)
          .from("skater_profiles")
          .update({ avatar_url: uploadedUrl })
          .eq("user_id", userId);
      }
      if (associateProfile) {
        await (supabase as any)
          .from("associate_profiles")
          .update({ avatar_url: uploadedUrl })
          .eq("user_id", userId);
      }

      toast.success("Foto de perfil atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["my-account-profiles", userId] });
      queryClient.invalidateQueries({ queryKey: ["modality-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["public-skater-profile"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveSkaterProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const cleanName = fullName.trim().slice(0, 100);
    if (cleanName.length < 2) {
      toast.error("Informe seu nome (mínimo de 2 caracteres).");
      return;
    }

    let parsedAge: number | null = null;
    if (age.trim()) {
      const n = Number(age);
      if (!Number.isInteger(n) || n < 3 || n > 110) {
        toast.error("Informe uma idade válida entre 3 e 110 anos.");
        return;
      }
      parsedAge = n;
    }

    setSavingProfile(true);
    try {
      await (supabase as any)
        .from("profiles")
        .update({
          full_name: cleanName,
          avatar_url: avatarUrl,
          age: parsedAge,
          show_age_publicly: showAgePublicly,
        })
        .eq("id", userId);

      if (skaterProfile) {
        const { error } = await (supabase as any)
          .from("skater_profiles")
          .update({
            full_name: cleanName,
            avatar_url: avatarUrl,
            age: parsedAge,
            show_age_publicly: showAgePublicly,
            years_practicing: yearsPracticing.trim().slice(0, 60) || "",
            favorite_trick: favoriteTrick.trim().slice(0, 80) || "",
            stance: stance === "regular" || stance === "goofy" ? stance : null,
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const rawMod = user?.user_metadata?.modality;
        const initialModality =
          rawMod === "vert" || rawMod === "versatil" || rawMod === "escolher_depois"
            ? rawMod
            : "street";
        const { error } = await (supabase as any).from("skater_profiles").insert({
          user_id: userId,
          full_name: cleanName,
          avatar_url: avatarUrl,
          age: parsedAge,
          show_age_publicly: showAgePublicly,
          years_practicing: yearsPracticing.trim().slice(0, 60) || "",
          favorite_trick: favoriteTrick.trim().slice(0, 80) || "",
          stance: stance === "regular" || stance === "goofy" ? stance : null,
          modality: initialModality,
        });
        if (error) throw error;
      }

      toast.success("Perfil de skatista atualizado!");
      queryClient.invalidateQueries({ queryKey: ["my-account-profiles", userId] });
      queryClient.invalidateQueries({ queryKey: ["modality-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["public-skater-profile"] });
    } catch {
      toast.error("Não foi possível salvar seu perfil de skatista.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveAssociateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const cleanName = fullName.trim().slice(0, 100);
    const cleanPhone = phone.trim().slice(0, 20);
    if (cleanName.length < 3) {
      toast.error("Informe seu nome completo (mínimo de 3 caracteres).");
      return;
    }
    if (
      cleanPhone &&
      (!/^[0-9+() .-]{8,20}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 8)
    ) {
      toast.error("Informe um telefone válido com DDD ou deixe o campo em branco.");
      return;
    }

    let parsedAge: number | null = null;
    if (age.trim()) {
      const n = Number(age);
      if (!Number.isInteger(n) || n < 3 || n > 110) {
        toast.error("Informe uma idade válida entre 3 e 110 anos.");
        return;
      }
      parsedAge = n;
    }

    setSavingProfile(true);
    try {
      const { error: baseErr } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: cleanName,
          phone: cleanPhone || null,
          avatar_url: avatarUrl,
          age: parsedAge,
        })
        .eq("id", userId);
      if (baseErr) throw baseErr;

      if (associateProfile) {
        await (supabase as any)
          .from("associate_profiles")
          .update({
            full_name: cleanName,
            avatar_url: avatarUrl,
            age: parsedAge,
          })
          .eq("user_id", userId);
      } else {
        await (supabase as any).from("associate_profiles").insert({
          user_id: userId,
          full_name: cleanName,
          avatar_url: avatarUrl,
          age: parsedAge,
        });
      }

      toast.success("Perfil de associado atualizado!");
      queryClient.invalidateQueries({ queryKey: ["my-account-profiles", userId] });
    } catch {
      toast.error("Não foi possível salvar o perfil de associado.");
    } finally {
      setSavingProfile(false);
    }
  }

  const firstName = (fullName || baseProfile?.full_name || user?.email || "").split(" ")[0].trim();

  return (
    <>
      <PageHero
        eyebrow={accountType === "skatista" ? "Perfil do Skatista Local" : "Perfil do Associado"}
        title={`Salve, ${firstName || "skatista"}`}
      >
        {accountType === "skatista"
          ? "Gerencie seu perfil de skatista, envie sua foto e acompanhe sua pontuação e troféus no Ranking Oficial da A.S.G."
          : "Gerencie seu perfil exclusivo de associado da A.S.G., acompanhe sua associação e os avisos internos."}
      </PageHero>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarSelect}
      />

      {loadingProfiles ? (
        <Section>
          <p className="text-muted-foreground">Carregando seu perfil…</p>
        </Section>
      ) : accountType === "skatista" ? (
        /* =========================================================
         * 2. PERFIL DO SKATISTA (VISUAL URBANO + DADOS COMPETITIVOS)
         * ========================================================= */
        <Section className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Cartão de Identidade Street & Ranking Atual */}
            <Card className="lg:col-span-5 flex flex-col justify-between bg-ink text-cream border-2 border-ink">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream/15 pb-4">
                  <span className="font-condensed text-xs font-bold uppercase tracking-widest text-amber">
                    Carteira de Skatista A.S.G.
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {stance && <StanceBadge stance={stance} size="sm" />}
                    {skaterProfile && <ModalityBadge modality={skaterProfile.modality} />}
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative">
                    <SkaterAvatar
                      name={fullName || "Skatista"}
                      avatarUrl={avatarUrl}
                      size="xl"
                      trophyTier={publicSkaterData?.skater.trophy_tier}
                    />
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-amber px-2.5 py-1 font-condensed text-[11px] font-bold uppercase text-ink shadow-stamp hover:brightness-105"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {uploadingPhoto ? "Enviando…" : "Foto"}
                    </button>
                  </div>

                  <div className="text-center sm:text-left">
                    <h2 className="font-display text-3xl uppercase leading-none text-cream">
                      {fullName || "Skatista Local"}
                    </h2>
                    <p className="mt-1 text-xs text-cream/75">
                      {yearsPracticing
                        ? `Skate há ${yearsPracticing}`
                        : "Tempo de prática não informado"}
                      {age && showAgePublicly ? ` • ${age} anos` : ""}
                    </p>
                    {favoriteTrick && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-sm bg-cream/10 px-2.5 py-1 font-condensed text-xs font-bold uppercase tracking-wider text-amber">
                        <Sparkles className="h-3.5 w-3.5" /> Manobra: {favoriteTrick}
                      </p>
                    )}
                  </div>
                </div>

                {/* Estatísticas Oficiais do Ranking (Somente Leitura) */}
                <div className="mt-6 grid grid-cols-2 gap-3 rounded-md border border-cream/20 bg-cream/5 p-4">
                  <div>
                    <span className="block font-condensed text-xs uppercase tracking-widest text-cream/70">
                      Posição Atual (
                      {skaterProfile?.modality === "versatil"
                        ? "STREET + VERT"
                        : skaterProfile?.modality === "escolher_depois"
                          ? "EM ABERTO"
                          : (skaterProfile?.modality?.toUpperCase() ?? "STREET")}
                      )
                    </span>
                    <p className="mt-1 font-display text-4xl text-amber">
                      {skaterProfile?.modality === "escolher_depois"
                        ? "—"
                        : publicSkaterData?.skater.rank_position
                          ? `${publicSkaterData.skater.rank_position}º`
                          : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="block font-condensed text-xs uppercase tracking-widest text-cream/70">
                      Pontuação Acumulada
                    </span>
                    <p className="mt-1 font-display text-4xl text-cream">
                      {skaterProfile?.total_points ?? 0}{" "}
                      <span className="text-lg font-condensed text-cream/70">PTS</span>
                    </p>
                  </div>
                </div>

                {publicSkaterData?.skater.trophy_tier && (
                  <div className="mt-4 flex justify-center sm:justify-start">
                    <RankingTrophyBadge tier={publicSkaterData.skater.trophy_tier} size="md" />
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-cream/15 pt-4">
                {skaterProfile && (
                  <Link
                    to="/skatistas/$skaterId"
                    params={{ skaterId: skaterProfile.id }}
                    className="inline-flex items-center gap-1.5 font-condensed text-xs font-bold uppercase tracking-widest text-amber hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ver meu Perfil Público
                  </Link>
                )}
                <Link
                  to="/ranking"
                  className="inline-flex items-center gap-1.5 font-condensed text-xs font-bold uppercase tracking-widest text-cream/80 hover:text-cream"
                >
                  <Trophy className="h-3.5 w-3.5" /> Ir para o Ranking
                </Link>
              </div>
            </Card>

            {/* Formulário de Edição de Dados Pessoais Permitidos do Skatista */}
            <Card className="lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-2xl">Editar Perfil de Skatista</h2>
                  <p className="text-sm text-muted-foreground">
                    Personalize seus dados pessoais e sua foto. Pontos, posição e resultados são
                    calculados oficialmente pelos campeonatos da A.S.G.
                  </p>
                </div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={saveSkaterProfile}>
                <div className="flex flex-wrap items-center gap-3 rounded-md border-2 border-dashed border-ink/40 bg-muted/30 p-3">
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-ghost-stamp text-xs"
                  >
                    <Camera className="h-4 w-4" />
                    {uploadingPhoto
                      ? "Enviando imagem…"
                      : "Selecionar foto da galeria / computador"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG ou WEBP • máx. 3 MB
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="eyebrow">Nome / Apelido nas Pistas</span>
                    <input
                      required
                      maxLength={100}
                      className="field mt-1"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="eyebrow">Idade</span>
                    <input
                      type="number"
                      min={3}
                      max={110}
                      placeholder="Ex: 19"
                      className="field mt-1"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="eyebrow">Tempo de prática do skate</span>
                    <input
                      maxLength={60}
                      placeholder="Ex: 6 anos"
                      className="field mt-1"
                      value={yearsPracticing}
                      onChange={(e) => setYearsPracticing(e.target.value)}
                    />
                  </label>

                  <label className="block">
                    <span className="eyebrow">Base (Regular / Goofy)</span>
                    <select
                      className="field mt-1"
                      value={stance}
                      onChange={(e) => setStance(e.target.value as SkateStance | "")}
                    >
                      <option value="">Selecione sua base…</option>
                      <option value="regular">Regular (pé esquerdo na frente)</option>
                      <option value="goofy">Goofy (pé direito na frente)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="eyebrow">Manobra preferida</span>
                    <input
                      maxLength={80}
                      placeholder="Ex: Hardflip / Frontside Smith Grind"
                      className="field mt-1"
                      value={favoriteTrick}
                      onChange={(e) => setFavoriteTrick(e.target.value)}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={showAgePublicly}
                    onChange={(e) => setShowAgePublicly(e.target.checked)}
                    className="h-4 w-4 accent-rust"
                  />
                  <span>Exibir minha idade no perfil público</span>
                </label>

                <div className="rounded-md border border-border bg-muted/40 p-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="eyebrow flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Modalidade Principal
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Para alterar sua modalidade competitiva ou tipo de conta, solicite autorização
                      à diretoria da A.S.G.
                    </p>
                  </div>
                  {skaterProfile && <ModalityBadge modality={skaterProfile.modality} />}
                </div>

                <button disabled={savingProfile} className="btn-stamp disabled:opacity-60">
                  {savingProfile ? "Salvando…" : "Salvar Perfil de Skatista"}
                </button>
              </form>
            </Card>
          </div>

          {/* Histórico de Resultados em Campeonatos do Skatista */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl">Meu Histórico em Campeonatos</h2>
                <p className="text-sm text-muted-foreground">
                  Resultados oficiais homologados pela A.S.G. e pontos somados no ranking.
                </p>
              </div>
              <Link to="/resultados" className="btn-ghost-stamp text-xs">
                Ver todos os resultados
              </Link>
            </div>

            {!publicSkaterData?.history || publicSkaterData.history.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Você ainda não possui pódios registrados em campeonatos oficiais.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border-2 border-ink">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink text-cream">
                    <tr>
                      <th className="eyebrow px-4 py-3">Campeonato</th>
                      <th className="eyebrow px-4 py-3">Data</th>
                      <th className="eyebrow px-4 py-3">Modalidade</th>
                      <th className="eyebrow px-4 py-3">Colocação</th>
                      <th className="eyebrow px-4 py-3 text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publicSkaterData.history.map((h) => (
                      <tr key={h.championship_id} className="border-t border-border">
                        <td className="px-4 py-3 font-semibold">{h.championship_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(h.event_date + "T00:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ModalityBadge modality={h.modality} size="sm" />
                        </td>
                        <td className="px-4 py-3">
                          <ChampionshipMedalBadge placement={h.placement} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rust">
                          +{h.points_awarded} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Section>
      ) : (
        /* =========================================================
         * 3. PERFIL DO ASSOCIADO (EXCLUSIVO E SEPARADO DO RANKING)
         * ========================================================= */
        <Section className="grid gap-6 md:grid-cols-12">
          <Card className="md:col-span-5 flex flex-col justify-between bg-secondary border-2 border-ink">
            <div>
              <div className="flex items-center justify-between border-b border-ink/15 pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-ink bg-olive px-2.5 py-0.5 font-condensed text-xs font-bold uppercase tracking-widest text-cream">
                  <UserCheck className="h-3.5 w-3.5" /> Conta de Associado
                </span>
                {membership && <StatusChip value={membership.status} />}
              </div>

              <div className="mt-6 flex flex-col items-center text-center">
                <div className="relative">
                  <SkaterAvatar name={fullName || "Associado"} avatarUrl={avatarUrl} size="xl" />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full border-2 border-ink bg-amber px-2.5 py-1 font-condensed text-[11px] font-bold uppercase text-ink shadow-stamp"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {uploadingPhoto ? "…" : "Foto"}
                  </button>
                </div>

                <h2 className="mt-4 font-display text-3xl uppercase">{fullName || "Associado"}</h2>
                {age && <p className="text-sm text-muted-foreground">{age} anos</p>}
                <p className="mt-3 text-xs text-muted-foreground max-w-xs">
                  Este é o seu perfil associativo exclusivo da A.S.G. Associados não são listados
                  automaticamente nos rankings competitivos de Street ou Vert.
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-ink/15 pt-4 space-y-2">
              <span className="eyebrow block">Situação Associativa</span>
              {membership ? (
                <p className="flex items-center gap-3 text-sm">
                  <StatusChip value={membership.status} />
                  <span className="text-muted-foreground">
                    desde{" "}
                    {new Date(membership.member_since + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </p>
              ) : application ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm">
                    Solicitação: <ApplicationStatusBadge status={application.status} />
                  </p>
                  {application.status === "pendente" && (
                    <p className="text-xs text-muted-foreground">
                      A diretoria está analisando seu pedido de associação.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Deseja formalizar seu cadastro associativo completo junto à diretoria?
                  </p>
                  <Link to="/associe-se" className="btn-stamp text-xs inline-flex">
                    Enviar ficha de associação
                  </Link>
                </div>
              )}
            </div>
          </Card>

          <Card className="md:col-span-7">
            <h2 className="text-2xl">Editar Perfil de Associado</h2>
            <p className="text-sm text-muted-foreground">
              Atualize sua foto de perfil, nome e idade.
            </p>

            <form className="mt-4 space-y-4" onSubmit={saveAssociateProfile}>
              <div className="flex flex-wrap items-center gap-3 rounded-md border-2 border-dashed border-ink/40 bg-muted/30 p-3">
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-ghost-stamp text-xs"
                >
                  <Camera className="h-4 w-4" />
                  {uploadingPhoto ? "Enviando imagem…" : "Selecionar foto da galeria / computador"}
                </button>
                <span className="text-xs text-muted-foreground">JPG, PNG ou WEBP • máx. 3 MB</span>
              </div>

              <label className="block">
                <span className="eyebrow">Nome completo</span>
                <input
                  required
                  maxLength={100}
                  className="field mt-1"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="eyebrow">Idade</span>
                  <input
                    type="number"
                    min={3}
                    max={110}
                    placeholder="Ex: 28"
                    className="field mt-1"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="eyebrow">Telefone (privado)</span>
                  <input
                    type="tel"
                    maxLength={20}
                    className="field mt-1"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </div>

              <button disabled={savingProfile} className="btn-stamp disabled:opacity-60">
                {savingProfile ? "Salvando…" : "Salvar Perfil de Associado"}
              </button>
            </form>
          </Card>
        </Section>
      )}

      {/* Avisos Internos e Inscrições em Eventos (Preservados para todos os membros logados) */}
      <Section className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl">Avisos internos</h2>
          {announcements && announcements.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {announcements.map((a) => (
                <li key={a.id} className="border-b border-border pb-3 last:border-0">
                  <p className="font-condensed text-lg font-bold uppercase">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">Nenhum aviso no momento.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-2xl">Minhas inscrições em eventos</h2>
          {registrations && registrations.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {registrations.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-condensed text-lg font-bold uppercase">
                      {r.events?.title ?? "Evento"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.events?.starts_at
                        ? new Date(r.events.starts_at).toLocaleDateString("pt-BR")
                        : "Data a definir"}
                      {r.events?.location ? ` · ${r.events.location}` : ""}
                    </p>
                  </div>
                  <StatusChip value={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">
              Você ainda não se inscreveu em nenhum evento.
            </p>
          )}
        </Card>
      </Section>
    </>
  );
}
