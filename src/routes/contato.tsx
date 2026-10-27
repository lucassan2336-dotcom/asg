import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Phone, Instagram, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import { usePageContent, type ContatoContent } from "@/lib/cms";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";

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
  head: () => seo("Contato", "Fale com a Associação dos Skatistas de Guararema."),
  component: ContatoPage,
});

function ContatoPage() {
  const { content } = usePageContent<ContatoContent>("contato");
  const hero = content?.hero;
  const info = content?.contactInfo;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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
          "Canais oficiais de atendimento da Associação dos Skatistas de Guararema."}
      </PageHero>

      <Section className="grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-2xl font-bold font-display">Canais Oficiais</h2>
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
          <h2 className="text-2xl font-bold font-display">Envie uma mensagem</h2>
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
      </Section>
    </>
  );
}
