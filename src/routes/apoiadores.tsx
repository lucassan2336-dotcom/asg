import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Edit3, HeartHandshake } from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useSponsors,
  safeExternalUrl,
  safeImageUrl,
  type GenericPageContent,
  type SponsorItem,
} from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { SponsorModal } from "@/components/CmsModals";

export const Route = createFileRoute("/apoiadores")({
  head: () =>
    seo(
      "Apoiadores e parceiros",
      "Empresas e pessoas que apoiam o skate em Guararema junto com a A.S.G.",
    ),
  component: ApoiadoresPage,
});

function ApoiadoresPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("apoiadores");
  const { data: sponsors, isLoading } = useSponsors();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorItem | null>(null);

  const hero = content?.hero;
  const list = isDiretoria ? sponsors || [] : (sponsors || []).filter((s) => s.published);

  const handleNewSponsor = () => {
    setSelectedSponsor(null);
    setModalOpen(true);
  };

  const handleEditSponsor = (item: SponsorItem) => {
    setSelectedSponsor(item);
    setModalOpen(true);
  };

  return (
    <>
      <EditablePageToolbar
        pageSlug="apoiadores"
        pageName="Apoiadores e Parceiros"
        addItemLabel="Novo Apoiador"
        onAddItem={handleNewSponsor}
      />

      <PageHero eyebrow={hero?.eyebrow || "Juntos"} title={hero?.title || "Apoiadores e parceiros"}>
        {hero?.description ||
          "Quem acredita no skate e fortalece a Associação dos Skatistas de Guararema."}
      </PageHero>

      <Section>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando apoiadores…</p>
        ) : list.length === 0 ? (
          <Card className="text-center py-10 text-muted-foreground">
            Nenhum apoiador cadastrado no momento.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {list.map((sp) => (
              <div
                key={sp.id}
                className="relative flex flex-col items-center justify-center rounded-md border-2 border-ink bg-card p-6 text-center shadow-stamp transition-transform hover:-translate-y-1"
              >
                {isDiretoria && (
                  <button
                    onClick={() => handleEditSponsor(sp)}
                    className="absolute top-2 right-2 rounded bg-muted p-1 hover:bg-accent hover:text-accent-foreground"
                    title="Editar apoiador"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                )}

                {safeImageUrl(sp.logo_url) ? (
                  <img
                    src={safeImageUrl(sp.logo_url)!}
                    alt={sp.name}
                    className="h-16 w-full object-contain mb-3"
                  />
                ) : (
                  <HeartHandshake className="h-12 w-12 text-accent mb-2" />
                )}

                <h3 className="font-condensed font-bold uppercase text-lg tracking-wide">
                  {sp.name}
                </h3>

                {safeExternalUrl(sp.website) && (
                  <a
                    href={safeExternalUrl(sp.website)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
                  >
                    Visitar site <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-lg border-2 border-ink bg-muted/30 p-8 text-center shadow-stamp">
          <h3 className="text-2xl font-display">Sua marca fortalecendo a comunidade</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            Faça parte dos parceiros oficiais da A.S.G. e apoie projetos sociais, eventos e o
            desenvolvimento do skate em Guararema.
          </p>
          <div className="mt-6">
            <Link to="/contato" className="btn-stamp">
              Quero apoiar a A.S.G.
            </Link>
          </div>
        </div>
      </Section>

      {modalOpen && <SponsorModal sponsor={selectedSponsor} onClose={() => setModalOpen(false)} />}
    </>
  );
}
