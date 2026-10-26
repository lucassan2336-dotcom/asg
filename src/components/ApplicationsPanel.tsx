import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
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
  const { data: applications = [], isPending, error, refetch } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_applications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["application-notes", selected?.id], enabled: !!selected,
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase.from("membership_review_notes").select("id, note, author_id, created_at").eq("application_id", selected.id).order("created_at", { ascending: false });
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
  const person = (id: string | null) => people.find((p) => p.id === id)?.full_name || "Responsável registrado";
  function choose(application: Application, action: Decision["action"]) { setSelected(null); setNote(""); setDecision({ application, action }); }
  async function confirm() {
    if (!decision || busy) return;
    const cleanNote = note.trim();
    if (cleanNote.length > 500 || (decision.action === "reopen" && cleanNote.length < 3)) { toast.error("Informe uma justificativa de 3 a 500 caracteres."); return; }
    setBusy(true);
    try {
      const { error } = decision.action === "reopen"
        ? await supabase.rpc("reopen_application", { _application_id: decision.application.id, _reason: cleanNote })
        : await supabase.rpc("review_application", { _application_id: decision.application.id, _approve: decision.action === "approve", _notes: cleanNote || undefined });
      if (error) { toast.error("Não foi possível concluir. Atualize a lista e confira se o pedido já foi analisado."); return; }
      toast.success(decision.action === "reopen" ? "Solicitação reaberta para análise." : "Decisão registrada.");
      setDecision(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin-applications"] }),
        client.invalidateQueries({ queryKey: ["my-application"] }),
        client.invalidateQueries({ queryKey: ["my-membership"] }),
        client.invalidateQueries({ queryKey: ["application-notes"] }),
      ]);
    } catch { toast.error("Falha de conexão. Tente novamente."); }
    finally { setBusy(false); }
  }
  const visible = applications.filter((a) => filter === "todos" || a.status === filter);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-2xl">Solicitações ({applications.length})</h2>
      <label className="flex items-center gap-2 text-sm">Status
        <select className="field w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="todos">Todos</option><option value="pendente">Pendente</option><option value="aprovada">Aprovado</option><option value="rejeitada">Rejeitado</option></select>
      </label>
    </div>
    {isPending ? <p>Carregando solicitações…</p> : error ? <div role="alert">Não foi possível carregar a fila. <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div> : <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-ink"><tr><th className="p-3">Nome</th><th className="p-3">Data da solicitação</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr></thead>
        <tbody>{visible.map((a) => <tr key={a.id} className="border-b border-border">
          <td className="p-3 font-semibold">{a.full_name}</td><td className="whitespace-nowrap p-3">{new Date(a.created_at).toLocaleDateString("pt-BR")}</td><td className="p-3"><ApplicationStatusBadge status={a.status} /></td>
          <td className="p-3"><div className="flex gap-2">
            <Button size="icon" variant="outline" title="Abrir detalhes" aria-label={`Abrir detalhes de ${a.full_name}`} onClick={() => setSelected(a)}><Eye /></Button>
            {a.status === "pendente" && <><Button size="icon" variant="outline" title="Aprovar" aria-label={`Aprovar ${a.full_name}`} onClick={() => choose(a, "approve")}><Check /></Button><Button size="icon" variant="outline" title="Rejeitar" aria-label={`Rejeitar ${a.full_name}`} onClick={() => choose(a, "reject")}><X /></Button></>}
            {a.status === "rejeitada" && <Button size="icon" variant="outline" title="Reabrir análise" aria-label={`Reabrir análise de ${a.full_name}`} onClick={() => choose(a, "reopen")}><RotateCcw /></Button>}
          </div></td>
        </tr>)}</tbody>
      </table>
      {visible.length === 0 && <p className="py-8 text-center text-muted-foreground">Nenhuma solicitação {filter === "todos" ? "cadastrada" : "neste status"}.</p>}
    </div>}
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto"><DialogHeader><DialogTitle>Detalhes da solicitação</DialogTitle><DialogDescription>{selected?.full_name}</DialogDescription></DialogHeader>
        {selected && <><ApplicationStatusBadge status={selected.status} /><dl className="space-y-3 text-sm break-words">
          <div><dt className="font-semibold">E-mail</dt><dd>{selected.email ?? "Não registrado no pedido anterior"}</dd></div>
          <div><dt className="font-semibold">Telefone</dt><dd>{selected.phone || "Não informado"}</dd></div>
          <div><dt className="font-semibold">Nascimento</dt><dd>{new Date(`${selected.birth_date}T00:00:00`).toLocaleDateString("pt-BR")}</dd></div>
          <div><dt className="font-semibold">Solicitada em</dt><dd>{new Date(selected.created_at).toLocaleDateString("pt-BR")}</dd></div>
          <div><dt className="font-semibold">Motivação</dt><dd className="whitespace-pre-wrap">{selected.motivation || "Não informada"}</dd></div>
          {selected.reviewed_at && <div><dt className="font-semibold">Decisão</dt><dd>{person(selected.reviewed_by)} · {new Date(selected.reviewed_at).toLocaleString("pt-BR")}</dd></div>}
        </dl><h3 className="text-lg">Histórico interno</h3>
        {notes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma observação interna.</p> : <ul className="space-y-3">{notes.map((n) => <li key={n.id} className="border-b border-border pb-3 text-sm"><p className="whitespace-pre-wrap break-words">{n.note}</p><p className="mt-1 text-xs text-muted-foreground">{person(n.author_id)} · {new Date(n.created_at).toLocaleString("pt-BR")}</p></li>)}</ul>}
        {selected.status === "pendente" && <div className="flex gap-2"><Button onClick={() => choose(selected, "approve")}><Check />Aprovar</Button><Button variant="destructive" onClick={() => choose(selected, "reject")}><X />Rejeitar</Button></div>}
        </>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!decision} onOpenChange={(open) => { if (!open && !busy) setDecision(null); }}>
      <AlertDialogContent className="w-[calc(100%-2rem)]"><AlertDialogHeader><AlertDialogTitle>{decision?.action === "approve" ? "Confirmar aprovação" : decision?.action === "reject" ? "Confirmar rejeição" : "Reabrir solicitação"}</AlertDialogTitle><AlertDialogDescription>
        {decision?.application.full_name}. {decision?.action === "approve" ? "A pessoa terá acesso como associado, sem acesso à diretoria." : decision?.action === "reject" ? "O pedido será rejeitado e o histórico será preservado." : "O pedido voltará para Pendente, mantendo o histórico da decisão anterior."}
      </AlertDialogDescription></AlertDialogHeader>
      <label className="block text-sm font-semibold">{decision?.action === "reopen" ? "Justificativa obrigatória (interna)" : "Observação interna (opcional)"}<textarea className="field mt-2" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button disabled={busy || (decision?.action === "reopen" && note.trim().length < 3)} onClick={confirm}>{busy ? "Registrando…" : "Confirmar decisão"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}