import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountKind = "skatista" | "associado";
export type SkateModality = "street" | "vert" | "versatil" | "escolher_depois";
export type SkateStance = "regular" | "goofy";
export type TrophyTier = "ouro" | "prata" | "bronze";
export type TiebreakerRule = "podium_counts" | "shared_position_only";

export interface SkaterProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  age: number | null;
  show_age_publicly: boolean;
  years_practicing: string | null;
  favorite_trick: string | null;
  stance: SkateStance | null;
  modality: SkateModality;
  total_points: number;
  first_places: number;
  second_places: number;
  third_places: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssociateProfileRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  age: number | null;
  associate_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RankingEntry {
  skater_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  age: number | null;
  years_practicing: string | null;
  favorite_trick: string | null;
  stance: SkateStance | null;
  modality: SkateModality;
  total_points: number;
  first_places: number;
  second_places: number;
  third_places: number;
  rank_position: number;
  trophy_tier: TrophyTier | null;
}

export interface ChampionshipPodiumSkaterSummary {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  modality: SkateModality;
}

export interface ChampionshipPodiumRow {
  id: string;
  championship_name: string;
  event_date: string;
  modality: SkateModality;
  first_place_skater_id: string;
  second_place_skater_id: string;
  third_place_skater_id: string;
  first_place_points: number;
  second_place_points: number;
  third_place_points: number;
  notes: string | null;
  status: "publicado" | "cancelado";
  published: boolean;
  cancelled: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  first_skater?: ChampionshipPodiumSkaterSummary | null;
  second_skater?: ChampionshipPodiumSkaterSummary | null;
  third_skater?: ChampionshipPodiumSkaterSummary | null;
}

export interface ChampionshipHistoryEntry {
  championship_id: string;
  championship_name: string;
  event_date: string;
  modality: SkateModality;
  placement: 1 | 2 | 3;
  points_awarded: number;
  notes: string | null;
}

export interface ScoringConfigRow {
  id: number;
  first_place_points: number;
  second_place_points: number;
  third_place_points: number;
  tiebreaker_rule: TiebreakerRule;
  updated_at: string;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfigRow = {
  id: 1,
  first_place_points: 1000,
  second_place_points: 750,
  third_place_points: 500,
  tiebreaker_rule: "podium_counts",
  updated_at: new Date().toISOString(),
};

const ALLOWED_AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

export function validateAvatarFile(file: File): string | null {
  if (
    !ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])
  ) {
    return "Formato de imagem inválido. Envie JPG, PNG ou WEBP.";
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
    return "A imagem deve ter no máximo 3 MB.";
  }
  return null;
}

async function createResizedDataUrl(file: File, maxDim = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem corrompida ou inválida."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function compressAvatarBlob(file: File, maxDim = 640): Promise<Blob> {
  if (file.size <= 1.8 * 1024 * 1024) return file;
  try {
    const dataUrl = await createResizedDataUrl(file, maxDim);
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    return file;
  }
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const uploadBody = await compressAvatarBlob(file, 640);
  const isCompressedJpeg = uploadBody !== file;
  const ext = isCompressedJpeg
    ? "jpg"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const contentType = isCompressedJpeg ? "image/jpeg" : file.type;
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, uploadBody, {
    cacheControl: "3600",
    upsert: true,
    contentType,
  });

  if (!uploadError) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Fallback seguro em data URL redimensionada caso o bucket ainda não esteja provisionado
  return createResizedDataUrl(file, 320);
}

/**
 * Persiste a foto de perfil do usuário em todas as camadas do banco (profiles, skater_profiles,
 * associate_profiles, auth.users user_metadata e cache local) para nunca se perder ao recarregar.
 */
