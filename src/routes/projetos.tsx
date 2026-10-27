import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HeartHandshake, Edit3, Users } from "lucide-react";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";
import { usePageContent, useProjects, type GenericPageContent, type ProjectItem } from "@/lib/cms";
import { useSession, useMyRoles } from "@/lib/auth";
import { EditablePageToolbar } from "@/components/EditablePageToolbar";
import { ProjectModal } from "@/components/CmsModals";

export const Route = createFileRoute("/projetos")({
  head: () =>
    seo(
      "Projetos sociais",
      "Iniciativas da A.S.G. que levam o skate a crianças, jovens e à comunidade de Guararema.",
    ),
  component: ProjetosPage,
});

function ProjetosPage() {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");

  const { content } = usePageContent<GenericPageContent>("projetos");
  const { data: projects, isLoading } = useProjects();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const hero = content?.hero;
  const list = isDiretoria ? projects || [] : (projects || []).filter((p) => p.published);

  const handleNewProject = () => {
    setSelectedProject(null);
    setModalOpen(true);
  };

  const handleEditProject = (item: ProjectItem) => {
    setSelectedProject(item);
    setModalOpen(true);
  };

  return (
    <>
      <EditablePageToolbar
        pageSlug="projetos"
        pageName="Projetos Sociais"
        addItemLabel="Novo Projeto"
        onAddItem={handleNewProject}
      />

      <PageHero eyebrow={hero?.eyebrow || "Impacto"} title={hero?.title || "Projetos sociais"}>
        {hero?.description || "O skate como porta de entrada para educação, saúde e convivência."}
      </PageHero>

      <Section>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando projetos…</p>
        ) : list.length === 0 ? (
          <Card className="text-center py-10 text-muted-foreground">
            Nenhum projeto cadastrado no momento.
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {list.map((proj) => (
              <Card key={proj.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="eyebrow text-accent">{proj.category}</span>
                    {isDiretoria && (
                      <div className="flex items-center gap-2">
                        {!proj.published && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-muted-foreground">
                            Rascunho
                          </span>
                        )}
                        <button
                          onClick={() => handleEditProject(proj)}
                          className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-semibold hover:bg-accent hover:text-accent-foreground"
                          title="Editar projeto"
                        >
                          <Edit3 className="h-3 w-3" /> Editar
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="mt-2 text-2xl font-bold">{proj.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {proj.description}
                  </p>

                  {proj.target_audience && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5 text-accent" />
                      <span>{proj.target_audience}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-condensed uppercase font-semibold">
                    <HeartHandshake className="h-3.5 w-3.5 text-accent" /> A.S.G. Social
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {modalOpen && <ProjectModal project={selectedProject} onClose={() => setModalOpen(false)} />}
    </>
  );
}
