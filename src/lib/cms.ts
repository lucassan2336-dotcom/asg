import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ==========================================
// Tipos e Estruturas de Conteúdo
// ==========================================

export interface PageHeroContent {
  eyebrow: string;
  title: string;
  description: string;
}

export interface HomeContent {
  hero: PageHeroContent & {
    primaryCtaText: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
  };
  pillars: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  ctaBanner: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface SobreContent {
  hero: PageHeroContent;
  pillars: Array<{
    title: string;
    description: string;
  }>;
  history: {
    title: string;
    text: string;
  };
  board: {
    title: string;
    members: string;
  };
}

export interface ContatoPixConfig {
  key: string;
  keyType: string;
  recipientName: string;
  bank?: string;
  message?: string;
}

export interface ContatoContent {
  hero: PageHeroContent;
  contactInfo: {
    email: string;
    phone: string;
    instagram: string;
    address: string;
    hours: string;
  };
  pix?: ContatoPixConfig;
}

export interface AuthPageContent {
  hero: PageHeroContent;
  signupTitle?: string;
  signupDescription?: string;
  loginTitle?: string;
  loginDescription?: string;
  skaterCardTitle?: string;
  skaterCardDescription?: string;
  associateCardTitle?: string;
  associateCardDescription?: string;
}

export interface GenericPageContent {
  hero: PageHeroContent;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  category: string;
  target_audience?: string | null;
  image_url?: string | null;
  published: boolean;
  sort_order: number;
}

export interface CompetitionResultItem {
  id: string;
  championship_name: string;
  category: string;
  position: number;
  athlete_name: string;
  score?: string | null;
  event_date?: string | null;
  notes?: string | null;
  published: boolean;
  sort_order: number;
}

export interface GalleryPhotoItem {
  id: string;
  title: string;
  image_url: string;
  caption?: string | null;
  event_name?: string | null;
  published: boolean;
  sort_order: number;
}

export interface NewsArticleItem {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  body: string;
  cover_url?: string | null;
  published: boolean;
  published_at?: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  location?: string | null;
  starts_at?: string | null;
  registration_open: boolean;
  published: boolean;
}

export interface SponsorItem {
  id: string;
  name: string;
  logo_url?: string | null;
  website?: string | null;
  sort_order: number;
  published: boolean;
}

// ==========================================
// Conteúdos Padrão Oficiais da A.S.G.
// ==========================================

export const DEFAULT_PAGE_CONTENTS: Record<string, any> = {
  home: {
    hero: {
      eyebrow: "Guararema · SP",
      title: "Skate é comunidade.",
      description:
        "A Associação dos Skatistas de Guararema reúne quem anda, quem apoia e quem acredita no skate como ferramenta de transformação.",
      primaryCtaText: "Quero me associar",
      primaryCtaLink: "/associe-se",
      secondaryCtaText: "Conheça a A.S.G.",
      secondaryCtaLink: "/sobre",
    },
    pillars: [
      {
        title: "Comunidade",
        description: "Encontros, sessões coletivas e um espaço acolhedor para todas as idades.",
        icon: "Users",
      },
      {
        title: "Eventos",
        description: "Campeonatos, sessões abertas e encontros que fortalecem a cena local.",
        icon: "Trophy",
      },
      {
        title: "Projetos sociais",
        description: "Iniciativas educacionais que levam o skate a crianças e jovens de Guararema.",
        icon: "HeartHandshake",
      },
    ],
    ctaBanner: {
      title: "Faça parte da A.S.G.",
      description:
        "Envie sua solicitação. A diretoria analisa cada pedido e retorna com a aprovação.",
      buttonText: "Solicitar associação",
      buttonLink: "/associe-se",
    },
  },

  sobre: {
    hero: {
      eyebrow: "Quem somos",
      title: "Sobre a A.S.G.",
      description: "Uma associação feita por skatistas, para fortalecer o skate em Guararema.",
    },
    pillars: [
      {
        title: "Missão",
        description: "Promover o skate como esporte, cultura e ferramenta de inclusão social.",
      },
      {
        title: "Visão",
        description: "Uma cena local organizada, segura e acessível para todas as idades.",
      },
      {
        title: "Valores",
        description: "Respeito, coletividade, transparência e amor pelo carrinho.",
      },
    ],
    history: {
      title: "Nossa História",
      text: "A Associação dos Skatistas de Guararema (A.S.G.) nasceu da necessidade de organizar a cena local, zelar pela pista pública e representar os anseios dos skatistas junto à comunidade e órgãos públicos. Desenvolvemos atividades sociais, esportivas e culturais sem fins lucrativos.",
    },
    board: {
      title: "Diretoria e Governança",
      members:
        "Diretoria Executiva, Conselho Fiscal e Coordenadores de Projetos dedicados à gestão transparente, inclusiva e democrática.",
    },
  },

  projetos: {
    hero: {
      eyebrow: "Impacto",
      title: "Projetos sociais",
      description: "O skate como porta de entrada para educação, saúde e convivência.",
    },
  },

  noticias: {
    hero: {
      eyebrow: "Fique por dentro",
      title: "Notícias",
      description: "Novidades, comunicados e histórias da cena do skate em Guararema.",
    },
  },

  eventos: {
    hero: {
      eyebrow: "Agenda",
      title: "Eventos e campeonatos",
      description: "Agenda de sessões, eventos e campeonatos da A.S.G. em Guararema.",
    },
  },

  resultados: {
    hero: {
      eyebrow: "Pódio",
      title: "Resultados",
      description: "Classificações e resultados dos campeonatos organizados pela A.S.G.",
    },
  },

  galeria: {
    hero: {
      eyebrow: "Registros",
      title: "Galeria",
      description:
        "Fotos das sessões, eventos e projetos da Associação dos Skatistas de Guararema.",
    },
  },

  apoiadores: {
    hero: {
      eyebrow: "Juntos",
      title: "Apoiadores e parceiros",
      description: "Quem acredita no skate e fortalece a associação.",
    },
  },

  contato: {
    hero: {
      eyebrow: "Fale com a gente",
      title: "Contato",
      description: "Canais oficiais de atendimento da Associação dos Skatistas de Guararema.",
    },
    contactInfo: {
      email: "contato@asgskate.com.br",
      phone: "(11) 98765-4321",
      instagram: "@asg_skate_guararema",
      address: "Pista Pública de Skate de Guararema - Guararema, SP",
      hours: "Atendimento da diretoria aos finais de semana e sessões oficiais",
    },
    pix: {
      key: "contato@asgskate.com.br",
      keyType: "E-mail",
      recipientName: "Associação dos Skatistas de Guararema",
      bank: "Banco do Brasil / Cooperativa",
      message:
        "Sua doação ajuda a manter a pista municipal de skate, realizar oficinas gratuitas para iniciantes e apoiar nossos atletas.",
    },
  },

  auth: {
    hero: {
      eyebrow: "Conta A.S.G.",
      title: "Criar Conta & Autenticação",
      description:
        "Escolha seu tipo de conta: Skatista Local (para competir no Ranking Street ou Vert) ou Associado da A.S.G.",
    },
    signupTitle: "Criar Conta",
    signupDescription:
      "Escolha seu tipo de conta: Skatista Local (para competir no Ranking Street ou Vert) ou Associado da A.S.G.",
    loginTitle: "Entrar",
    loginDescription: "Acesse seu perfil de Skatista Local ou sua Área do Associado.",
    skaterCardTitle: "Skatista Local",
    skaterCardDescription:
      "Cria seu perfil esportivo público e vincula você às competições oficiais da A.S.G.",
    associateCardTitle: "Associado A.S.G.",
    associateCardDescription:
      "Perfil associativo exclusivo para membros e apoiadores da A.S.G. Não inclui no ranking competitivo.",
  },
};

// ==========================================
// Itens Padrão para Listas Dinâmicas
// ==========================================

export const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: "proj-1",
    title: "Escolinha de skate na pista",
    description:
      "Aulas gratuitas de iniciação ao skate com fornecimento de equipamentos e acompanhamento técnico para crianças e jovens.",
    category: "Social e Esportivo",
    target_audience: "Crianças de 6 a 15 anos",
    published: true,
    sort_order: 1,
  },
  {
    id: "proj-2",
    title: "Skate na Escola",
    description:
      "Palestras e oficinas itinerantes em escolas municipais e estaduais para incentivar o esporte e a cidadania.",
    category: "Educacional",
    target_audience: "Alunos da rede pública",
    published: true,
    sort_order: 2,
  },
  {
    id: "proj-3",
    title: "Arrecadação e Doação de Peças",
    description:
      "Campanha contínua de arrecadação de shapes, trucks, rodas e capacetes para montar skates para iniciantes sem condições financeiras.",
    category: "Comunitário",
    target_audience: "Comunidade local",
    published: true,
    sort_order: 3,
  },
];