export async function persistUserAvatarEverywhere(params: {
  userId: string;
  avatarUrl: string | null;
  fullName?: string;
  accountType?: AccountKind;
  modality?: SkateModality;
}): Promise<void> {
  const { userId, avatarUrl, fullName, accountType, modality } = params;
  if (!userId) return;

  if (typeof window !== "undefined") {
    try {
      if (avatarUrl) {
        localStorage.setItem(`asg_user_avatar_${userId}`, avatarUrl);
      } else {
        localStorage.removeItem(`asg_user_avatar_${userId}`);
      }
    } catch {
      // ignora erro de quota
    }
  }

  const cleanName = (fullName || "Membro A.S.G.").trim().slice(0, 100) || "Membro A.S.G.";

  // 1. Salvar em auth.users (user_metadata) quando for URL ou data URL compacta
  if (avatarUrl && avatarUrl.length < 180_000) {
    try {
      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });
    } catch {
      // ignora falha de metadata se sessão estiver expirando
    }
  }

  // 2. Atualizar ou inserir em public.profiles
  const { data: updatedProf } = await (supabase as any)
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select("id");

  if (!updatedProf || updatedProf.length === 0) {
    await (supabase as any).from("profiles").upsert(
      {
        id: userId,
        full_name: cleanName,
        avatar_url: avatarUrl,
        ...(accountType ? { account_type: accountType } : {}),
      },
      { onConflict: "id" },
    );
  }

  // 3. Atualizar ou criar em public.skater_profiles
  const { data: updatedSkater } = await (supabase as any)
    .from("skater_profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId)
    .select("id");

  if ((!updatedSkater || updatedSkater.length === 0) && accountType === "skatista") {
    const safeModality: SkateModality =
      modality === "vert" || modality === "versatil" || modality === "escolher_depois"
        ? modality
        : "street";
    await (supabase as any).from("skater_profiles").upsert(
      {
        user_id: userId,
        full_name: cleanName.length >= 2 ? cleanName : "Skatista Local",
        avatar_url: avatarUrl,
        modality: safeModality,
      },
      { onConflict: "user_id" },
    );
  }

  // 4. Atualizar ou criar em public.associate_profiles
  const { data: updatedAssoc } = await (supabase as any)
    .from("associate_profiles")
    .update({ avatar_url: avatarUrl })
    .eq("user_id", userId)
    .select("user_id");

  if ((!updatedAssoc || updatedAssoc.length === 0) && accountType === "associado") {
    await (supabase as any).from("associate_profiles").upsert(
      {
        user_id: userId,
        full_name: cleanName,
        avatar_url: avatarUrl,
      },
      { onConflict: "user_id" },
    );
  }
}

/**
 * Calcula a classificação oficial da modalidade respeitando pontuação acumulada
 * e critério de desempate configurável (sem inventar vantagem quando empatados).
 */
export function computeModalityRanking(
  skaters: SkaterProfileRow[],
  targetModality?: SkateModality,
  tiebreakerRule: TiebreakerRule = "podium_counts",
): RankingEntry[] {
  const active = skaters.filter((s) => {
    if (!s.is_active || s.modality === "escolher_depois") return false;
    if (targetModality && targetModality !== "versatil") {
      return s.modality === targetModality || s.modality === "versatil";
    }
    return true;
  });

  const sorted = [...active].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (tiebreakerRule === "podium_counts") {
      if (b.first_places !== a.first_places) return b.first_places - a.first_places;
      if (b.second_places !== a.second_places) return b.second_places - a.second_places;
      if (b.third_places !== a.third_places) return b.third_places - a.third_places;
    }
    return a.full_name.localeCompare(b.full_name, "pt-BR");
  });

  let currentRank = 1;
  return sorted.map((s, idx) => {
    if (idx > 0) {
      const prev = sorted[idx - 1]!;
      const samePoints = prev.total_points === s.total_points;
      const sameTiebreaker =
        tiebreakerRule === "shared_position_only"
          ? true
          : prev.first_places === s.first_places &&
            prev.second_places === s.second_places &&
            prev.third_places === s.third_places;

      if (!(samePoints && sameTiebreaker)) {
        currentRank = idx + 1;
      }
    }

    const trophy_tier: TrophyTier | null =
      s.total_points > 0 && currentRank === 1
        ? "ouro"
        : s.total_points > 0 && currentRank === 2
          ? "prata"
          : s.total_points > 0 && currentRank === 3
            ? "bronze"
            : null;

    return {
      skater_id: s.id,
      user_id: s.user_id,
      full_name: s.full_name,
      avatar_url: s.avatar_url,
      age: s.show_age_publicly ? s.age : null,
      years_practicing: s.years_practicing,
      favorite_trick: s.favorite_trick,
      stance: (s.stance as SkateStance | null) ?? null,
      modality: s.modality,
      total_points: s.total_points,
      first_places: s.first_places,
      second_places: s.second_places,
      third_places: s.third_places,
      rank_position: currentRank,
      trophy_tier,
    };
  });
}

