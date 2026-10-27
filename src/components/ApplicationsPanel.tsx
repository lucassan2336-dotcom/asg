import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Check, X, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ApplicationStatusBadge } from "@/components/ApplicationStatus";
import type { Database } from "@/integrations/supabase/types";

type Application = Database["public"]["Tables"]["membership_applications"]["Row"];
type Decision = { application: Application; action: "approve" | "reject" | "reopen" };

export function ApplicationsPanel() {
  const client = useQueryClient();
  const [selected, setSelected] = useState<Application | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("todos");

  const {
    data: applications = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["application-notes", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase
        .from("membership_review_notes")
        .select("id, note, author_id, created_at")
        .eq("application_id", selected.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["admin-profile-names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const person = (id: string | null) =>
    people.find((p) => p.id === id)?.full_name || "Membro da Diretoria";

  function choose(application: Application, action: Decision["action"]) {
    setSelected(null);
    setNote("");
    setDecision({ application, action });
  }

  async function confirm() {
    if (!decision || busy) return;
    const cleanNote = note.trim();
    if (cleanNote.length > 500) {
      toast.error("A observação interna deve ter no máximo 500 caracteres.");
      return;
    }
    if (decision.action === "reopen" && cleanNote.length < 3) {
      toast.error("Informe uma justificativa de no mínimo 3 caracteres para a reabertura.");
      return;
    }

    setBusy(true);
    try {
      const { error } =
        decision.action === "reopen"
          ? await supabase.rpc("reopen_application", {
              _application_id: decision.application.id,
              _reason: cleanNote,
            })
          : await supabase.rpc("review_application", {
              _application_id: decision.application.id,
              _approve: decision.action === "approve",
              ...(cleanNote ? { _notes: cleanNote } : {}),
            });

      if (error) {
        const msg = error.message || "";
        const safeMsg = msg.includes("já foi analisada")
          ? "Esta solicitação já foi analisada anteriormente."
          : msg.includes("permissão") || error.code === "42501"
            ? "Apenas a diretoria autorizada pode executar esta ação."
            : "Verifique se a solicitação continua pendente e tente novamente.";
        toast.error("Não foi possível registrar a decisão. " + safeMsg);
        return;
      }

      toast.success(
        decision.action === "approve"
          ? `Solicitação de ${decision.application.full_name} aprovada com sucesso.`
          : decision.action === "reject"
            ? `Solicitação de ${decision.application.full_name} rejeitada. Histórico preservado.`
            : `Solicitação de ${decision.application.full_name} reaberta para reanálise.`,
      );
      setDecision(null);

      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-applications"] }),
        client.invalidateQueries({ queryKey: ["my-application"] }),
        client.invalidateQueries({ queryKey: ["my-membership"] }),
        client.invalidateQueries({ queryKey: ["application-notes"] }),
      ]);
    } catch {
      toast.error("Falha de conexão com o servidor. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const visible = applications.filter((a) => filter === "todos" || a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Fila Privada de Solicitações ({applications.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acesso exclusivo da diretoria para homologação de novos associados.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span>Filtrar status:</span>
          <select
            className="field w-auto py-1"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovado</option>
            <option value="rejeitada">Rejeitado</option>
          </select>
        </label>
      </div>

      {isPending ? (
        <p className="py-8 text-center text-muted-foreground">Carregando fila de solicitações…</p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-center space-y-2"
        >
          <p className="text-destructive font-semibold">
            Não foi possível carregar a lista de solicitações.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-ink bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b-2 border-ink bg-muted/40">
              <tr>
                <th className="p-3 font-bold text-foreground">Nome</th>
                <th className="p-3 font-bold text-foreground">Data da solicitação</th>
                <th className="p-3 font-bold text-foreground">Status</th>
                <th className="p-3 font-bold text-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/80 transition-colors hover:bg-muted/20"
                >
                  <td className="p-3 font-semibold text-foreground">{a.full_name}</td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="p-3">
                    <ApplicationStatusBadge status={a.status} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Abrir detalhes"
                        aria-label={`Abrir detalhes de ${a.full_name}`}
                        onClick={() => setSelected(a)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                      {a.status === "pendente" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300"
                            title="Aprovar solicitação"
                            aria-label={`Aprovar ${a.full_name}`}
                            onClick={() => choose(a, "approve")}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            title="Rejeitar solicitação"
                            aria-label={`Rejeitar ${a.full_name}`}
                            onClick={() => choose(a, "reject")}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                      {a.status === "rejeitada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Reabrir análise (caso excepcional)"
                          aria-label={`Reabrir análise de ${a.full_name}`}
                          onClick={() => choose(a, "reopen")}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma solicitação {filter === "todos" ? "cadastrada" : "neste status"}.
            </p>
          )}
        </div>
      )}

      {/* Modal de Detalhes da Solicitação */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes da solicitação</DialogTitle>
            <DialogDescription>{selected?.full_name}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Situação:
                </span>
                <ApplicationStatusBadge status={selected.status} />
              </div>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    E-mail verificado
                  </dt>
                  <dd className="font-medium text-foreground">
                    {selected.email ?? "Não registrado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Telefone
                  </dt>
                  <dd className="font-medium text-foreground">
                    {selected.phone || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Data de nascimento
                  </dt>
                  <dd className="font-medium text-foreground">
                    {new Date(`${selected.birth_date}T00:00:00`).toLocaleDateString("pt-BR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Data da solicitação
                  </dt>
                  <dd className="font-medium text-foreground">
                    {new Date(selected.created_at).toLocaleString("pt-BR")}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Motivação informada
                  </dt>
                  <dd className="mt-1 rounded-md border border-border bg-muted/30 p-2.5 text-foreground whitespace-pre-wrap">
                    {selected.motivation || "Nenhuma motivação informada."}
                  </dd>
                </div>
                {selected.reviewed_at && (
                  <div className="sm:col-span-2 rounded-md border border-border bg-card p-3">
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Deliberação registrada
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      Decidido por <strong>{person(selected.reviewed_by)}</strong> em{" "}
                      <strong>{new Date(selected.reviewed_at).toLocaleString("pt-BR")}</strong>.
                    </dd>
                  </div>
                )}
              </dl>

              {/* Histórico interno confidencial */}
              <div className="border-t border-border pt-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2">
                  Observações Internas da Diretoria
                </h3>
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma anotação interna registrada para este pedido.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {notes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-md border border-border bg-muted/40 p-2.5 text-xs"
                      >
                        <p className="text-foreground whitespace-pre-wrap">{n.note}</p>
                        <p className="mt-1 text-muted-foreground text-[11px]">
                          Registrado por {person(n.author_id)} em{" "}
                          {new Date(n.created_at).toLocaleString("pt-BR")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selected.status === "pendente" && (
                <div className="flex gap-2 justify-end pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => choose(selected, "reject")}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Rejeitar solicitação
                  </Button>
                  <Button
                    className="bg-emerald-700 text-white hover:bg-emerald-800"
                    onClick={() => choose(selected, "approve")}
                  >
                    <Check className="mr-1.5 h-4 w-4" />
                    Aprovar associação
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação com exigência de confirmação antes de aprovar/rejeitar */}
      <AlertDialog
        open={!!decision}
        onOpenChange={(open) => {
          if (!open && !busy) setDecision(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              {decision?.action === "approve" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <AlertDialogTitle>
                {decision?.action === "approve"
                  ? "Confirmar aprovação de associação"
                  : decision?.action === "reject"
                    ? "Confirmar rejeição de solicitação"
                    : "Confirmar reabertura de solicitação"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-foreground/80 pt-1">
              {decision?.application.full_name} ({decision?.application.email ?? "e-mail vinculado"}
              ).{" "}
              {decision?.action === "approve"
                ? "A aprovação concederá exclusivamente a condição de associado no sistema. A função de diretoria NUNCA é concedida por este fluxo."
                : decision?.action === "reject"
                  ? "A solicitação será rejeitada. Todo o histórico permanecerá registrado para fins de auditoria interna."
                  : "A solicitação retornará ao status Pendente, mantendo o histórico da decisão anterior para fins de auditoria."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="block text-sm space-y-1.5">
            <span className="font-semibold text-foreground">
              {decision?.action === "reopen"
                ? "Justificativa da reanálise (obrigatória - interna)"
                : "Observação interna da diretoria (opcional)"}
            </span>
            <textarea
              className="field mt-1"
              rows={3}
              maxLength={500}
              placeholder={
                decision?.action === "reopen"
                  ? "Explique o motivo administrativo para a reabertura do pedido..."
                  : "Insira anotações confidenciais sobre a deliberação (visíveis apenas para a diretoria)..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <span className="text-[11px] text-muted-foreground block text-right">
              {note.length}/500 caracteres
            </span>
          </label>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button
              disabled={busy || (decision?.action === "reopen" && note.trim().length < 3)}
              className={
                decision?.action === "approve"
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : decision?.action === "reject"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "btn-stamp"
              }
              onClick={confirm}
            >
              {busy ? "Registrando…" : "Confirmar decisão"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