export const DEFAULT_RESULTS: CompetitionResultItem[] = [
  {
    id: "res-1",
    championship_name: "1º Guararema Street Open",
    category: "Iniciante",
    position: 1,
    athlete_name: "Lucas Silva",
    score: "87.5",
    event_date: "2026-09-15",
    notes: "Destaque na volta com flips limpos no caixote",
    published: true,
    sort_order: 1,
  },
  {
    id: "res-2",
    championship_name: "1º Guararema Street Open",
    category: "Iniciante",
    position: 2,
    athlete_name: "Gabriel Santos",
    score: "84.2",
    event_date: "2026-09-15",
    notes: "Consistente nas manobras de corrimão",
    published: true,
    sort_order: 2,
  },
  {
    id: "res-3",
    championship_name: "1º Guararema Street Open",
    category: "Iniciante",
    position: 3,
    athlete_name: "Matheus Oliveira",
    score: "81.0",
    event_date: "2026-09-15",
    notes: "Melhor manobra no gap",
    published: true,
    sort_order: 3,
  },
  {
    id: "res-4",
    championship_name: "1º Guararema Street Open",
    category: "Amador",
    position: 1,
    athlete_name: "Renan Carvalho",
    score: "91.8",
    event_date: "2026-09-15",
    notes: "Campeão da categoria principal",
    published: true,
    sort_order: 4,
  },
];

