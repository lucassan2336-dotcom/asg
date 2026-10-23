import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { useMyRoles, useSession } from "@/lib/auth";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/diretoria")({
  head: () => seo("Painel da diretoria", "Análise de solicitações, avisos e eventos da A.S.G."),
  component: DiretoriaPage,
});

type Tab = "solicitacoes" | "avisos" | "eventos";

const TABS: { id: Tab; label: string }[] = [
  { id: "solicitacoes", label: "Solicitações" },
  { id: "avisos", label: "Avisos" },
  { id: "eventos", label: "Eventos" },
];

function DiretoriaPage() {
  const { user } = useSession();
  const { roles, loading } = useMyRoles(user?.id);
  const [tab, setTab] = useState<Tab>("solicitacoes");

  if (loading) {
    return (
      <Section>
        <p className="text-muted-foreground">Verificando permissões…</p>
      </Section>
    );
  }

  if (!roles.includes("diretoria")) {
    return (
      <>
        <PageHero eyebrow="Restrito" title="Painel da diretoria">
          Esta área é exclusiva da diretoria da A.S.G.
        </PageHero>
        <Section>
          <Card>
            <p className="text-muted-foreground">Sua conta não tem acesso a este painel.</p>
          </Card>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHero eyebrow="Gestão" title="Painel da diretoria">
        Analise solicitações de associação e gerencie avisos e eventos.
      </PageHero>
      <Section>
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={tab === t.id ? "btn-stamp" : "btn-ghost-stamp"}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "solicitacoes" && <ApplicationsPanel />}
        {tab === "avisos" && <AnnouncementsPanel />}
        {tab === "eventos" && <EventsPanel />}
      </Section>
    </>
  );
}

function ApplicationsPanel() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: applications } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("membership_applications")
        .select("id, full_name, phone, birth_date, motivation, status, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function review(id: string, approve: boolean) {
    setBusyId(id);
    const { error } = await supabase.rpc("review_application", {
      _application_id: id,
      _approve: approve,
      _notes: (notes[id] ?? "").slice(0, 500),
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(approve ? "Solicitação aprovada." : "Solicitação rejeitada.");
      queryClient.invalidateQueries({ queryKey: ["admin-applications"] });
    }
  }

  const pending = (applications ?? []).filter((a) => a.status === "pendente");
  const reviewed = (applications ?? []).filter((a) => a.status !== "pendente");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl">Pendentes ({pending.length})</h2>
        {pending.length === 0 && <p className="mt-3 text-muted-foreground">Nenhuma solicitação aguardando análise.</p>}
        <div className="mt-4 grid gap-4">
          {pending.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-condensed text-xl font-bold uppercase">{a.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Nascimento: {new Date(a.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    {a.phone ? ` · ${a.phone}` : ""} · Enviada em {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {a.motivation && <p className="mt-2 text-sm">{a.motivation}</p>}
                </div>
              </div>
              <textarea
                maxLength={500}
                rows={2}
                placeholder="Observação (opcional, visível ao solicitante se rejeitada)"
                className="field mt-3"
                value={notes[a.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
              />
              <div className="mt-3 flex gap-2">
                <button disabled={busyId === a.id} onClick={() => review(a.id, true)} className="btn-stamp">
                  Aprovar
                </button>
                <button disabled={busyId === a.id} onClick={() => review(a.id, false)} className="btn-ghost-stamp">
                  Rejeitar
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {reviewed.length > 0 && (
        <div>
          <h2 className="text-2xl">Já analisadas</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {reviewed.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 border-b border-border pb-2">
                <span>{a.full_name}</span>
                <span className="font-condensed font-bold uppercase text-muted-foreground">
                  {a.status === "aprovada" ? "Aprovada" : "Rejeitada"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AnnouncementsPanel() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"associados" | "publico">("associados");
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, audience, published, published_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim().slice(0, 200),
      body: body.trim(),
      audience,
      published,
      published_at: published ? new Date().toISOString() : null,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar o aviso.");
    } else {
      toast.success("Aviso salvo.");
      setTitle("");
      setBody("");
      setPublished(false);
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <h2 className="text-2xl">Novo aviso</h2>
        <form className="mt-4 space-y-3" onSubmit={create}>
          <label className="block">
            <span className="eyebrow">Título</span>
            <input required maxLength={200} className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="eyebrow">Texto</span>
            <textarea required maxLength={2000} rows={4} className="field mt-1" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <label className="block">
            <span className="eyebrow">Público</span>
            <select className="field mt-1" value={audience} onChange={(e) => setAudience(e.target.value as "associados" | "publico")}>
              <option value="associados">Associados</option>
              <option value="publico">Público</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Publicar imediatamente
          </label>
          <button disabled={busy} className="btn-stamp disabled:opacity-60">Salvar aviso</button>
        </form>
      </Card>
      <Card>
        <h2 className="text-2xl">Avisos cadastrados</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(items ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <span>{a.title}</span>
              <span className="font-condensed font-bold uppercase text-muted-foreground">
                {a.published ? "Publicado" : "Rascunho"} · {a.audience === "publico" ? "Público" : "Associados"}
              </span>
            </li>
          ))}
          {(items ?? []).length === 0 && <p className="text-muted-foreground">Nenhum aviso cadastrado.</p>}
        </ul>
      </Card>
    </div>
  );
}

function EventsPanel() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, title, starts_at, location, published, registration_open")
        .order("starts_at", { ascending: false, nullsFirst: false });
      return data ?? [];
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      title: title.trim().slice(0, 200),
      description: description.trim(),
      location: location.trim().slice(0, 200) || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      registration_open: registrationOpen,
      published,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar o evento.");
    } else {
      toast.success("Evento salvo.");
      setTitle("");
      setDescription("");
      setLocation("");
      setStartsAt("");
      setRegistrationOpen(false);
      setPublished(false);
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <h2 className="text-2xl">Novo evento</h2>
        <form className="mt-4 space-y-3" onSubmit={create}>
          <label className="block">
            <span className="eyebrow">Título</span>
            <input required maxLength={200} className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="eyebrow">Descrição</span>
            <textarea maxLength={2000} rows={3} className="field mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="block">
            <span className="eyebrow">Local</span>
            <input maxLength={200} className="field mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="block">
            <span className="eyebrow">Data e hora</span>
            <input type="datetime-local" className="field mt-1" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={registrationOpen} onChange={(e) => setRegistrationOpen(e.target.checked)} />
            Inscrições abertas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Publicar imediatamente
          </label>
          <button disabled={busy} className="btn-stamp disabled:opacity-60">Salvar evento</button>
        </form>
      </Card>
      <Card>
        <h2 className="text-2xl">Eventos cadastrados</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(items ?? []).map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-3 border-b border-border pb-2">
              <span>
                {ev.title}
                {ev.starts_at && (
                  <span className="text-muted-foreground"> · {new Date(ev.starts_at).toLocaleDateString("pt-BR")}</span>
                )}
              </span>
              <span className="font-condensed font-bold uppercase text-muted-foreground">
                {ev.published ? "Publicado" : "Rascunho"}
              </span>
            </li>
          ))}
          {(items ?? []).length === 0 && <p className="text-muted-foreground">Nenhum evento cadastrado.</p>}
        </ul>
      </Card>
    </div>
  );
}
