import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async () => (await supabase.auth.getUser()).data.user,
  staleTime: 60_000,
});

export function useSession() {
  const { data: user, isLoading } = useQuery(sessionQueryOptions);
  return { user: user ?? null, loading: isLoading };
}

export function useMyRoles(userId: string | undefined) {
  const { data: roles, isLoading } = useQuery({
    queryKey: ["my-roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      return (data ?? []).map((r) => r.role as string);
    },
  });
  return { roles: roles ?? [], loading: isLoading };
}

/** Só aceita caminhos internos; qualquer outra coisa vira o destino padrão. */
export function safeRedirect(target: string | undefined, fallback = "/area"): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}
