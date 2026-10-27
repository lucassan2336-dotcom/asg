import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { applicationLabels, type ApplicationStatus } from "@/lib/membership";

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const Icon = status === "pendente" ? Clock : status === "aprovada" ? CheckCircle2 : XCircle;
  const config = {
    pendente: {
      className: "border-amber-400/80 bg-amber-500/15 text-amber-700 dark:text-amber-300",
      label: applicationLabels.pendente,
    },
    aprovada: {
      className: "border-emerald-500/80 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      label: applicationLabels.aprovada,
    },
    rejeitada: {
      className: "border-red-500/80 bg-red-500/15 text-red-700 dark:text-red-300",
      label: applicationLabels.rejeitada,
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${config.className}`}
    >
      <Icon size={14} className="shrink-0" />
      {config.label}
    </span>
  );
}
