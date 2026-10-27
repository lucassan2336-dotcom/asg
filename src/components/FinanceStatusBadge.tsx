import { Clock, CheckCircle2, AlertCircle, XCircle, CalendarClock } from "lucide-react";
import { TRANSACTION_STATUSES, type TransactionStatus } from "@/lib/finance";

export function FinanceStatusBadge({ status }: { status: TransactionStatus }) {
  const meta = TRANSACTION_STATUSES.find((s) => s.id === status) ?? {
    id: status,
    label: status,
    badgeClass: "border-border bg-muted text-muted-foreground",
  };

  const Icon =
    status === "recebido" || status === "pago"
      ? CheckCircle2
      : status === "pendente"
        ? AlertCircle
        : status === "previsto"
          ? CalendarClock
          : status === "cancelado"
            ? XCircle
            : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${meta.badgeClass}`}
    >
      <Icon size={13} className="shrink-0" />
      {meta.label}
    </span>
  );
}
