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

const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
] as const;
const ALLOWED_AVATAR_EXT_RE = /\.(jpe?g|png|webp|heic|heif|avif)$/i;
const MAX_AVATAR_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_RAW_AVATAR_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB antes da compressão automática

export function validateAvatarFile(file: File): string | null {
  const mimeOk = ALLOWED_AVATAR_MIME_TYPES.includes(
    file.type.toLowerCase() as (typeof ALLOWED_AVATAR_MIME_TYPES)[number],
  );
  const extOk = !file.type && Boolean(file.name && ALLOWED_AVATAR_EXT_RE.test(file.name));
  if (!mimeOk && !extOk) {
    return "Formato de imagem inválido. Envie JPG, PNG ou WEBP.";
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
    return "A imagem deve ter no máximo 3 MB.";
  }
  return null;
}

async function createResizedDataUrl(file: File, maxDim = 400): Promise<string> {
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
        const webpUrl = canvas.toDataURL("image/webp", 0.86);
        if (webpUrl.startsWith("data:image/webp")) {
          resolve(webpUrl);
        } else {
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string; ext: string } {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header?.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64$/);
  const contentType = mimeMatch?.[1] ?? "image/jpeg";
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const binary = atob(base64Data ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    blob: new Blob([bytes], { type: contentType }),
    contentType,
    ext,
  };
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const mimeOk = ALLOWED_AVATAR_MIME_TYPES.includes(
    file.type.toLowerCase() as (typeof ALLOWED_AVATAR_MIME_TYPES)[number],
  );
  const extOk = !file.type && Boolean(file.name && ALLOWED_AVATAR_EXT_RE.test(file.name));
  if (!mimeOk && !extOk) {
    throw new Error("Formato de imagem inválido. Envie JPG, PNG ou WEBP.");
  }
  if (file.size <= 0 || file.size > MAX_RAW_AVATAR_SIZE_BYTES) {
    throw new Error("A imagem deve ter no máximo 3 MB.");
  }

  let uploadBody: File | Blob = file;
  let contentType =
    file.type === "image/png"
      ? "image/png"
      : file.type === "image/webp"
        ? "image/webp"
        : "image/jpeg";
  let ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  let resizedDataUrl: string | null = null;

  const needsNormalization =
    file.size > 1.5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase());

  if (typeof document !== "undefined") {
    try {
      resizedDataUrl = await createResizedDataUrl(file, 640);
      if (needsNormalization && resizedDataUrl) {
        const converted = dataUrlToBlob(resizedDataUrl);
        uploadBody = converted.blob;
        contentType = converted.contentType;
        ext = converted.ext;
      }
    } catch {
      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        throw new Error("A imagem deve ter no máximo 3 MB.");
      }
    }
  } else if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error("A imagem deve ter no máximo 3 MB.");
  }

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

  if (resizedDataUrl) {
    return resizedDataUrl;
  }
  return createResizedDataUrl(file, 400);
}

export async function persistProfileAvatar(params: {
  userId: string;
  avatarUrl: string;
  fullName: string;
  accountType: AccountKind;
  modality?: SkateModality;
}): Promise<string> {
  const { userId, avatarUrl, fullName, accountType, modality } = params;
  let savedInDb = false;

  // 1. Tenta RPC transacional save_my_avatar (atualiza profiles, skater_profiles, associate_profiles e auth.users)
  const { error: rpcError } = await (supabase as any).rpc("save_my_avatar", {
    _avatar_url: avatarUrl,
  });
  if (!rpcError) {
    savedInDb = true;
  }

  // 2. Garante persistência nas tabelas de perfil sem sobrescrever account_type existente em UPDATE
  const { data: existingBase } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingBase) {
    const { error: updErr } = await (supabase as any)
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);
    if (!updErr) savedInDb = true;
  } else {
    const { error: insErr } = await (supabase as any).from("profiles").insert({
      id: userId,
      full_name: fullName,
      account_type: accountType,
      avatar_url: avatarUrl,
    });
    if (!insErr) savedInDb = true;
  }

  if (accountType === "skatista") {
    const { data: existingSkater } = await (supabase as any)
      .from("skater_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingSkater) {
      const { error: skErr } = await (supabase as any)
        .from("skater_profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", userId);
      if (!skErr) savedInDb = true;
    } else {
      const validMod: SkateModality =
        modality === "vert" || modality === "versatil" || modality === "escolher_depois"
          ? modality
          : "street";
      const { error: skInsErr } = await (supabase as any).from("skater_profiles").insert({
        user_id: userId,
        full_name: fullName,
        avatar_url: avatarUrl,
        modality: validMod,
      });
      if (!skInsErr) savedInDb = true;
    }
  } else {
    const { error: assocErr } = await (supabase as any)
      .from("associate_profiles")
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "user_id" },
      );
    if (!assocErr) savedInDb = true;
  }

  // 3. Sincroniza também nos metadados da sessão do Supabase Auth
  const { error: authErr } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });
  if (!authErr) {
    savedInDb = true;
  }

  if (!savedInDb) {
    throw new Error("Não foi possível gravar a foto de perfil no banco de dados.");
  }

  return avatarUrl;
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

      if (!rpcError && Array.isArray(rpcData)) {
        return rpcData.map((r: any) => ({
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
      }

      const { data: skaters, error } = await (supabase as any)
        .from("skater_profiles")
        .select("*")
        .or(`modality.eq.${modality},modality.eq.versatil`)
        .eq("is_active", true);

      if (error || !skaters) return [];
      return computeModalityRanking(skaters as SkaterProfileRow[], modality);
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [
        { data: baseProfile },
        { data: skaterProfile },
        { data: associateProfile },
        { data: authUserRes },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        (supabase as any)
          .from("skater_profiles")
          .select("*")
          .eq("user_id", userId!)
          .maybeSingle(),
        (supabase as any)
          .from("associate_profiles")
          .select("*")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      const metaAvatar =
        typeof authUserRes?.user?.user_metadata?.["avatar_url"] === "string"
          ? authUserRes.user.user_metadata["avatar_url"]
          : null;

      const resolvedAvatar =
        (skaterProfile as SkaterProfileRow | null)?.avatar_url ||
        (associateProfile as AssociateProfileRow | null)?.avatar_url ||
        (baseProfile as any)?.avatar_url ||
        metaAvatar ||
        null;

      return {
        baseProfile: baseProfile
          ? ({ ...(baseProfile as any), avatar_url: (baseProfile as any).avatar_url ?? resolvedAvatar } as any)
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
