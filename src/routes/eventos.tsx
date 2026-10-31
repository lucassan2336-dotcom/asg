import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, MapPin, Edit3, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useSiteEvents,
  useDeleteSiteEvent,
  type GenericPageContent,
  type EventItem,
} from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { EventModal } from "@/components/CmsModals";

export const Route = createFileRoute("/eventos")({
  head: () =>
    seo(
      "Eventos e campeonatos",
      "Agenda de sessões, eventos e campeonatos da A.S.G. em Guararema.",
    ),
  component: EventosPage,
});

function EventosPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("eventos");
  const { data: events, isLoading } = useSiteEvents();
  const deleteMutation = useDeleteSiteEvent();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const hero = content?.hero;
  const list = isDiretoria ? events || [] : (events || []).filter((e) => e.published);

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setModalOpen(true);
  };

  const handleEditEvent = (item: EventItem) => {
    setSelectedEvent(item);
    setModalOpen(true);
  };

  const handleDeleteEvent = async (item: EventItem) => {
    if (confirm(`Deseja realmente excluir o evento "${item.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast.success("Evento excluído com sucesso.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível excluir o evento.");
      }
    }
  };

  return (
    <>
      <EditablePageToolbar
        pageSlug="eventos"
        pageName="Eventos e Campeonatos"
        addItemLabel="Novo Evento"
        onAddItem={handleNewEvent}
      />

      <PageHero eyebrow={hero?.eyebrow || "Agenda"} title={hero?.title || "Eventos e campeonatos"}>
        {hero?.description || "Agenda de sessões, eventos e campeonatos da A.S.G. em Guararema."}
      </PageHero>

      <Section>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando eventos…</p>
        ) : list.length === 0 ? (
          <Card className="text-center py-12 space-y-3">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="text-xl font-display uppercase tracking-wide">Sem eventos no momento</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Fique atento aos nossos canais e redes sociais. Novas sessões e campeonatos serão
              publicados em breve!
            </p>
            {isDiretoria && (
              <button
                type="button"
                onClick={handleNewEvent}
                className="btn-stamp text-xs inline-flex mt-2"
              >
                Novo Evento
              </button>
            )}
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {list.map((ev) => {
              const dateObj = ev.starts_at ? new Date(ev.starts_at) : null;
              const day = dateObj ? String(dateObj.getDate()).padStart(2, "0") : "--";
              const month = dateObj
                ? dateObj.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()
                : "MÊS";
              const timeStr = dateObj
                ? dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : null;

              return (
                <Card key={ev.id} className="flex gap-5">
                  <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded border-2 border-ink bg-olive text-cream self-start">
                    <span className="font-display text-3xl">{day}</span>
                    <span className="eyebrow text-[0.65rem]">{month}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {timeStr ? `${timeStr}h` : "Horário a definir"}
                      </span>
                      {isDiretoria && (
                        <div className="flex items-center gap-2">
                          {!ev.published && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-muted-foreground">
                              Rascunho
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditEvent(ev)}
                            className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-semibold hover:bg-accent hover:text-accent-foreground"
                            title="Editar evento"
                          >
                            <Edit3 className="h-3 w-3" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(ev)}
                            className="flex items-center gap-1 rounded bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-semibold hover:bg-destructive hover:text-destructive-foreground transition-colors"
                            title="Excluir evento"
                          >
                            <Trash2 className="h-3 w-3" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="mt-1 text-2xl font-bold">{ev.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {ev.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-accent" />
                          {ev.location}
                        </span>
                      )}
                      {ev.registration_open && (
                        <span className="flex items-center gap-1 font-semibold text-accent">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Inscrições Abertas
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {modalOpen && <EventModal event={selectedEvent} onClose={() => setModalOpen(false)} />}
    </>
  );
}
