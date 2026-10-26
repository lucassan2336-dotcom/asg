import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { applicationLabels, type ApplicationStatus } from "@/lib/membership";

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const Icon = status === "pendente" ? Clock : status === "aprovada" ? CheckCircle2 : XCircle;
  const color = status === "pendente" ? "bg-muted text-foreground" : status === "aprovada" ? "bg-secondary text-secondary-foreground" : "bg-destructive text-destructive-foreground";
  return <span className={`inline-flex items-center gap-2 rounded-sm border border-border px-2 py-1 text-sm font-semibold ${color}`}><Icon size={16} />{applicationLabels[status]}</span>;
}