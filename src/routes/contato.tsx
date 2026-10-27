import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Mail,
  Phone,
  Instagram,
  MapPin,
  Clock,
  Send,
  HeartHandshake,
  Copy,
  Check,
  Edit3,
  X,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useSavePageContent,
  type ContatoContent,
  type ContatoPixConfig,
} from "@/lib/cms";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { useMyRoles, useSession } from "@/lib/auth";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo (mínimo 3 caracteres).")
    .max(100, "Nome muito longo."),
  email: z.string().trim().email("Informe um endereço de e-mail válido.").max(255),
  message: z
    .string()
    .trim()
    .min(10, "A mensagem deve conter no mínimo 10 caracteres.")
    .max(1000, "A mensagem deve ter no máximo 1000 caracteres."),
});

export const Route = createFileRoute("/contato")({
  head: () =>
    seo(
      "Contato e Doações",
      "Fale com a Associação dos Skatistas de Guararema e apoie a cena com doações oficiais via PIX.",
    ),
  component: ContatoPage,
});

function EditPixModal({
  currentPix,
  fullContent,
  onClose,
}: {
  currentPix?: ContatoPixConfig;
  fullContent: ContatoContent;
  onClose: () => void;
}) {
  const savePage = useSavePageContent();
  const [key, setKey] = useState(currentPix?.key || "contato@asgskate.com.br");
  const [keyType, setKeyType] = useState(currentPix?.keyType || "E-mail");
  const [recipientName, setRecipientName] = useState(
    currentPix?.recipientName || "Associação dos Skatistas de Guararema",
  );
  const [bank, setBank] = useState(currentPix?.bank || "Banco do Brasil");
  const [message, setMessage] = useState(
    currentPix?.message ||
      "Sua doação ajuda a manter a pista municipal de skate, realizar oficinas gratuitas e apoiar nossos atletas.",
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (key.trim().length < 3) {
      toast.error("Informe uma chave PIX válida.");
      return;
    }

    try {
      const updatedContent: ContatoContent = {
        ...fullContent,
        pix: {
          key: key.trim(),
          keyType: keyType.trim(),
          recipientName: recipientName.trim(),
          bank: bank.trim(),
          message: message.trim(),
        },
      };

      await savePage.mutateAsync({
        slug: "contato",
        content: updatedContent,
      });

      toast.success("Chave PIX da A.S.G. atualizada com sucesso!");
      onClose();
    } catch {
      toast.error("Não foi possível atualizar a chave PIX.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-md border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span className="eyebrow">Diretoria A.S.G.</span>
            <h2 className="text-2xl font-display uppercase">Configurar Chave PIX</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="eyebrow">Tipo de Chave</span>
              <select
                className="field mt-1"
                value={keyType}
                onChange={(e) => setKeyType(e.target.value)}
              >
                <option value="CNPJ">CNPJ</option>
                <option value="E-mail">E-mail</option>
                <option value="Telefone">Telefone / WhatsApp</option>
                <option value="Chave Aleatória">Chave Aleatória (EVP)</option>
              </select>
            </label>

            <label className="block">
              <span className="eyebrow">Chave PIX</span>
              <input
                required
                maxLength={100}
                placeholder="Ex: contato@asgskate.com.br ou CNPJ"
                className="field mt-1 font-mono"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
            </label>
          </div>

          <label className="block">
            <span className="eyebrow">Favorecido / Titular da Conta</span>
            <input
              required
              maxLength={120}
              placeholder="Associação dos Skatistas de Guararema"
              className="field mt-1"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="eyebrow">Banco / Instituição (opcional)</span>
            <input
              maxLength={100}
              placeholder="Ex: Banco do Brasil / Nubank / Sicredi"
              className="field mt-1"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="eyebrow">Mensagem aos Apoiadores</span>
            <textarea
              rows={3}
              maxLength={400}
              placeholder="Explique como as doações ajudam os projetos e a pista..."
              className="field mt-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="btn-ghost-stamp">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savePage.isPending}
              className="btn-stamp bg-rust text-cream disabled:opacity-60"
            >
              {savePage.isPending ? "Salvando…" : "Salvar Chave PIX"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContatoPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<ContatoContent>("contato");
  const hero = content?.hero;
  const info = content?.contactInfo;
  const pix = content?.pix || {
    key: "contato@asgskate.com.br",
    keyType: "E-mail",
    recipientName: "Associação dos Skatistas de Guararema",
    bank: "Banco do Brasil / Cooperativa",
    message:
      "Sua doação ajuda a manter a pista municipal de skate, realizar oficinas gratuitas para iniciantes e apoiar nossos atletas.",
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editPixOpen, setEditPixOpen] = useState(false);

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(pix.key);
      setCopied(true);
      toast.success("Chave PIX copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione e copie o texto.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ name, email, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Por favor, revise os campos do formulário.");
      return;
    }
    setSending(true);
    const officialEmail = info?.email || "contato@asgskate.com.br";
    const subject = encodeURIComponent(`[Contato A.S.G.] ${parsed.data.name}`);
    const body = encodeURIComponent(
      `Nome: ${parsed.data.name}\nE-mail: ${parsed.data.email}\n\nMensagem:\n${parsed.data.message}`,
    );
    window.location.href = `mailto:${officialEmail}?subject=${subject}&body=${body}`;
    setTimeout(() => {
      setSending(false);
      toast.success(`Sua mensagem foi preparada para envio ao canal oficial (${officialEmail}).`);
      setName("");
      setEmail("");
      setMessage("");
    }, 300);
  };

  return (
    <>
      <EditablePageToolbar pageSlug="contato" pageName="Contato" />

      <PageHero eyebrow={hero?.eyebrow || "Fale com a gente"} title={hero?.title || "Contato"}>
        {hero?.description ||
          "Canais oficiais de atendimento da Associação dos Skatistas de Guararema e apoio via doação PIX."}
      </PageHero>

      <Section className="space-y-8">
        {/* Bloco de Destaque: Doação Oficial via PIX */}
        <Card className="border-2 border-ink bg-gradient-to-r from-secondary via-card to-secondary/80 p-6 md:p-8 shadow-stamp">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-ink bg-rust text-cream shadow-stamp">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <div>
                <span className="eyebrow block text-rust">Apoie a Associação</span>
                <h2 className="text-2xl md:text-3xl font-display uppercase">
                  Doação Oficial via PIX
                </h2>
              </div>
            </div>

            {isDiretoria && (
              <button
                type="button"
                onClick={() => setEditPixOpen(true)}
                className="btn-stamp bg-card text-xs inline-flex items-center gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5 text-rust" /> Configurar Chave PIX (Diretoria)
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-12 items-center">
            <div className="md:col-span-7 space-y-3">
              <p className="text-sm text-foreground/90 leading-relaxed">
                {pix.message ||
                  "Sua doação ajuda a manter a pista municipal de skate de Guararema, realizar oficinas gratuitas e apoiar nossos skatistas nas competições."}
              </p>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Favorecido: <strong className="text-foreground">{pix.recipientName}</strong>
                </p>
                {pix.bank && (
                  <p>
                    Instituição: <strong className="text-foreground">{pix.bank}</strong>
                  </p>
                )}
                <p>
                  Tipo de chave: <strong className="text-foreground">{pix.keyType}</strong>
                </p>
              </div>
            </div>

            <div className="md:col-span-5 rounded-md border-2 border-ink bg-card p-4 space-y-3 shadow-stamp">
              <span className="eyebrow block">Chave PIX Oficial ({pix.keyType})</span>
              <div className="flex items-center gap-2 rounded border border-border bg-muted/60 p-2.5 font-mono text-sm break-all">
                <QrCode className="h-5 w-5 text-rust shrink-0" />
                <span className="select-all font-bold text-foreground flex-1">{pix.key}</span>
              </div>

              <button
                type="button"
                onClick={handleCopyPix}
                className="btn-stamp w-full justify-center bg-rust text-cream text-xs hover:brightness-110"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Chave PIX Copiada!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copiar Chave PIX
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Canais Oficiais e Envio de Mensagem */}
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <Card className="space-y-4">
              <h2 className="text-2xl font-bold font-display uppercase">Canais Oficiais</h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="eyebrow block">E-mail</span>
                    <a
                      href={`mailto:${info?.email || "contato@asgskate.com.br"}`}
                      className="font-medium hover:underline"
                    >
                      {info?.email || "contato@asgskate.com.br"}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="eyebrow block">Telefone / WhatsApp</span>
                    <span className="font-medium">{info?.phone || "(11) 98765-4321"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Instagram className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="eyebrow block">Instagram</span>
                    <a
                      href={`https://instagram.com/${(info?.instagram || "asg_guararema").replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent hover:underline"
                    >
                      {info?.instagram || "@asg_guararema"}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="eyebrow block">Pista & Sede</span>
                    <span className="font-medium text-muted-foreground">
                      {info?.address || "Pista Pública de Skate de Guararema, SP"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="eyebrow block">Horários de Atendimento</span>
                    <span className="font-medium text-muted-foreground">
                      {info?.hours || "Sábados e domingos durante as sessões oficiais"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="text-2xl font-bold font-display uppercase">Envie uma mensagem</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Dúvidas, sugestões ou interesse em parcerias.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="eyebrow">Nome Completo</span>
                <input
                  required
                  maxLength={100}
                  className="field mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                />
              </label>

              <label className="block">
                <span className="eyebrow">E-mail</span>
                <input
                  required
                  type="email"
                  maxLength={255}
                  className="field mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </label>

              <label className="block">
                <span className="eyebrow">Mensagem</span>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  className="field mt-1"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva sua mensagem…"
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="btn-stamp w-full justify-center disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sending ? "Enviando…" : "Enviar Mensagem"}
              </button>
            </form>
          </Card>
        </div>
      </Section>

      {editPixOpen && (
        <EditPixModal
          currentPix={pix}
          fullContent={content || { hero: hero!, contactInfo: info!, pix }}
          onClose={() => setEditPixOpen(false)}
        />
      )}
    </>
  );
}