export const DEFAULT_GALLERY: GalleryPhotoItem[] = [
  {
    id: "photo-1",
    title: "Sessão de inauguração dos novos obstáculos",
    image_url:
      "https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=800&q=80",
    caption: "Galera reunida na pista em tarde ensolarada de muito skate.",
    event_name: "Sessão Aberta",
    published: true,
    sort_order: 1,
  },
  {
    id: "photo-2",
    title: "Manobra no corrimão central",
    image_url:
      "https://images.unsplash.com/photo-1564982752979-3f7bc974d29a?auto=format&fit=crop&w=800&q=80",
    caption: "Registro do campeonato amador.",
    event_name: "Campeonato Local",
    published: true,
    sort_order: 2,
  },
  {
    id: "photo-3",
    title: "Alunos da escolinha recebendo seus primeiros skates",
    image_url:
      "https://images.unsplash.com/photo-1547447134-cd3f5c716030?auto=format&fit=crop&w=800&q=80",
    caption: "Entrega de materiais doados pela comunidade.",
    event_name: "Projeto Social",
    published: true,
    sort_order: 3,
  },
  {
    id: "photo-4",
    title: "Pódio do campeonato de skate",
    image_url:
      "https://images.unsplash.com/photo-1572776685608-724dc5a2427a?auto=format&fit=crop&w=800&q=80",
    caption: "Premiação dos atletas vencedores.",
    event_name: "Premiação",
    published: true,
    sort_order: 4,
  },
];

export const DEFAULT_NEWS: NewsArticleItem[] = [
  {
    id: "news-1",
    title: "A.S.G. realiza mutirão de revitalização na pista de skate",
    slug: "mutirao-revitalizacao-pista-guararema",
    summary:
      "Associados e voluntários se reuniram no último fim de semana para pintura, limpeza e pequenos reparos na pista pública.",
    body: "Com a participação de mais de 40 skatistas e moradores, realizamos a limpeza geral e pequenos reparos nos caixotes e transições. O material foi viabilizado através do apoio da comunidade e dos associados.",
    published: true,
    published_at: "2026-10-18T10:00:00Z",
  },
  {
    id: "news-2",
    title: "Inscrições abertas para o Campeonato Municipal de Street",
    slug: "campeonato-municipal-street-guararema",
    summary:
      "Evento oficial da associação com categorias Mirim, Iniciante e Amador. Vagas limitadas.",
    body: "A diretoria confirmou a data do próximo campeonato da A.S.G. Teremos premiação para os 3 primeiros colocados de cada categoria e medalhas de participação.",
    published: true,
    published_at: "2026-10-24T14:30:00Z",
  },
];

