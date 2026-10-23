import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Portão das áreas internas: a sessão fica no navegador, então a verificação
// roda só no cliente (ssr: false) e manda quem não está logado para /auth.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
