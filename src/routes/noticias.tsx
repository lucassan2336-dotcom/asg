import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, Edit3, Newspaper } from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import {
  usePageContent,
  useNewsArticles,
  type GenericPageContent,
  type NewsArticleItem,
} from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { NewsModal } from "@/components/CmsModals";

export const Route = createFileRoute("/noticias")({
  head: () => seo("Notícias", "Novidades, comunicados e histórias da cena do skate em Guararema."),
  component: NoticiasPage,
});

function NoticiasPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("noticias");
  const { data: articles, isLoading } = useNewsArticles();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticleItem | null>(null);

  const hero = content?.hero;
  const list = isDiretoria ? articles || [] : (articles || []).filter((a) => a.published);

  const handleNewArticle = () => {
    setSelectedArticle(null);
    setModalOpen(true);
  };

  const handleEditArticle = (item: NewsArticleItem) => {
    setSelectedArticle(item);
    setModalOpen(true);
  };

  return (
    <>
      <EditablePageToolbar
        pageSlug="noticias"
        pageName="Notícias"
        addItemLabel="Nova Notícia"
        onAddItem={handleNewArticle}
      />

      <PageHero eyebrow={hero?.eyebrow || "Fique por dentro"} title={hero?.title || "Notícias"}>
        {hero?.description || "Novidades, comunicados e histórias da cena do skate em Guararema."}
      </PageHero>

      <Section>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando notícias…</p>
        ) : list.length === 0 ? (
          <Card className="text-center py-10 text-muted-foreground">
            Nenhuma notícia publicada no momento.
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {list.map((item) => {
              const dateStr = item.published_at
                ? new Date(item.published_at).toLocaleDateString("pt-BR")
                : "Recente";

              return (
                <Card key={item.id} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 text-accent" />
                        {dateStr}
                      </span>
                      {isDiretoria && (
                        <div className="flex items-center gap-2">
                          {!item.published && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-muted-foreground">
                              Rascunho
                            </span>
                          )}
                          <button
                            onClick={() => handleEditArticle(item)}
                            className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-semibold hover:bg-accent hover:text-accent-foreground"
                            title="Editar notícia"
                          >
                            <Edit3 className="h-3 w-3" /> Editar
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="mt-2 text-2xl font-bold">{item.title}</h3>
                    {item.summary && (
                      <p className="mt-2 text-sm text-foreground/80 font-medium">{item.summary}</p>
                    )}
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {item.body}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-condensed uppercase font-semibold">
                      <Newspaper className="h-3.5 w-3.5 text-accent" /> Comunicação A.S.G.
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {modalOpen && <NewsModal article={selectedArticle} onClose={() => setModalOpen(false)} />}
    </>
  );
}