export const DEFAULT_EVENTS: EventItem[] = [
  {
    id: "event-1",
    title: "Sessão Aberta e Best Trick da A.S.G.",
    description:
      "Encontro aberto para todos os skatistas com premiação para as melhores manobras no caixote grande.",
    location: "Pista Pública de Skate de Guararema",
    starts_at: "2026-11-15T14:00:00Z",
    registration_open: true,
    published: true,
  },
  {
    id: "event-2",
    title: "Campeonato Amador de Skate Street",
    description: "Competição oficial valendo pontos para o ranking local da associação.",
    location: "Complexo Esportivo Municipal",
    starts_at: "2026-12-05T09:00:00Z",
    registration_open: true,
    published: true,
  },
];

export const DEFAULT_SPONSORS: SponsorItem[] = [
  {
    id: "spon-1",
    name: "Guararema Skate Shop",
    website: "https://instagram.com",
    sort_order: 1,
    published: true,
  },
  {
    id: "spon-2",
    name: "Street Wear Co.",
    website: "https://instagram.com",
    sort_order: 2,
    published: true,
  },
  {
    id: "spon-3",
    name: "Padaria do Parque",
    website: "https://instagram.com",
    sort_order: 3,
    published: true,
  },
  {
    id: "spon-4",
    name: "Açaí dos Skatistas",
    website: "https://instagram.com",
    sort_order: 4,
    published: true,
  },
];

// ==========================================
// Segurança: Validação de URLs e Permissão de Diretoria
// ==========================================

export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function safeImageUrl(url: string | null | undefined, fallback = ""): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return safeExternalUrl(trimmed) ?? fallback;
}

