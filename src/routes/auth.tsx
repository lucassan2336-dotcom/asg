import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Shield, UserCheck, Trophy, CheckCircle2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { safeRedirect, useSession } from "@/lib/auth";
import { usePageContent, type AuthPageContent } from "@/lib/cms";
import { seo } from "@/lib/seo";
import type { AccountKind, SkateModality, SkateStance } from "@/lib/ranking";

type AuthSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () =>
    seo(
      "Entrar ou Criar Conta",
      "Acesse sua conta da A.S.G. ou cadastre-se como Skatista Local (Street/Vert) ou Associado.",
    ),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectTarget } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const { content } = usePageContent<AuthPageContent>("auth");

  const [mode, setMode] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [accountType, setAccountType] = useState<AccountKind>("skatista");
  const [modality, setModality] = useState<SkateModality | "">("street");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [yearsPracticing, setYearsPracticing] = useState("");
  const [favoriteTrick, setFavoriteTrick] = useState("");
  const [stance, setStance] = useState<SkateStance | "">("regular");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!loading && user) {
    navigate({ to: safeRedirect(redirectTarget) });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "criar") {
      const cleanName = fullName.trim();
      if (cleanName.length < 3) {
        toast.error("Informe seu nome completo (mínimo de 3 caracteres).");
        return;
      }
      if (
        accountType === "skatista" &&
        !["street", "vert", "versatil", "escolher_depois"].includes(modality)
      ) {
        toast.error("Selecione sua modalidade: Street, Vert, Versátil ou Escolher Depois.");
        return;
      }
      if (age.trim()) {
        const parsedAge = Number(age);
        if (!Number.isInteger(parsedAge) || parsedAge < 3 || parsedAge > 110) {
          toast.error("Informe uma idade válida entre 3 e 110 anos.");
          return;
        }
      }
    }

    setBusy(true);
    try {
      if (mode === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
      } else if (mode === "criar") {
        const cleanName = fullName.trim().slice(0, 100);
        const parsedAge = age.trim() ? Number(age) : null;
        const selectedModality: SkateModality =
          accountType === "skatista" &&
          ["street", "vert", "versatil", "escolher_depois"].includes(modality)
            ? modality
            : "street";

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: cleanName,
              account_type: accountType,
              modality: accountType === "skatista" ? selectedModality : null,
              age: parsedAge,
              years_practicing:
                accountType === "skatista" ? yearsPracticing.trim().slice(0, 60) || null : null,
              favorite_trick:
                accountType === "skatista" ? favoriteTrick.trim().slice(0, 80) || null : null,
              stance:
                accountType === "skatista" && (stance === "regular" || stance === "goofy")
                  ? stance
                  : null,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Se a sessão já estiver ativa imediatamente, garantir sincronização dos perfis
        if (signUpData.session && signUpData.user) {
          const uid = signUpData.user.id;
          await (supabase as any)
            .from("profiles")
            .update({
              full_name: cleanName,
              age: parsedAge,
            })
            .eq("id", uid);

          if (accountType === "skatista") {
            await (supabase as any).from("skater_profiles").upsert(
              {
                user_id: uid,
                full_name: cleanName,
                age: parsedAge,
                years_practicing: yearsPracticing.trim().slice(0, 60) || "",
                favorite_trick: favoriteTrick.trim().slice(0, 80) || "",
                stance: stance === "regular" || stance === "goofy" ? stance : null,
                modality: selectedModality,
              },
              { onConflict: "user_id" },
            );
          } else {
            await (supabase as any).from("associate_profiles").upsert(
              {
                user_id: uid,
                full_name: cleanName,
                age: parsedAge,
              },
              { onConflict: "user_id" },
            );
          }
          toast.success(
            accountType === "skatista"
              ? `Conta de Skatista (${selectedModality.toUpperCase()}) criada com sucesso!`
              : "Conta de Associado criada com sucesso!",
          );
          navigate({ to: safeRedirect(redirectTarget) });
          return;
        }

        setConfirmSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: safeRedirect(redirectTarget) });
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message.toLowerCase() : "";
      const friendly = raw.includes("invalid login credentials")
        ? "E-mail ou senha incorretos."
        : raw.includes("email not confirmed")
          ? "Confirme seu e-mail antes de acessar a conta."
          : raw.includes("already registered") || raw.includes("already exists")
            ? "Não foi possível concluir o cadastro com este e-mail."
            : raw.includes("rate limit") || raw.includes("too many requests")
              ? "Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente."
              : "Não foi possível concluir a autenticação. Verifique os dados informados.";
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <EditablePageToolbar pageSlug="auth" pageName="Criação de Conta / Login" />

      <PageHero
        eyebrow={content?.hero?.eyebrow || "Conta A.S.G."}
        title={
          mode === "entrar"
            ? content?.loginTitle || "Entrar"
            : mode === "criar"
              ? content?.signupTitle || "Criar conta"
              : "Recuperar senha"
        }
      >
        {mode === "entrar"
          ? content?.loginDescription ||
            "Acesse seu perfil de Skatista Local ou sua Área do Associado."
          : mode === "criar"
            ? content?.signupDescription ||
              content?.hero?.description ||
              "Escolha seu tipo de conta: Skatista Local (para competir no Ranking Street ou Vert) ou Associado da A.S.G."
            : "Informe seu e-mail para receber o link de redefinição de senha."}
      </PageHero>
      <Section className="flex justify-center">
        <Card className={`w-full ${mode === "criar" ? "max-w-2xl" : "max-w-md"}`}>
          {confirmSent ? (
            <div className="py-6 text-center">
              <h2 className="text-2xl">Confira seu e-mail</h2>
              <p className="mt-2 text-muted-foreground">
                Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para
                ativar sua conta de{" "}
                <strong>
                  {accountType === "skatista"
                    ? `Skatista Local (${modality === "vert" ? "Vert" : "Street"})`
                    : "Associado"}
                </strong>{" "}
                e depois entre aqui.
              </p>
              <button
                className="btn-ghost-stamp mt-6"
                onClick={() => {
                  setConfirmSent(false);
                  setMode("entrar");
                }}
              >
                Voltar para entrar
              </button>
            </div>
          ) : resetSent ? (
            <div className="py-6 text-center">
              <h2 className="text-2xl">Link enviado</h2>
              <p className="mt-2 text-muted-foreground">
                Se existir uma conta com <strong>{email}</strong>, você receberá um link para
                definir uma nova senha.
              </p>
              <button
                className="btn-ghost-stamp mt-6"
                onClick={() => {
                  setResetSent(false);
                  setMode("entrar");
                }}
              >
                Voltar para entrar
              </button>
            </div>
          ) : (
            <>
              {mode !== "recuperar" && (
                <div className="mb-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={
                      mode === "entrar"
                        ? "btn-stamp justify-center"
                        : "btn-ghost-stamp justify-center"
                    }
                    onClick={() => setMode("entrar")}
                  >
                    Entrar
                  </button>
                  <button
                    type="button"
                    className={
                      mode === "criar"
                        ? "btn-stamp justify-center"
                        : "btn-ghost-stamp justify-center"
                    }
                    onClick={() => setMode("criar")}
                  >
                    Criar conta
                  </button>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {mode === "criar" && (
                  <>
                    <div>
                      <span className="eyebrow block mb-2">
                        1. Escolha o tipo da sua conta (Obrigatório)
                      </span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* SKATISTA LOCAL */}
                        <button
                          type="button"
                          onClick={() => setAccountType("skatista")}
                          className={`relative flex flex-col items-start rounded-md border-2 p-4 text-left transition-all ${
                            accountType === "skatista"
                              ? "border-ink bg-secondary shadow-stamp"
                              : "border-border bg-card hover:border-ink/60"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 rounded-sm border border-ink bg-rust px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-cream">
                              <Trophy className="h-3.5 w-3.5" /> Skatista Local
                            </span>
                            {accountType === "skatista" && (
                              <CheckCircle2 className="h-5 w-5 text-rust" />
                            )}
                          </div>
                          <h3 className="mt-2 font-display text-xl uppercase">
                            {content?.skaterCardTitle || "Skatista Local"}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {content?.skaterCardDescription ||
                              "Cria seu perfil esportivo público e vincula você às competições oficiais da A.S.G."}
                          </p>
                        </button>

                        {/* ASSOCIADO */}
                        <button
                          type="button"
                          onClick={() => setAccountType("associado")}
                          className={`relative flex flex-col items-start rounded-md border-2 p-4 text-left transition-all ${
                            accountType === "associado"
                              ? "border-ink bg-secondary shadow-stamp"
                              : "border-border bg-card hover:border-ink/60"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 rounded-sm border border-ink bg-olive px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-cream">
                              <UserCheck className="h-3.5 w-3.5" /> Associado
                            </span>
                            {accountType === "associado" && (
                              <CheckCircle2 className="h-5 w-5 text-olive" />
                            )}
                          </div>
                          <h3 className="mt-2 font-display text-xl uppercase">
                            {content?.associateCardTitle || "Associado A.S.G."}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {content?.associateCardDescription ||
                              "Perfil associativo exclusivo para membros e apoiadores da A.S.G. Não inclui no ranking competitivo."}
                          </p>
                        </button>
                      </div>
                    </div>

                    {accountType === "skatista" && (
                      <div className="rounded-md border-2 border-ink bg-muted/40 p-4 space-y-4">
                        <div>
                          <span className="eyebrow block mb-2">2. Modalidade para o Ranking</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setModality("street")}
                              className={`flex items-center justify-center gap-2 rounded-sm border-2 px-4 py-3 font-condensed text-sm font-bold uppercase tracking-wider transition-all ${
                                modality === "street"
                                  ? "border-ink bg-olive text-cream shadow-stamp"
                                  : "border-ink/40 bg-card text-foreground hover:border-ink"
                              }`}
                            >
                              <Flame className="h-4 w-4" />
                              Street
                            </button>
                            <button
                              type="button"
                              onClick={() => setModality("vert")}
                              className={`flex items-center justify-center gap-2 rounded-sm border-2 px-4 py-3 font-condensed text-sm font-bold uppercase tracking-wider transition-all ${
                                modality === "vert"
                                  ? "border-ink bg-olive text-cream shadow-stamp"
                                  : "border-ink/40 bg-card text-foreground hover:border-ink"
                              }`}
                            >
                              <Shield className="h-4 w-4" />
                              Vert
                            </button>
                            <button
                              type="button"
                              onClick={() => setModality("versatil")}
                              className={`flex items-center justify-center gap-2 rounded-sm border-2 px-4 py-3 font-condensed text-sm font-bold uppercase tracking-wider transition-all ${
                                modality === "versatil"
                                  ? "border-ink bg-olive text-cream shadow-stamp"
                                  : "border-ink/40 bg-card text-foreground hover:border-ink"
                              }`}
                            >
                              <Sparkles className="h-4 w-4" />
                              Versátil (Street + Vert)
                            </button>
                            <button
                              type="button"
                              onClick={() => setModality("escolher_depois")}
                              className={`flex items-center justify-center gap-2 rounded-sm border-2 px-4 py-3 font-condensed text-sm font-bold uppercase tracking-wider transition-all ${
                                modality === "escolher_depois"
                                  ? "border-ink bg-olive text-cream shadow-stamp"
                                  : "border-ink/40 bg-card text-foreground hover:border-ink"
                              }`}
                            >
                              <Clock className="h-4 w-4" />
                              Escolher Depois (Em Aberto)
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {modality === "versatil" && (
                              <span className="font-semibold text-foreground">
                                ✨ <strong>Versátil:</strong> Você poderá participar e pontuar em
                                ambos os rankings oficiais (Street e Vert).
                              </span>
                            )}
                            {modality === "escolher_depois" && (
                              <span className="font-semibold text-foreground">
                                ⏳ <strong>Em Aberto:</strong> Seu cadastro de skatista será criado,
                                porém você não participará do ranking até definir a modalidade com a
                                diretoria.
                              </span>
                            )}
                            {modality === "street" && (
                              <span>
                                Você participará exclusivamente do ranking oficial de{" "}
                                <strong>Street</strong>.
                              </span>
                            )}
                            {modality === "vert" && (
                              <span>
                                Você participará exclusivamente do ranking oficial de{" "}
                                <strong>Vert</strong>.
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="eyebrow">Base (Regular / Goofy)</span>
                            <select
                              className="field mt-1"
                              value={stance}
                              onChange={(e) => setStance(e.target.value as SkateStance | "")}
                            >
                              <option value="regular">Regular (pé esquerdo na frente)</option>
                              <option value="goofy">Goofy (pé direito na frente)</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="eyebrow">Idade (opcional)</span>
                            <input
                              type="number"
                              min={3}
                              max={110}
                              placeholder="Ex: 19"
                              className="field mt-1"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <span className="eyebrow">Tempo de skate</span>
                            <input
                              maxLength={60}
                              placeholder="Ex: 5 anos"
                              className="field mt-1"
                              value={yearsPracticing}
                              onChange={(e) => setYearsPracticing(e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <span className="eyebrow">Manobra preferida</span>
                            <input
                              maxLength={80}
                              placeholder="Ex: Kickflip Backside Tailslide"
                              className="field mt-1"
                              value={favoriteTrick}
                              onChange={(e) => setFavoriteTrick(e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {accountType === "associado" && (
                      <div className="rounded-md border-2 border-ink bg-muted/40 p-4">
                        <label className="block max-w-xs">
                          <span className="eyebrow">Idade (opcional)</span>
                          <input
                            type="number"
                            min={3}
                            max={110}
                            placeholder="Ex: 28"
                            className="field mt-1"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                          />
                        </label>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Sua conta será criada como <strong>Associado</strong>, com perfil
                          associativo separado do ranking competitivo de Street e Vert.
                        </p>
                      </div>
                    )}

                    <label className="block">
                      <span className="eyebrow">Nome completo</span>
                      <input
                        required
                        maxLength={100}
                        placeholder="Seu nome ou apelido oficial nas pistas"
                        className="field mt-1"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </label>
                  </>
                )}

                <label className="block">
                  <span className="eyebrow">E-mail</span>
                  <input
                    required
                    type="email"
                    maxLength={255}
                    className="field mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                {mode !== "recuperar" && (
                  <label className="block">
                    <span className="eyebrow">Senha</span>
                    <input
                      required
                      type="password"
                      minLength={6}
                      maxLength={72}
                      className="field mt-1"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                )}

                <button
                  disabled={busy}
                  className="btn-stamp w-full justify-center disabled:opacity-60"
                >
                  {busy
                    ? "Aguarde…"
                    : mode === "entrar"
                      ? "Entrar"
                      : mode === "criar"
                        ? accountType === "skatista"
                          ? `Criar conta de Skatista (${modality === "vert" ? "Vert" : "Street"})`
                          : "Criar conta de Associado"
                        : "Enviar link de redefinição"}
                </button>

                {mode === "entrar" && (
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
                    onClick={() => setMode("recuperar")}
                  >
                    Esqueci minha senha
                  </button>
                )}
                {mode === "recuperar" && (
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
                    onClick={() => setMode("entrar")}
                  >
                    Voltar para entrar
                  </button>
                )}
              </form>
            </>
          )}
        </Card>
      </Section>
    </>
  );
}