export function useModalityRanking(modality: SkateModality) {
  return useQuery({
    queryKey: ["modality-ranking", modality],
    queryFn: async (): Promise<RankingEntry[]> => {
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        "get_modality_ranking",
        { _modality: modality },
      );

      let entries: RankingEntry[] = [];
      if (!rpcError && Array.isArray(rpcData)) {
        entries = rpcData.map((r: any) => ({
          skater_id: r.skater_id,
          user_id: r.user_id,
          full_name: r.full_name,
          avatar_url: r.avatar_url ?? null,
          age: r.age ?? null,
          years_practicing: r.years_practicing ?? null,
          favorite_trick: r.favorite_trick ?? null,
          stance: (r.stance as SkateStance | null) ?? null,
          modality: r.modality as SkateModality,
          total_points: Number(r.total_points ?? 0),
          first_places: Number(r.first_places ?? 0),
          second_places: Number(r.second_places ?? 0),
          third_places: Number(r.third_places ?? 0),
          rank_position: Number(r.rank_position ?? 1),
          trophy_tier: (r.trophy_tier as TrophyTier | null) ?? null,
        }));
      } else {
        const { data: skaters, error } = await (supabase as any)
          .from("skater_profiles")
          .select("*")
          .or(`modality.eq.${modality},modality.eq.versatil`)
          .eq("is_active", true);

        if (error || !skaters) return [];
        entries = computeModalityRanking(skaters as SkaterProfileRow[], modality);
      }

      // Garantir que fotos salvas em profiles ou cache local apareçam para todos os skatistas
      const missingAvatarUserIds = entries
        .filter((e) => !e.avatar_url && e.user_id)
        .map((e) => e.user_id);

      if (missingAvatarUserIds.length > 0) {
        const { data: profAvatars } = await (supabase as any)
          .from("profiles")
          .select("id, avatar_url")
          .in("id", missingAvatarUserIds);

        const avatarMap = new Map<string, string>();
        for (const p of profAvatars ?? []) {
          if (p?.id && p?.avatar_url) {
            avatarMap.set(p.id, p.avatar_url);
          }
        }

        entries = entries.map((e) => {
          if (e.avatar_url) return e;
          const fallbackUrl =
            avatarMap.get(e.user_id) ||
            (typeof window !== "undefined"
              ? localStorage.getItem(`asg_user_avatar_${e.user_id}`)
              : null) ||
            null;
          return fallbackUrl ? { ...e, avatar_url: fallbackUrl } : e;
        });
      }

      return entries;
    },
  });
}

export interface PublicSkaterProfileData {
  skater: RankingEntry;
  history: ChampionshipHistoryEntry[];
}