export async function uploadGalleryPhoto(file: File): Promise<string> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Formato não suportado. Envie imagens JPG, PNG ou WebP.");
  }
  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxBytes) {
    throw new Error("A imagem deve ter no máximo 10MB.");
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 30);
  const path = `album-${Date.now()}-${cleanName}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage.from("gallery").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from("gallery").getPublicUrl(path);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Storage gallery upload fallback:", err);
  }

  // Fallback seguro em alta definição para exibição em tela cheia no álbum
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo da imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem corrompido ou inválido."));
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.88));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function safeInternalLink(link: string | null | undefined, fallback = "/"): string {
  if (!link) return fallback;
  const trimmed = link.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return fallback;
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const msg = String(error.message || "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("Could not find the table") ||
    msg.includes("relation")
  );
}

async function assertDiretoriaAccess(): Promise<string> {
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const user = authData?.user;
  if (authErr || !user) {
    throw new Error("Acesso negado: faça login com uma conta da diretoria.");
  }
  const { data: isDir, error: roleErr } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "diretoria",
  });
  if (roleErr || !isDir) {
    throw new Error("Acesso negado: somente a diretoria autorizada pode alterar páginas do site.");
  }
  return user.id;
}

// ==========================================
// Helpers de Armazenamento Local Persistente (Offline/Fallback)
// ==========================================

function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(`asg_cms_${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`asg_cms_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn("CMS localStorage error:", err);
  }
}

// ==========================================
// Hooks do React Query para Páginas do Site (100% sincronizado com Supabase)
// ==========================================

export function usePageContent<T>(
  pageSlug: string,
  sectionKey = "main",
): { content: T; isLoading: boolean } {
  const defaultVal = DEFAULT_PAGE_CONTENTS[pageSlug] as T;

  const { data, isLoading } = useQuery({
    queryKey: ["site-content", pageSlug, sectionKey],
    queryFn: async (): Promise<T> => {
      try {
        const { data, error } = await (supabase as any)
          .from("site_content")
          .select("content")
          .eq("page_slug", pageSlug)
          .eq("section_key", sectionKey)
          .maybeSingle();

        if (error) {
          if (isMissingTableError(error)) {
            return getLocalItem<T>(`page_${pageSlug}_${sectionKey}`, defaultVal);
          }
          return defaultVal;
        }
        if (!data) {
          return defaultVal;
        }

        const merged = { ...defaultVal, ...(data.content as any) };
        setLocalItem(`page_${pageSlug}_${sectionKey}`, merged);
        return merged;
      } catch {
        return defaultVal;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return {
    content: (data ?? defaultVal) as T,
    isLoading,
  };
}

export function useSavePageContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pageSlug,
      sectionKey = "main",
      content,
    }: {
      pageSlug: string;
      sectionKey?: string;
      content: any;
    }) => {
      const userId = await assertDiretoriaAccess();

      const { error } = await (supabase as any).from("site_content").upsert(
        {
          page_slug: pageSlug,
          section_key: sectionKey,
          content,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_slug,section_key" },
      );

      if (error) {
        throw new Error(error.message || "Não foi possível salvar o conteúdo da página no banco de dados.");
      }

      setLocalItem(`page_${pageSlug}_${sectionKey}`, content);
      return content;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["site-content", vars.pageSlug, vars.sectionKey ?? "main"],
      });
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
  });
}

// ==========================================
// Hooks para Projetos Sociais
// ==========================================

export function useProjects() {
  return useQuery({
    queryKey: ["site-projects"],
    queryFn: async (): Promise<ProjectItem[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from("site_projects")
          .select("*")
          .order("sort_order", { ascending: true });

        if (error) {
          if (isMissingTableError(error)) {
            return getLocalItem<ProjectItem[]>("projects", DEFAULT_PROJECTS);
          }
          return DEFAULT_PROJECTS;
        }
        const items = (data ?? []) as ProjectItem[];
        setLocalItem("projects", items);
        return items;
      } catch {
        return DEFAULT_PROJECTS;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Partial<ProjectItem> & { title: string; description: string }) => {
      const userId = await assertDiretoriaAccess();
      const current = getLocalItem<ProjectItem[]>("projects", []);
      const cleanImageUrl = project.image_url ? safeImageUrl(project.image_url) || null : null;

      const payload = {
        title: project.title.trim(),
        description: project.description.trim(),
        category: (project.category || "Social").trim(),
        target_audience: project.target_audience?.trim() || null,
        image_url: cleanImageUrl,
        published: project.published ?? true,
        sort_order: project.sort_order ?? current.length + 1,
      };

      let savedId = project.id || "";
      if (project.id && !project.id.startsWith("proj-")) {
        const { error } = await (supabase as any)
          .from("site_projects")
          .update(payload)
          .eq("id", project.id);
        if (error) {
          throw new Error(error.message || "Não foi possível atualizar o projeto no banco de dados.");
        }
      } else {
        const { data, error } = await (supabase as any)
          .from("site_projects")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) {
          throw new Error(error.message || "Não foi possível cadastrar o projeto no banco de dados.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: ProjectItem = { id: savedId, ...payload };
      return itemToSave;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-projects"] }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertDiretoriaAccess();
      if (!id.startsWith("proj-")) {
        const { error } = await (supabase as any).from("site_projects").delete().eq("id", id);
        if (error) {
          throw new Error(error.message || "Não foi possível excluir o projeto do banco de dados.");
        }
      }
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-projects"] }),
  });
}

// ==========================================
// Hooks para Resultados de Campeonatos
// ==========================================

export function useCompetitionResults() {
  return useQuery({
    queryKey: ["competition-results"],
    queryFn: async (): Promise<CompetitionResultItem[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from("competition_results")
          .select("*")
          .order("position", { ascending: true });

        if (error) {
          if (isMissingTableError(error)) {
            return getLocalItem<CompetitionResultItem[]>("results", DEFAULT_RESULTS);
          }
          return DEFAULT_RESULTS;
        }
        const items = (data ?? []) as CompetitionResultItem[];
        setLocalItem("results", items);
        return items;
      } catch {
        return DEFAULT_RESULTS;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSaveCompetitionResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      res: Partial<CompetitionResultItem> & {
        championship_name: string;
        category: string;
        position: number;
        athlete_name: string;
      },
    ) => {
      const userId = await assertDiretoriaAccess();
      const payload = {
        championship_name: res.championship_name.trim(),
        category: res.category.trim(),
        position: Math.max(1, Math.floor(Number(res.position) || 1)),
        athlete_name: res.athlete_name.trim(),
        score: res.score?.trim() || null,
        event_date: res.event_date || null,
        notes: res.notes?.trim() || null,
        published: res.published ?? true,
        sort_order: res.sort_order ?? res.position,
      };

      let savedId = res.id || "";
      if (res.id && !res.id.startsWith("res-")) {
        const { error } = await (supabase as any)
          .from("competition_results")
          .update(payload)
          .eq("id", res.id);
        if (error) {
          throw new Error(error.message || "Não foi possível atualizar o resultado no banco de dados.");
        }
      } else {
        const { data, error } = await (supabase as any)
          .from("competition_results")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) {
          throw new Error(error.message || "Não foi possível cadastrar o resultado no banco de dados.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: CompetitionResultItem = { id: savedId, ...payload };
      return itemToSave;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["competition-results"] }),
  });
}

export function useDeleteCompetitionResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertDiretoriaAccess();
      if (!id.startsWith("res-")) {
        const { error } = await (supabase as any).from("competition_results").delete().eq("id", id);
        if (error) {
          throw new Error(error.message || "Não foi possível excluir o resultado do banco de dados.");
        }
      }
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["competition-results"] }),
  });
}

// ==========================================
// Hooks para Fotos da Galeria
// ==========================================

export function useGalleryPhotos() {
  return useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async (): Promise<GalleryPhotoItem[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from("gallery_photos")
          .select("*")
          .order("sort_order", { ascending: true });

        if (error) {
          if (isMissingTableError(error)) {
            return getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
          }
          return DEFAULT_GALLERY;
        }
        const items = (data ?? []) as GalleryPhotoItem[];
        setLocalItem("gallery", items);
        return items;
      } catch {
        return DEFAULT_GALLERY;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSaveGalleryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: Partial<GalleryPhotoItem> & { title: string; image_url: string }) => {
      const userId = await assertDiretoriaAccess();
      const validImageUrl = safeImageUrl(photo.image_url);
      if (!validImageUrl) {
        throw new Error("Informe uma imagem válida (upload do dispositivo ou URL https://).");
      }
      const current = getLocalItem<GalleryPhotoItem[]>("gallery", []);
      const payload = {
        title: photo.title.trim(),
        image_url: validImageUrl,
        caption: photo.caption?.trim() || null,
        event_name: photo.event_name?.trim() || null,
        published: photo.published ?? true,
        sort_order: photo.sort_order ?? current.length + 1,
      };

      let savedId = photo.id || "";
      if (photo.id && !photo.id.startsWith("photo-")) {
        const { error } = await (supabase as any)
          .from("gallery_photos")
          .update(payload)
          .eq("id", photo.id);
        if (error) {
          throw new Error(error.message || "Não foi possível atualizar a foto no banco de dados.");
        }
      } else {
        const { data, error } = await (supabase as any)
          .from("gallery_photos")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) {
          throw new Error(error.message || "Não foi possível salvar a foto no banco de dados.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: GalleryPhotoItem = { id: savedId, ...payload };
      return itemToSave;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gallery-photos"] }),
  });
}

export function useDeleteGalleryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertDiretoriaAccess();
      if (!id.startsWith("photo-")) {
        const { error } = await (supabase as any).from("gallery_photos").delete().eq("id", id);
        if (error) {
          throw new Error(error.message || "Não foi possível excluir a foto do banco de dados.");
        }
      }
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gallery-photos"] }),
  });
}

// ==========================================
// Hooks para Notícias (usando tabela news_articles)
// ==========================================

export function useNewsArticles() {
  return useQuery({
    queryKey: ["news-articles"],
    queryFn: async (): Promise<NewsArticleItem[]> => {
      try {
        const { data, error } = await supabase
          .from("news_articles")
          .select("id, title, slug, summary, body, cover_url, published, published_at")
          .order("published_at", { ascending: false });

        if (error) {
          return DEFAULT_NEWS;
        }
        const items = (data ?? []) as NewsArticleItem[];
        setLocalItem("news", items);
        return items;
      } catch {
        return DEFAULT_NEWS;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSaveNewsArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (article: Partial<NewsArticleItem> & { title: string; body: string }) => {
      const userId = await assertDiretoriaAccess();
      const baseSlug =
        article.slug ||
        article.title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 100);
      const slug = baseSlug || `noticia-${Date.now()}`;
      const cleanCover = article.cover_url ? safeImageUrl(article.cover_url) || null : null;

      const payload = {
        title: article.title.trim(),
        slug,
        summary: article.summary?.trim() || null,
        body: article.body.trim(),
        cover_url: cleanCover,
        published: article.published ?? true,
        published_at: article.published_at || new Date().toISOString(),
      };

      let savedId = article.id || "";
      if (article.id && !article.id.startsWith("news-")) {
        const { error } = await supabase.from("news_articles").update(payload).eq("id", article.id);
        if (error) {
          throw new Error(error.message || "Não foi possível atualizar a notícia no banco de dados.");
        }
      } else {
        const { data, error } = await supabase
          .from("news_articles")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) {
          throw new Error(error.message || "Não foi possível publicar a notícia no banco de dados.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: NewsArticleItem = { id: savedId, ...payload };
      return itemToSave;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news-articles"] }),
  });
}

export function useDeleteNewsArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertDiretoriaAccess();
      if (!id.startsWith("news-")) {
        const { error } = await supabase.from("news_articles").delete().eq("id", id);
        if (error) {
          throw new Error(error.message || "Não foi possível excluir a notícia do banco de dados.");
        }
      }
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news-articles"] }),
  });
}

// ==========================================
// Hooks para Eventos (usando tabela events)
// ==========================================

export function useSiteEvents() {
  return useQuery({
    queryKey: ["site-events"],
    queryFn: async (): Promise<EventItem[]> => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("id, title, description, location, starts_at, registration_open, published")
          .order("starts_at", { ascending: true });

        if (error) {
          return DEFAULT_EVENTS;
        }
        const items = (data ?? []) as EventItem[];
        setLocalItem("events", items);
        return items;
      } catch {
        return DEFAULT_EVENTS;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSaveSiteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Partial<EventItem> & { title: string; description: string }) => {
      const userId = await assertDiretoriaAccess();
      const payload = {
        title: event.title.trim(),
        description: event.description.trim(),
        location: event.location?.trim() || null,
        starts_at: event.starts_at || null,
        registration_open: event.registration_open ?? false,
        published: event.published ?? true,
      };

      let savedId = event.id || "";
      if (event.id && !event.id.startsWith("event-")) {
        const { error } = await supabase.from("events").update(payload).eq("id", event.id);
        if (error) {
          throw new Error(error.message || "Não foi possível atualizar o evento no banco de dados.");
        }
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) {
          throw new Error(error.message || "Não foi possível cadastrar o evento no banco de dados.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: EventItem = { id: savedId, ...payload };
      return itemToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });
}

export function useDeleteSiteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertDiretoriaAccess();
      if (!id.startsWith("event-")) {
        const { error } = await supabase.from("events").delete().eq("id", id);
        if (error) {
          throw new Error(error.message || "Não foi possível excluir o evento do banco de dados.");
        }
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });
}

// ==========================================
// Hooks para Apoiadores (usando tabela sponsors)
// ==========================================

export function useSponsors() {
  return useQuery({
    queryKey: ["site-sponsors"],
    queryFn: async (): Promise<SponsorItem[]> => {
      try {
        const { data, error } = await supabase
          .from("sponsors")
          .select("id, name, logo_url, website, sort_order, published")
          .order("sort_order", { ascending: true });

        if (error) {
          return DEFAULT_SPONSORS;
        }
        const items = (data ?? []) as SponsorItem[];
        setLocalItem("sponsors", items);
        return items;
      } catch {
        return DEFAULT_SPONSORS;
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useSaveSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sponsor: Partial<SponsorItem> & { name: string }) => {
      await assertDiretoriaAccess();
      const current = getLocalItem<SponsorItem[]>("sponsors", []);
      const cleanWebsite = sponsor.website ? safeExternalUrl(sponsor.website) : null;
      if (sponsor.website && !cleanWebsite) {
        throw new Error("Informe um website válido iniciado por https:// ou http://.");
      }
      const cleanLogo = sponsor.logo_url ? safeImageUrl(sponsor.logo_url) || null : null;

      const payload = {
        name: sponsor.name.trim(),
        logo_url: cleanLogo,
        website: cleanWebsite,
        sort_order: sponsor.sort_order ?? current.length + 1,
        published: sponsor.published ?? true,
      };

      let savedId = sponsor.id || "";
      if (sponsor.id && !sponsor.id.startsWith("spon-")) {
        const { error } = await supabase.from("sponsors").update(payload).eq("id", sponsor.id);
        if (error) {
          throw new Error(error.message || "Não foi possível atualizar o apoiador no banco de dados.");
        }
      } else {
        const { data, error } = await supabase
          .from("sponsors")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          throw new Error(error.message || "Não foi possível cadastrar o apoiador no banco de dados.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: SponsorItem = { id: savedId, ...payload };
      return itemToSave;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-sponsors"] }),
  });
}

export function useDeleteSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertDiretoriaAccess();
      if (!id.startsWith("spon-")) {
        const { error } = await supabase.from("sponsors").delete().eq("id", id);
        if (error) {
          throw new Error(error.message || "Não foi possível remover o apoiador do banco de dados.");
        }
      }
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-sponsors"] }),
  });
}
