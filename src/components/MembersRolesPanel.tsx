import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Users,
  UserCheck,
  Search,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { Card } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";
import { useAdminManageSkaterProfile, type SkateModality } from "@/lib/ranking";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface RegisteredUserItem {
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
  is_associado: boolean;
  is_diretoria: boolean;
  membership_status: string | null;
  member_since: string | null;
}

type RoleChangeAction = {
  targetUser: RegisteredUserItem;
  role: AppRole;
  grant: boolean;
};

export async function updateUserRole(
  targetUserId: string,
  role: AppRole,
  grant: boolean,
  notes?: string,
) {
  const { error: rpcError } = await supabase.rpc("set_user_role_by_diretoria", {
    _target_user_id: targetUserId,
    _role: role,
    _grant: grant,
    _notes: notes || undefined,
  });

  if (!rpcError) return;

  // Fallback caso a função RPC ainda não tenha sido aplicada no banco remoto
  const isMissingRpc =
    rpcError.code === "PGRST202" ||
    rpcError.code === "42883" ||
    rpcError.message?.includes("Could not find the function");

  if (!isMissingRpc) {
    throw rpcError;
  }

  if (grant) {
    const { error: insertErr } = await supabase
      .from("user_roles")
      .insert({ user_id: targetUserId, role });
    if (insertErr && insertErr.code !== "23505") throw insertErr;

    if (role === "associado") {
      await supabase
        .from("association_memberships")
        .upsert({ user_id: targetUserId, status: "ativa" }, { onConflict: "user_id" });
    }
  } else {
    const { error: delErr } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId)
      .eq("role", role);
    if (delErr) throw delErr;

    if (role === "associado") {
      await supabase
        .from("association_memberships")
        .update({ status: "encerrada" })
        .eq("user_id", targetUserId);
    }
  }
}