export function usePublicSkaterProfile(skaterId: string) {
  return useQuery({
    queryKey: ["public-skater-profile", skaterId],
    enabled: Boolean(skaterId),
    queryFn: async (): Promise<PublicSkaterProfileData | null> => {
      const { data: rawSkater, error: skaterErr } = await (supabase as any)
        .from("skater_profiles")
        .select(
          "id, user_id, full_name, avatar_url, age, show_age_publicly, years_practicing, favorite_trick, stance, modality, total_points, first_places, second_places, third_places, is_active, created_at, updated_at",
        )
        .eq("id", skaterId)
        .eq("is_active", true)
        .maybeSingle();

      if (skaterErr || !rawSkater) return null;

      const modality = rawSkater.modality as SkateModality;

      // Buscar posição oficial no ranking da modalidade
      let rankEntry: RankingEntry | undefined;
      const { data: rpcRanking } = await (supabase as any).rpc("get_modality_ranking", {
        _modality: modality,
      });

      if (Array.isArray(rpcRanking)) {
        const found = rpcRanking.find((r: any) => r.skater_id === skaterId);
        if (found) {
          rankEntry = {
            skater_id: found.skater_id,
            user_id: found.user_id,
            full_name: found.full_name,
            avatar_url: found.avatar_url ?? null,
            age: found.age ?? null,
            years_practicing: found.years_practicing ?? null,
            favorite_trick: found.favorite_trick ?? null,
            stance:
              (found.stance as SkateStance | null) ??
              (rawSkater.stance as SkateStance | null) ??
              null,
            modality: found.modality as SkateModality,
            total_points: Number(found.total_points ?? 0),
            first_places: Number(found.first_places ?? 0),
            second_places: Number(found.second_places ?? 0),
            third_places: Number(found.third_places ?? 0),
            rank_position: Number(found.rank_position ?? 1),
            trophy_tier: (found.trophy_tier as TrophyTier | null) ?? null,
          };
        }
      }

      if (!rankEntry) {
        if (modality === "escolher_depois") {
          rankEntry = {
            skater_id: rawSkater.id,
            user_id: rawSkater.user_id,
            full_name: rawSkater.full_name,
            avatar_url: rawSkater.avatar_url ?? null,
            age: rawSkater.show_age_publicly ? rawSkater.age : null,
            years_practicing: rawSkater.years_practicing ?? null,
            favorite_trick: rawSkater.favorite_trick ?? null,
            stance: (rawSkater.stance as SkateStance | null) ?? null,
            modality: "escolher_depois",
            total_points: 0,
            first_places: 0,
            second_places: 0,
            third_places: 0,
            rank_position: 0,
            trophy_tier: null,
          };
        } else if (modality === "versatil") {
          const { data: streetRank } = await (supabase as any).rpc("get_modality_ranking", {
            _modality: "street",
          });
          const foundStreet = Array.isArray(streetRank)
            ? streetRank.find((r: any) => r.skater_id === skaterId)
            : undefined;
          rankEntry = {
            skater_id: rawSkater.id,
            user_id: rawSkater.user_id,
            full_name: rawSkater.full_name,
            avatar_url: rawSkater.avatar_url ?? null,
            age: rawSkater.show_age_publicly ? rawSkater.age : null,
            years_practicing: rawSkater.years_practicing ?? null,
            favorite_trick: rawSkater.favorite_trick ?? null,
            stance: (rawSkater.stance as SkateStance | null) ?? null,
            modality: "versatil",
            total_points: Number(rawSkater.total_points ?? 0),
            first_places: Number(rawSkater.first_places ?? 0),
            second_places: Number(rawSkater.second_places ?? 0),
            third_places: Number(rawSkater.third_places ?? 0),
            rank_position: foundStreet?.rank_position ? Number(foundStreet.rank_position) : 1,
            trophy_tier: (foundStreet?.trophy_tier as TrophyTier | null) ?? null,
          };
        } else {
          const { data: modalitySkaters } = await (supabase as any)
            .from("skater_profiles")
            .select("*")
            .or(`modality.eq.${modality},modality.eq.versatil`)
            .eq("is_active", true);
          const computed = computeModalityRanking(
            (modalitySkaters ?? [rawSkater]) as SkaterProfileRow[],
            modality,
          );
          rankEntry = computed.find((r) => r.skater_id === skaterId);
        }
      }

      if (!rankEntry) return null;

      if (!rankEntry.avatar_url && rawSkater.user_id) {
        const { data: baseProf } = await (supabase as any)
          .from("profiles")
          .select("avatar_url")
          .eq("id", rawSkater.user_id)
          .maybeSingle();
        const fallbackAvatar =
          baseProf?.avatar_url ||
          (typeof window !== "undefined"
            ? localStorage.getItem(`asg_user_avatar_${rawSkater.user_id}`)
            : null) ||
          null;
        if (fallbackAvatar) {
          rankEntry = { ...rankEntry, avatar_url: fallbackAvatar };
        }
      }

      // Buscar histórico de campeonatos
      let history: ChampionshipHistoryEntry[] = [];
      const { data: rpcHistory, error: histErr } = await (supabase as any).rpc(
        "get_skater_championship_history",
        { _skater_id: skaterId },
      );

      if (!histErr && Array.isArray(rpcHistory)) {
        history = rpcHistory.map((h: any) => ({
          championship_id: h.championship_id,
          championship_name: h.championship_name,
          event_date: h.event_date,
          modality: h.modality as SkateModality,
          placement: Number(h.placement) as 1 | 2 | 3,
          points_awarded: Number(h.points_awarded),
          notes: h.notes ?? null,
        }));
      } else {
        const { data: podiums } = await (supabase as any)
          .from("championship_podiums")
          .select("*")
          .eq("status", "publicado")
          .or(
            `first_place_skater_id.eq.${skaterId},second_place_skater_id.eq.${skaterId},third_place_skater_id.eq.${skaterId}`,
          )
          .order("event_date", { ascending: false });

        if (Array.isArray(podiums)) {
          history = podiums.map((cp: any) => {
            const placement: 1 | 2 | 3 =
              cp.first_place_skater_id === skaterId
                ? 1
                : cp.second_place_skater_id === skaterId
                  ? 2
                  : 3;
            const points_awarded =
              placement === 1
                ? cp.first_points
                : placement === 2
                  ? cp.second_points
                  : cp.third_points;
            return {
              championship_id: cp.id,
              championship_name: cp.championship_name,
              event_date: cp.event_date,
              modality: cp.modality as SkateModality,
              placement,
              points_awarded: Number(points_awarded),
              notes: cp.notes ?? null,
            };
          });
        }
      }

      return { skater: rankEntry, history };
    },
  });
}

