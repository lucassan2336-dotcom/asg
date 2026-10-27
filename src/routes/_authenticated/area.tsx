import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { useSession } from "@/lib/auth";
import { seo } from "@/lib/seo";
import { ApplicationStatusBadge } from "@/components/ApplicationStatus";

export const Route = createFileRoute("/_authenticated/area")({
  head: () =>
    seo("Área do associado", "Acompanhe sua associação, avisos internos e inscrições em eventos."),
  component: AreaPage,
});

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  ativa: "Ativa",
  suspensa: "Suspensa",
  encerrada: "Encerrada",
  inscrito: "Inscrito",
  cancelado: "Cancelado",
  presente: "Presente",
};

function StatusChip({ value }: { value: string }) {
  return (
    <span className="inline-block rounded-sm border-2 border-ink bg-olive px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-widest text-cream">
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

function AreaPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: application } = useQuery({
    queryKey: ["my-application", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("membership_applications")
        .select("id, status, created_at, reviewed_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: membership } = useQuery({
    queryKey: ["my-membership", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("association_memberships")
        .select("status, member_since")
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: announcements } = useQuery({
    queryKey: ["announcements-associados"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, published_at")
        .eq("audience", "associados")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: registrations } = useQuery({
    queryKey: ["my-registrations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("event_registrations")
        .select("id, status, events(title, starts_at, location)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const cleanName = fullName.trim().slice(0, 100);
    const cleanPhone = phone.trim().slice(0, 20);
    if (cleanName.length < 3) {
      toast.error("Informe seu nome completo (mínimo de 3 caracteres).");
      return;
    }
    if (
      cleanPhone &&
      (!/^[0-9+() .-]{8,20}$/.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 8)
    ) {
      toast.error("Informe um telefone válido com DDD ou deixe o campo em branco.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: cleanName,
        phone: cleanPhone || null,
      })
      .eq("id", userId);
    if (error) {
      toast.error("Não foi possível salvar o perfil.");
    } else {
      toast.success("Perfil atualizado.");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Área do associado"
        title={`Olá, ${(profile?.full_name || user?.email || "").split(" ")[0] || "skatista"}`}
      >
        Acompanhe sua associação, os avisos internos e suas inscrições.
      </PageHero>

      <Section className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl">Minha associação</h2>
          <div className="mt-4 space-y-3">
            {membership ? (
              <p className="flex items-center gap-3">
                Situação: <StatusChip value={membership.status} />
                <span className="text-sm text-muted-foreground">
                  desde{" "}
                  {new Date(membership.member_since + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
              </p>
            ) : application ? (
              <>
                <p className="flex items-center gap-3">
                  Solicitação: <ApplicationStatusBadge status={application.status} />
                </p>
                {application.status === "pendente" && (
                  <p className="text-sm text-muted-foreground">
                    A diretoria ainda está analisando seu pedido.
                  </p>
                )}
                {application.reviewed_at && (
                  <p className="text-sm text-muted-foreground">
                    Analisada em {new Date(application.reviewed_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
                {application.status === "rejeitada" && (
                  <p className="text-sm text-muted-foreground">
                    Seu pedido foi rejeitado. Entre em contato com a diretoria para solicitar
                    reanálise.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Você ainda não enviou uma solicitação de associação.
                </p>
                <Link to="/associe-se" className="btn-stamp inline-flex">
                  Solicitar associação
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl">Meu perfil</h2>
          <form className="mt-4 space-y-3" onSubmit={saveProfile}>
            <label className="block">
              <span className="eyebrow">Nome completo</span>
              <input
                required
                maxLength={100}
                className="field mt-1"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="eyebrow">Telefone</span>
              <input
                type="tel"
                maxLength={20}
                className="field mt-1"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <button className="btn-stamp">Salvar</button>
          </form>
        </Card>
      </Section>

      <Section className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-2xl">Avisos internos</h2>
          {announcements && announcements.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {announcements.map((a) => (
                <li key={a.id} className="border-b border-border pb-3 last:border-0">
                  <p className="font-condensed text-lg font-bold uppercase">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">Nenhum aviso no momento.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-2xl">Minhas inscrições</h2>
          {registrations && registrations.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {registrations.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-condensed text-lg font-bold uppercase">
                      {r.events?.title ?? "Evento"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.events?.starts_at
                        ? new Date(r.events.starts_at).toLocaleDateString("pt-BR")
                        : "Data a definir"}
                      {r.events?.location ? ` · ${r.events.location}` : ""}
                    </p>
                  </div>
                  <StatusChip value={r.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">
              Você ainda não se inscreveu em nenhum evento.
            </p>
          )}
        </Card>
      </Section>
    </>
  );
}