export function MembersRolesPanel() {
  const { user: currentUser } = useSession();
  const queryClient = useQueryClient();
  const manageSkaterMutation = useAdminManageSkaterProfile();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"todos" | "diretoria" | "associado" | "sem_funcao">(
    "todos",
  );
  const [pendingAction, setPendingAction] = useState<RoleChangeAction | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const {
    data: skaterProfilesMap = new Map<string, { modality: SkateModality; is_active: boolean }>(),
  } = useQuery({
    queryKey: ["diretoria-all-members"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("skater_profiles")
        .select("user_id, modality, is_active");
      const map = new Map<string, { modality: SkateModality; is_active: boolean }>();
      for (const row of data ?? []) {
        map.set(row.user_id, {
          modality: row.modality as SkateModality,
          is_active: Boolean(row.is_active),
        });
      }
      return map;
    },
  });

  const {
    data: users = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["registered-users-diretoria"],
    queryFn: async (): Promise<RegisteredUserItem[]> => {
      // 1. Tenta via RPC segura que junta auth.users, profiles, user_roles e association_memberships
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "list_registered_users_for_diretoria",
      );

      if (!rpcError && rpcData) {
        return rpcData as RegisteredUserItem[];
      }

      // 2. Fallback consultando tabelas públicas permitidas para a diretoria via RLS
      const [profilesRes, rolesRes, membershipsRes, appsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, birth_date, created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("association_memberships").select("user_id, status, member_since"),
        supabase
          .from("membership_applications")
          .select("user_id, full_name, email, phone, birth_date, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const userMap = new Map<string, RegisteredUserItem>();

      for (const p of profilesRes.data ?? []) {
        userMap.set(p.id, {
          user_id: p.id,
          email: "",
          full_name: p.full_name || "Cadastro sem nome",
          phone: p.phone,
          birth_date: p.birth_date,
          created_at: p.created_at,
          is_associado: false,
          is_diretoria: false,
          membership_status: null,
          member_since: null,
        });
      }

      for (const app of appsRes.data ?? []) {
        const existing = userMap.get(app.user_id);
        if (existing) {
          if (!existing.email && app.email) existing.email = app.email;
          if (
            (!existing.full_name || existing.full_name === "Cadastro sem nome") &&
            app.full_name
          ) {
            existing.full_name = app.full_name;
          }
          if (!existing.phone && app.phone) existing.phone = app.phone;
          if (!existing.birth_date && app.birth_date) existing.birth_date = app.birth_date;
        } else {
          userMap.set(app.user_id, {
            user_id: app.user_id,
            email: app.email || "",
            full_name: app.full_name || "Solicitante",
            phone: app.phone,
            birth_date: app.birth_date,
            created_at: app.created_at,
            is_associado: false,
            is_diretoria: false,
            membership_status: null,
            member_since: null,
          });
        }
      }

      for (const r of rolesRes.data ?? []) {
        const item = userMap.get(r.user_id) ?? {
          user_id: r.user_id,
          email: "",
          full_name: "Usuário Cadastrado",
          phone: null,
          birth_date: null,
          created_at: new Date().toISOString(),
          is_associado: false,
          is_diretoria: false,
          membership_status: null,
          member_since: null,
        };
        if (r.role === "associado") item.is_associado = true;
        if (r.role === "diretoria") item.is_diretoria = true;
        userMap.set(r.user_id, item);
      }

      for (const m of membershipsRes.data ?? []) {
        const item = userMap.get(m.user_id);
        if (item) {
          item.membership_status = m.status;
          item.member_since = m.member_since;
        }
      }

      return Array.from(userMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  function openRoleAction(targetUser: RegisteredUserItem, role: AppRole, grant: boolean) {
    if (targetUser.user_id === currentUser?.id && role === "diretoria" && !grant) {
      toast.error("Por segurança, você não pode remover sua própria função de diretoria.");
      return;
    }
    setNotes("");
    setPendingAction({ targetUser, role, grant });
  }

  async function confirmRoleChange() {
    if (!pendingAction || busy) return;
    setBusy(true);
    try {
      await updateUserRole(
        pendingAction.targetUser.user_id,
        pendingAction.role,
        pendingAction.grant,
        notes.trim() || undefined,
      );

      const roleLabel = pendingAction.role === "diretoria" ? "Diretoria" : "Associado";
      toast.success(
        pendingAction.grant
          ? `${pendingAction.targetUser.full_name} agora possui a função de ${roleLabel}.`
          : `A função de ${roleLabel} foi removida de ${pendingAction.targetUser.full_name}.`,
      );
      setPendingAction(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["registered-users-diretoria"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-applications"] }),
        queryClient.invalidateQueries({ queryKey: ["my-roles"] }),
        queryClient.invalidateQueries({ queryKey: ["my-membership"] }),
      ]);
    } catch (err: any) {
      const msg = err?.message || "";
      const friendly = msg.includes("própria função de diretoria")
        ? "Você não pode remover sua própria função de diretoria."
        : msg.includes("Acesso negado") || err?.code === "42501"
          ? "Apenas membros autorizados da diretoria podem alterar funções."
          : "Não foi possível atualizar a função deste cadastro. Tente novamente.";
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  }

  async function handleSkaterRankingChange(targetUser: RegisteredUserItem, value: string) {
    try {
      if (value === "none") {
        await manageSkaterMutation.mutateAsync({
          targetUserId: targetUser.user_id,
          modality: "street",
          isActive: false,
        });
        toast.success(
          `${targetUser.full_name} configurado como Associado (fora do ranking competitivo).`,
        );
      } else {
        const modality = value as SkateModality;
        await manageSkaterMutation.mutateAsync({
          targetUserId: targetUser.user_id,
          modality,
          isActive: true,
        });
        toast.success(`${targetUser.full_name} autorizado no Ranking ${modality.toUpperCase()}!`);
      }
    } catch {
      toast.error("Não foi possível alterar a modalidade competitiva deste cadastro.");
    }
  }

  const totalCount = users.length;
  const diretoriaCount = users.filter((u) => u.is_diretoria).length;
  const associadoCount = users.filter((u) => u.is_associado).length;
  const noRoleCount = users.filter((u) => !u.is_diretoria && !u.is_associado).length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter === "diretoria" && !u.is_diretoria) return false;
    if (roleFilter === "associado" && !u.is_associado) return false;
    if (roleFilter === "sem_funcao" && (u.is_diretoria || u.is_associado)) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = u.full_name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = (u.phone || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Cadastros e Funções ({totalCount})</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione qualquer cadastro da plataforma para atribuir ou revogar os perfis de{" "}
            <strong>Associado</strong>, <strong>Diretoria</strong> ou autorizar modalidade no{" "}
            <strong>Ranking (Street / Vert)</strong>.
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="eyebrow text-xs">Total de Cadastros</span>
            <Users className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 font-display text-3xl">{totalCount}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="eyebrow text-xs">Membros da Diretoria</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-amber-700 dark:text-amber-300">
            {diretoriaCount}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="eyebrow text-xs">Associados Ativos</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-3xl text-emerald-700 dark:text-emerald-300">
            {associadoCount}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="eyebrow text-xs">Sem Função Definida</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 font-display text-3xl text-muted-foreground">{noRoleCount}</p>
        </Card>
      </div>

      {/* Barra de busca e filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink bg-card p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            className="field pl-9 py-1.5 text-sm"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <span>Filtrar função:</span>
          <select
            className="field w-auto py-1.5 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          >
            <option value="todos">Todos os cadastros</option>
            <option value="diretoria">Diretoria</option>
            <option value="associado">Associados</option>
            <option value="sem_funcao">Sem função</option>
          </select>
        </label>
      </div>

      {isPending ? (
        <p className="py-8 text-center text-muted-foreground">Carregando lista de cadastros…</p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-center space-y-2"
        >
          <p className="text-destructive font-semibold">
            Não foi possível carregar a lista de cadastros.
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
                <th className="p-3 font-bold text-foreground">Cadastro</th>
                <th className="p-3 font-bold text-foreground">Contato</th>
                <th className="p-3 font-bold text-foreground">Funções Atuais</th>
                <th className="p-3 font-bold text-foreground">Modalidade Ranking</th>
                <th className="p-3 font-bold text-foreground text-right">
                  Selecionar como Associado / Diretoria
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.user_id === currentUser?.id;
                const skaterInfo = skaterProfilesMap.get(u.user_id);
                const skaterSelectValue =
                  skaterInfo && skaterInfo.is_active ? skaterInfo.modality : "none";

                return (
                  <tr
                    key={u.user_id}
                    className="border-b border-border/80 transition-colors hover:bg-muted/20"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{u.full_name}</span>
                        {isSelf && (
                          <span className="rounded bg-ink px-1.5 py-0.5 font-condensed text-[10px] font-bold uppercase tracking-wider text-cream">
                            Você
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground block">
                        Desde {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </td>

                    <td className="p-3 text-xs text-muted-foreground">
                      {u.email && <div className="font-medium text-foreground">{u.email}</div>}
                      <div>{u.phone || "Telefone não informado"}</div>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {u.is_diretoria && (
                          <span className="inline-flex items-center gap-1 rounded-sm border border-amber-700 bg-amber-100 px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                            <ShieldCheck className="h-3 w-3" />
                            Diretoria
                          </span>
                        )}
                        {u.is_associado && (
                          <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-700 bg-emerald-100 px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                            <UserCheck className="h-3 w-3" />
                            Associado
                          </span>
                        )}
                        {!u.is_diretoria && !u.is_associado && (
                          <span className="inline-flex items-center rounded-sm border border-border bg-muted px-2 py-0.5 font-condensed text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Sem função
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <select
                          aria-label={`Modalidade de ranking para ${u.full_name}`}
                          className="field py-1 px-2 text-xs w-auto"
                          value={skaterSelectValue}
                          onChange={(e) => handleSkaterRankingChange(u, e.target.value)}
                        >
                          <option value="none">Fora do Ranking (Associado)</option>
                          <option value="street">Skatista • Street</option>
                          <option value="vert">Skatista • Vert</option>
                        </select>
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        {/* Botão Associado */}
                        {u.is_associado ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-emerald-600/50 text-emerald-800 hover:bg-destructive/10 hover:text-destructive dark:text-emerald-300"
                            onClick={() => openRoleAction(u, "associado", false)}
                            title="Remover função de Associado"
                          >
                            <MinusCircle className="h-3.5 w-3.5 mr-1" />
                            Remover Associado
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                            onClick={() => openRoleAction(u, "associado", true)}
                            title="Definir como Associado"
                          >
                            <PlusCircle className="h-3.5 w-3.5 mr-1" />
                            Tornar Associado
                          </Button>
                        )}

                        {/* Botão Diretoria */}
                        {u.is_diretoria ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf}
                            className="text-xs border-amber-600/50 text-amber-800 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 dark:text-amber-300"
                            onClick={() => openRoleAction(u, "diretoria", false)}
                            title={
                              isSelf
                                ? "Você não pode remover sua própria função de diretoria"
                                : "Remover função de Diretoria"
                            }
                          >
                            <MinusCircle className="h-3.5 w-3.5 mr-1" />
                            Remover Diretoria
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-300"
                            onClick={() => openRoleAction(u, "diretoria", true)}
                            title="Definir como membro da Diretoria"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Tornar Diretoria
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum cadastro encontrado para o filtro selecionado.
            </p>
          )}
        </div>
      )}

      {/* Modal de confirmação antes de conceder ou remover função */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingAction(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              {pendingAction?.role === "diretoria" ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              )}
              <AlertDialogTitle>
                {pendingAction?.grant
                  ? `Confirmar atribuição de ${pendingAction?.role === "diretoria" ? "Diretoria" : "Associado"}`
                  : `Confirmar remoção de ${pendingAction?.role === "diretoria" ? "Diretoria" : "Associado"}`}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-foreground/80 pt-1">
              Cadastro: <strong>{pendingAction?.targetUser.full_name}</strong>
              {pendingAction?.targetUser.email ? ` (${pendingAction.targetUser.email})` : ""}.{" "}
              {pendingAction?.role === "diretoria" && pendingAction?.grant
                ? "Atenção: conceder a função de Diretoria dará a este cadastro acesso administrativo total (aprovação de solicitações, módulo financeiro, edição de páginas e gestão de funções)."
                : pendingAction?.role === "diretoria" && !pendingAction?.grant
                  ? "Este cadastro deixará de ter acesso ao Painel da Diretoria e às ferramentas administrativas."
                  : pendingAction?.role === "associado" && pendingAction?.grant
                    ? "Este cadastro passará a figurar como Associado ativo da A.S.G., com acesso aos avisos internos e inscrições em eventos."
                    : "A função de Associado será revogada e a situação associativa marcada como encerrada."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <label className="block text-sm space-y-1.5">
            <span className="font-semibold text-foreground">
              Observação / justificativa para auditoria (opcional)
            </span>
            <textarea
              className="field mt-1"
              rows={2}
              maxLength={500}
              placeholder="Ex: Eleito em assembleia para a gestão atual / Homologação de associado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button
              disabled={busy}
              className={
                !pendingAction?.grant
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : pendingAction?.role === "diretoria"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
              }
              onClick={confirmRoleChange}
            >
              {busy ? "Salvando…" : "Confirmar alteração"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
