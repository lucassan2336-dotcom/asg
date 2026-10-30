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

export interface PasswordRequirementStatus {
  minLength: boolean;
  hasUppercase: boolean;
  hasSpecialChar: boolean;
  hasNumber: boolean;
  isValid: boolean;
}

/** Verifica os 4 requisitos obrigatórios para criação/redefinição de senha. */
export function checkPasswordRequirements(password: string): PasswordRequirementStatus {
  const minLength = password.length >= 6;
  const hasUppercase = /[A-ZÀ-Ý]/.test(password);
  const hasSpecialChar = /[^A-Za-zÀ-ÿ0-9\s]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return {
    minLength,
    hasUppercase,
    hasSpecialChar,
    hasNumber,
    isValid: minLength && hasUppercase && hasSpecialChar && hasNumber,
  };
}

/** Retorna mensagem amigável se algum requisito de senha não for atendido, ou null se válida. */
export function getPasswordValidationError(password: string): string | null {
  const status = checkPasswordRequirements(password);
  if (status.isValid) return null;

  const missing: string[] = [];
  if (!status.minLength) missing.push("mínimo de 6 dígitos");
  if (!status.hasUppercase) missing.push("pelo menos 1 letra maiúscula");
  if (!status.hasSpecialChar) missing.push("caracteres especiais");
  if (!status.hasNumber) missing.push("pelo menos 1 número");

  return `A senha deve conter: ${missing.join(", ")}.`;
}
