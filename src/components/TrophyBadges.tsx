import { Trophy, Medal, Flame, Shield, Footprints, Sparkles, Clock } from "lucide-react";
import type { SkateModality, SkateStance, TrophyTier } from "@/lib/ranking";

export function RankingTrophyBadge({
  tier,
  size = "md",
}: {
  tier: TrophyTier | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  if (!tier) return null;

  const config = {
    ouro: {
      label: "Troféu de Ouro • 1º no Ranking",
      shortLabel: "Ouro • 1º",
      bg: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-ink border-ink",
      iconClass: "text-ink fill-amber-900/20",
    },
    prata: {
      label: "Troféu de Prata • 2º no Ranking",
      shortLabel: "Prata • 2º",
      bg: "bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-ink border-ink",
      iconClass: "text-ink fill-slate-700/20",
    },
    bronze: {
      label: "Troféu de Bronze • 3º no Ranking",
      shortLabel: "Bronze • 3º",
      bg: "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-cream border-ink",
      iconClass: "text-cream fill-cream/20",
    },
  }[tier];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
    lg: "px-4 py-1.5 text-sm gap-2",
  }[size];

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  return (
    <span
      title={config.label}
      className={`inline-flex items-center rounded-sm border-2 font-condensed font-bold uppercase tracking-wider shadow-stamp ${config.bg} ${sizeClasses}`}
    >
      <Trophy className={iconSizes + " " + config.iconClass} />
      <span>{size === "sm" ? config.shortLabel : config.label}</span>
    </span>
  );
}

export function ChampionshipMedalBadge({
  placement,
  size = "md",
}: {
  placement: 1 | 2 | 3 | number;
  size?: "sm" | "md";
}) {
  const styles =
    placement === 1
      ? {
          label: "1º Lugar • Medalha de Ouro",
          short: "1º Lugar",
          cls: "border-amber-600 bg-amber-100 text-amber-950",
          icon: "text-amber-600 fill-amber-400",
        }
      : placement === 2
        ? {
            label: "2º Lugar • Medalha de Prata",
            short: "2º Lugar",
            cls: "border-slate-500 bg-slate-100 text-slate-900",
            icon: "text-slate-500 fill-slate-300",
          }
        : {
            label: "3º Lugar • Medalha de Bronze",
            short: "3º Lugar",
            cls: "border-orange-800 bg-orange-100 text-orange-950",
            icon: "text-orange-800 fill-orange-400",
          };

  return (
    <span
      title={styles.label}
      className={`inline-flex items-center gap-1 rounded-full border-2 font-condensed font-bold uppercase tracking-wider ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"
      } ${styles.cls}`}
    >
      <Medal className={size === "sm" ? `h-3 w-3 ${styles.icon}` : `h-3.5 w-3.5 ${styles.icon}`} />
      <span>{size === "sm" ? styles.short : styles.label}</span>
    </span>
  );
}

export function ModalityBadge({
  modality,
  size = "md",
}: {
  modality: SkateModality;
  size?: "sm" | "md";
}) {
  let label = "Street";
  let bg = "bg-olive text-cream";
  let Icon = Flame;

  if (modality === "vert") {
    label = "Vert";
    bg = "bg-olive text-cream";
    Icon = Shield;
  } else if (modality === "versatil") {
    label = "Versátil (Street + Vert)";
    bg = "bg-amber-600 text-cream";
    Icon = Sparkles;
  } else if (modality === "escolher_depois") {
    label = "Em Aberto";
    bg = "bg-muted text-foreground border-dashed";
    Icon = Clock;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border-2 border-ink font-condensed font-bold uppercase tracking-widest ${bg} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function StanceBadge({
  stance,
  size = "md",
}: {
  stance: SkateStance | null | undefined;
  size?: "sm" | "md";
}) {
  if (!stance) return null;
  const label = stance === "goofy" ? "Goofy" : "Regular";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border-2 border-ink bg-secondary font-condensed font-bold uppercase tracking-widest text-ink ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Footprints className="h-3.5 w-3.5 text-rust" />
      Base: {label}
    </span>
  );
}

export function SkaterAvatar({
  name,
  avatarUrl,
  size = "md",
  trophyTier,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  trophyTier?: TrophyTier | null;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "SK";

  const dims = {
    sm: "h-10 w-10 text-sm",
    md: "h-14 w-14 text-lg",
    lg: "h-20 w-20 text-2xl",
    xl: "h-28 w-28 text-3xl",
  }[size];

  const ringClass =
    trophyTier === "ouro"
      ? "ring-4 ring-amber-400"
      : trophyTier === "prata"
        ? "ring-4 ring-slate-300"
        : trophyTier === "bronze"
          ? "ring-4 ring-amber-700"
          : "";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-secondary font-display text-ink shadow-stamp ${dims} ${ringClass}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Foto de ${name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