export function useMyAccountProfiles(userId?: string) {
  return useQuery({
    queryKey: ["my-account-profiles", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [
        { data: baseProfile },
        { data: skaterProfile },
        { data: associateProfile },
        { data: authData },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        (supabase as any).from("skater_profiles").select("*").eq("user_id", userId!).maybeSingle(),
        (supabase as any)
          .from("associate_profiles")
          .select("*")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      const metaAvatar = (authData?.user?.user_metadata?.avatar_url as string | undefined) || null;
      const localAvatar =
        typeof window !== "undefined" ? localStorage.getItem(`asg_user_avatar_${userId}`) : null;

      const resolvedAvatar =
        (skaterProfile as any)?.avatar_url ||
        (associateProfile as any)?.avatar_url ||
        (baseProfile as any)?.avatar_url ||
        metaAvatar ||
        localAvatar ||
        null;

      // Sincronizar automaticamente caso alguma das tabelas ainda esteja sem o avatar_url salvo
      if (resolvedAvatar) {
        if (baseProfile && !(baseProfile as any).avatar_url) {
          (baseProfile as any).avatar_url = resolvedAvatar;
          void (supabase as any)
            .from("profiles")
            .update({ avatar_url: resolvedAvatar })
            .eq("id", userId!);
        }
        if (skaterProfile && !(skaterProfile as any).avatar_url) {
          (skaterProfile as any).avatar_url = resolvedAvatar;
          void (supabase as any)
            .from("skater_profiles")
            .update({ avatar_url: resolvedAvatar })
            .eq("user_id", userId!);
        }
        if (associateProfile && !(associateProfile as any).avatar_url) {
          (associateProfile as any).avatar_url = resolvedAvatar;
          void (supabase as any)
            .from("associate_profiles")
            .update({ avatar_url: resolvedAvatar })
            .eq("user_id", userId!);
        }
      }

      return {
        baseProfile: baseProfile
          ? ({
              ...(baseProfile as any),
              avatar_url: (baseProfile as any).avatar_url ?? resolvedAvatar,
            } as any)
          : resolvedAvatar
            ? ({ id: userId, avatar_url: resolvedAvatar } as any)
            : null,
        skaterProfile: skaterProfile
          ? ({
              ...(skaterProfile as SkaterProfileRow),
              avatar_url: (skaterProfile as SkaterProfileRow).avatar_url ?? resolvedAvatar,
            } as SkaterProfileRow)
          : null,
        associateProfile: associateProfile
          ? ({
              ...(associateProfile as AssociateProfileRow),
              avatar_url: (associateProfile as AssociateProfileRow).avatar_url ?? resolvedAvatar,
            } as AssociateProfileRow)
          : null,
      };
    },
  });
}

export function useActiveSkatersByModality(modality?: SkateModality) {
  return useQuery({
    queryKey: ["active-skaters", modality ?? "all"],
    queryFn: async (): Promise<SkaterProfileRow[]> => {
      let query = (supabase as any)
        .from("skater_profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (modality && modality !== "escolher_depois") {
        query = query.or(`modality.eq.${modality},modality.eq.versatil`);
      } else {
        query = query.neq("modality", "escolher_depois");
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return data as SkaterProfileRow[];
    },
  });
}

export function useChampionshipPodiums(includeCancelled = false) {
  return useQuery({
    queryKey: ["championship-podiums", includeCancelled],
    queryFn: async (): Promise<ChampionshipPodiumRow[]> => {
      let query = (supabase as any)
        .from("championship_podiums")
        .select(
          `
          *,
          first_skater:skater_profiles!championship_podiums_first_place_skater_id_fkey(id, user_id, full_name, avatar_url, modality),
          second_skater:skater_profiles!championship_podiums_second_place_skater_id_fkey(id, user_id, full_name, avatar_url, modality),
          third_skater:skater_profiles!championship_podiums_third_place_skater_id_fkey(id, user_id, full_name, avatar_url, modality)
        `,
        )
        .order("event_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!includeCancelled) {
        query = query.eq("status", "publicado");
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return (data as any[]).map((row) => ({
        ...row,
        first_place_points: Number(row.first_points ?? row.first_place_points ?? 1000),
        second_place_points: Number(row.second_points ?? row.second_place_points ?? 750),
        third_place_points: Number(row.third_points ?? row.third_place_points ?? 500),
        published: row.status === "publicado",
        cancelled: row.status === "cancelado",
      })) as ChampionshipPodiumRow[];
    },
  });
}

export function useScoringConfig() {
  return useQuery({
    queryKey: ["ranking-scoring-config"],
    queryFn: async (): Promise<ScoringConfigRow> => {
      const { data, error } = await (supabase as any)
        .from("ranking_scoring_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error || !data) return DEFAULT_SCORING_CONFIG;
      return {
        id: 1,
        first_place_points: Number(data.first_place_points ?? 1000),
        second_place_points: Number(data.second_place_points ?? 750),
        third_place_points: Number(data.third_place_points ?? 500),
        tiebreaker_rule: (data.tiebreaker_rule as TiebreakerRule) ?? "podium_counts",
        updated_at: data.updated_at ?? new Date().toISOString(),
      };
    },
  });
}

export function useSaveScoringConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      first_place_points: number;
      second_place_points: number;
      third_place_points: number;
      tiebreaker_rule: TiebreakerRule;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("ranking_scoring_config")
        .upsert({
          id: 1,
          first_place_points: payload.first_place_points,
          second_place_points: payload.second_place_points,
          third_place_points: payload.third_place_points,
          tiebreaker_rule: payload.tiebreaker_rule,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ranking-scoring-config"] });
      queryClient.invalidateQueries({ queryKey: ["modality-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["public-skater-profile"] });
    },
  });
}

export interface SaveChampionshipPodiumInput {
  id?: string;
  championship_name: string;
  event_date: string;
  modality: SkateModality;
  first_place_skater_id: string;
  second_place_skater_id: string;
  third_place_skater_id: string;
  first_place_points: number;
  second_place_points: number;
  third_place_points: number;
  notes?: string | null;
  published?: boolean;
  cancelled?: boolean;
}

export function useSaveChampionshipPodium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveChampionshipPodiumInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const status =
        input.cancelled === true || input.published === false ? "cancelado" : "publicado";

      const record = {
        championship_name: input.championship_name.trim(),
        event_date: input.event_date,
        modality: input.modality,
        first_place_skater_id: input.first_place_skater_id,
        second_place_skater_id: input.second_place_skater_id,
        third_place_skater_id: input.third_place_skater_id,
        first_points: input.first_place_points,
        second_points: input.second_place_points,
        third_points: input.third_place_points,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        status,
        updated_by: user?.id ?? null,
      };

      if (input.id) {
        const { data, error } = await (supabase as any)
          .from("championship_podiums")
          .update(record)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await (supabase as any)
          .from("championship_podiums")
          .insert({
            ...record,
            created_by: user?.id ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-podiums"] });
      queryClient.invalidateQueries({ queryKey: ["modality-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["public-skater-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-account-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["active-skaters"] });
    },
  });
}

export function useCancelChampionshipPodium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cancelled }: { id: string; cancelled: boolean }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("championship_podiums")
        .update({
          status: cancelled ? "cancelado" : "publicado",
          updated_by: user?.id ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["championship-podiums"] });
      queryClient.invalidateQueries({ queryKey: ["modality-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["public-skater-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-account-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["active-skaters"] });
    },
  });
}

export function useAdminManageSkaterProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      targetUserId: string;
      modality: SkateModality;
      isActive: boolean;
    }) => {
      const { data, error } = await (supabase as any).rpc("admin_manage_skater_profile", {
        _target_user_id: params.targetUserId,
        _modality: params.modality,
        _is_active: params.isActive,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modality-ranking"] });
      queryClient.invalidateQueries({ queryKey: ["active-skaters"] });
      queryClient.invalidateQueries({ queryKey: ["public-skater-profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-account-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["diretoria-all-members"] });
      queryClient.invalidateQueries({ queryKey: ["registered-users-diretoria"] });
    },
  });
}
