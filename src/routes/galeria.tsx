import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { PageHero, Section, DemoNotice } from "@/components/SiteLayout";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/galeria")({
  head: () => seo("Galeria", "Fotos das sessões, eventos e projetos da Associação dos Skatistas de Guararema."),
  component: () => (
    <>
      <PageHero eyebrow="Registros" title="Galeria" />
      <Section>
        <DemoNotice>As fotos oficiais serão enviadas pela diretoria.</DemoNotice>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex aspect-square items-center justify-center rounded-md border-2 border-dashed border-olive-dark bg-muted text-muted-foreground">
              <Camera className="h-8 w-8" />
            </div>
          ))}
        </div>
      </Section>
    </>
  ),
});
