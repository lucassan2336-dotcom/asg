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

export interface GalleryAlbumItem {
  id: string;
  name: string;
  description?: string | null;
  cover_url?: string | null;
  created_at?: string;
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

async function resizeGalleryImageToDataUrl(file: File, maxDim = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo da imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem corrompido ou inválido."));
      img.onload = () => {
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
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
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

  let uploadBlob: Blob = file;
  let ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  let contentType = file.type;

  if (file.size > 2.2 * 1024 * 1024) {
    try {
      const dataUrl = await resizeGalleryImageToDataUrl(file, 1600);
      const res = await fetch(dataUrl);
      uploadBlob = await res.blob();
      ext = "jpg";
      contentType = "image/jpeg";
    } catch {
      uploadBlob = file;
    }
  }

  const baseName =
    file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 24) || "foto";
  const path = `album-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${baseName}.${ext}`;

  try {
    // 1. Tenta enviar para o bucket dedicado 'gallery'
    const { error: uploadError } = await supabase.storage.from("gallery").upload(path, uploadBlob, {
      cacheControl: "3600",
      upsert: true,
      contentType,
    });

    if (!uploadError) {
      const { data } = supabase.storage.from("gallery").getPublicUrl(path);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }

    // 2. Fallback automático para o bucket público 'avatars' na pasta do usuário autenticado
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (userId) {
      const userGalleryPath = `${userId}/gallery-${path}`;
      const { error: fallbackUploadErr } = await supabase.storage
        .from("avatars")
        .upload(userGalleryPath, uploadBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType,
        });
      if (!fallbackUploadErr) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(userGalleryPath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      }
    }
  } catch (err) {
    console.warn("Storage gallery upload fallback:", err);
  }

  // 3. Fallback seguro em alta definição
  return resizeGalleryImageToDataUrl(file, 1600);
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
// Hooks do React Query para Páginas do Site
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
    staleTime: 60_000,
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

      if (error && !isMissingTableError(error)) {
        throw new Error("Não foi possível salvar o conteúdo da página.");
      }

      setLocalItem(`page_${pageSlug}_${sectionKey}`, content);
      return content;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["site-content", vars.pageSlug, vars.sectionKey ?? "main"],
      });
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
        if (!data || data.length === 0) {
          return DEFAULT_PROJECTS;
        }
        setLocalItem("projects", data);
        return data as ProjectItem[];
      } catch {
        return DEFAULT_PROJECTS;
      }
    },
  });
}

export function useSaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Partial<ProjectItem> & { title: string; description: string }) => {
      await assertDiretoriaAccess();
      const current = getLocalItem<ProjectItem[]>("projects", DEFAULT_PROJECTS);
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

      let savedId = project.id || `proj-${Date.now()}`;
      if (project.id && !project.id.startsWith("proj-")) {
        const { error } = await (supabase as any)
          .from("site_projects")
          .update(payload)
          .eq("id", project.id);
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível atualizar o projeto.");
        }
      } else {
        const { data, error } = await (supabase as any)
          .from("site_projects")
          .insert(payload)
          .select("id")
          .single();
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível cadastrar o projeto.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: ProjectItem = { id: savedId, ...payload };
      const updated = current.some((p) => p.id === project.id || p.id === savedId)
        ? current.map((p) => (p.id === project.id || p.id === savedId ? itemToSave : p))
        : [...current, itemToSave];

      setLocalItem("projects", updated);
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
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível excluir o projeto.");
        }
      }
      const current = getLocalItem<ProjectItem[]>("projects", DEFAULT_PROJECTS);
      setLocalItem(
        "projects",
        current.filter((p) => p.id !== id),
      );
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
        if (!data || data.length === 0) {
          return DEFAULT_RESULTS;
        }
        setLocalItem("results", data);
        return data as CompetitionResultItem[];
      } catch {
        return DEFAULT_RESULTS;
      }
    },
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
      await assertDiretoriaAccess();
      const current = getLocalItem<CompetitionResultItem[]>("results", DEFAULT_RESULTS);
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

      let savedId = res.id || `res-${Date.now()}`;
      if (res.id && !res.id.startsWith("res-")) {
        const { error } = await (supabase as any)
          .from("competition_results")
          .update(payload)
          .eq("id", res.id);
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível atualizar o resultado.");
        }
      } else {
        const { data, error } = await (supabase as any)
          .from("competition_results")
          .insert(payload)
          .select("id")
          .single();
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível cadastrar o resultado.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: CompetitionResultItem = { id: savedId, ...payload };
      const updated = current.some((r) => r.id === res.id || r.id === savedId)
        ? current.map((r) => (r.id === res.id || r.id === savedId ? itemToSave : r))
        : [...current, itemToSave];

      setLocalItem("results", updated);
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
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível excluir o resultado.");
        }
      }
      const current = getLocalItem<CompetitionResultItem[]>("results", DEFAULT_RESULTS);
      setLocalItem(
        "results",
        current.filter((r) => r.id !== id),
      );
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["competition-results"] }),
  });
}

// ==========================================
// Hooks para Fotos da Galeria e Álbuns
// ==========================================

export function getAlbumCoverPhoto(albumPhotos: GalleryPhotoItem[]): GalleryPhotoItem | null {
  if (!albumPhotos || albumPhotos.length === 0) return null;
  const explicitCover = albumPhotos.find((p) => (p.sort_order ?? 0) < 0);
  return explicitCover ?? albumPhotos[0] ?? null;
}

export function isAlbumCoverPhoto(
  photo: GalleryPhotoItem,
  albumPhotos: GalleryPhotoItem[],
): boolean {
  const cover = getAlbumCoverPhoto(albumPhotos);
  return Boolean(cover && cover.id === photo.id);
}

export function useGalleryAlbums() {
  return useQuery({
    queryKey: ["gallery-albums-meta"],
    queryFn: async (): Promise<GalleryAlbumItem[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from("site_content")
          .select("content")
          .eq("page_slug", "galeria")
          .eq("section_key", "albums")
          .maybeSingle();

        if (!error && data?.content && Array.isArray((data.content as any).items)) {
          const items = (data.content as any).items as GalleryAlbumItem[];
          setLocalItem("gallery_albums", items);
          return items;
        }
        return getLocalItem<GalleryAlbumItem[]>("gallery_albums", []);
      } catch {
        return getLocalItem<GalleryAlbumItem[]>("gallery_albums", []);
      }
    },
  });
}

export function useSaveGalleryAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      oldName?: string | null;
      name: string;
      description?: string | null;
      coverUrl?: string | null;
      initialPhotos?: Array<{
        title: string;
        image_url: string;
        caption?: string | null;
        is_cover?: boolean;
      }>;
    }) => {
      const userId = await assertDiretoriaAccess();
      const cleanName = params.name.trim().slice(0, 120);
      if (cleanName.length < 2) {
        throw new Error("Informe um nome válido para o álbum (mínimo de 2 caracteres).");
      }

      const cleanDesc = params.description?.trim().slice(0, 400) || null;
      const cleanCover = params.coverUrl ? safeImageUrl(params.coverUrl) || null : null;

      // 1. Ler álbuns existentes em site_content
      const currentAlbums = getLocalItem<GalleryAlbumItem[]>("gallery_albums", []);
      let remoteAlbums: GalleryAlbumItem[] = currentAlbums;
      try {
        const { data } = await (supabase as any)
          .from("site_content")
          .select("content")
          .eq("page_slug", "galeria")
          .eq("section_key", "albums")
          .maybeSingle();
        if (data?.content && Array.isArray((data.content as any).items)) {
          remoteAlbums = (data.content as any).items as GalleryAlbumItem[];
        }
      } catch {
        // usa cache local
      }

      const targetOldName = params.oldName?.trim() || null;
      const existingIdx = remoteAlbums.findIndex(
        (a) =>
          a.name.toLowerCase() === (targetOldName || cleanName).toLowerCase() ||
          a.name.toLowerCase() === cleanName.toLowerCase(),
      );

      const albumEntry: GalleryAlbumItem = {
        id: existingIdx >= 0 ? remoteAlbums[existingIdx]!.id : `album-${Date.now()}`,
        name: cleanName,
        description: cleanDesc,
        cover_url: cleanCover ?? (existingIdx >= 0 ? remoteAlbums[existingIdx]!.cover_url : null),
        created_at:
          existingIdx >= 0 ? remoteAlbums[existingIdx]!.created_at : new Date().toISOString(),
      };

      const nextAlbums =
        existingIdx >= 0
          ? remoteAlbums.map((a, idx) => (idx === existingIdx ? albumEntry : a))
          : [albumEntry, ...remoteAlbums];

      await (supabase as any).from("site_content").upsert(
        {
          page_slug: "galeria",
          section_key: "albums",
          content: { items: nextAlbums },
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_slug,section_key" },
      );
      setLocalItem("gallery_albums", nextAlbums);

      // 2. Se renomeou um álbum existente, atualizar event_name nas fotos do álbum
      if (targetOldName && targetOldName !== cleanName) {
        await (supabase as any)
          .from("gallery_photos")
          .update({ event_name: cleanName })
          .eq("event_name", targetOldName);

        const localPhotos = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
        setLocalItem(
          "gallery",
          localPhotos.map((p) =>
            p.event_name?.trim() === targetOldName ? { ...p, event_name: cleanName } : p,
          ),
        );
      }

      // 3. Se enviou fotos iniciais ao criar/editar o álbum, inserir em gallery_photos
      const photosToInsert = params.initialPhotos ?? [];
      if (photosToInsert.length > 0) {
        const localPhotos = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
        const hasCoverInBatch = photosToInsert.some((p) => p.is_cover);
        if (hasCoverInBatch) {
          await (supabase as any)
            .from("gallery_photos")
            .update({ sort_order: 1 })
            .eq("event_name", cleanName)
            .lt("sort_order", 0);
        }

        const rows = photosToInsert.map((p, idx) => ({
          title: p.title.trim().slice(0, 160) || `${cleanName} - Foto ${idx + 1}`,
          image_url: safeImageUrl(p.image_url),
          caption: p.caption?.trim().slice(0, 500) || cleanDesc || null,
          event_name: cleanName,
          published: true,
          sort_order: p.is_cover ? -1 : localPhotos.length + idx + 1,
        }));

        const { data: insertedData } = await (supabase as any)
          .from("gallery_photos")
          .insert(rows)
          .select("*");

        const savedPhotos: GalleryPhotoItem[] =
          Array.isArray(insertedData) && insertedData.length > 0
            ? (insertedData as GalleryPhotoItem[])
            : rows.map((r, i) => ({ id: `photo-${Date.now()}-${i}`, ...r }));

        setLocalItem("gallery", [...localPhotos, ...savedPhotos]);
      } else if (cleanCover) {
        // Garantir que se enviou apenas uma capa avulsa para um álbum vazio, ela também exista como foto do álbum
        const { data: existingAlbumPhotos } = await (supabase as any)
          .from("gallery_photos")
          .select("id, image_url")
          .eq("event_name", cleanName);

        if (!existingAlbumPhotos || existingAlbumPhotos.length === 0) {
          const coverRow = {
            title: cleanName,
            image_url: cleanCover,
            caption: cleanDesc,
            event_name: cleanName,
            published: true,
            sort_order: -1,
          };
          const { data: insertedCover } = await (supabase as any)
            .from("gallery_photos")
            .insert(coverRow)
            .select("*")
            .maybeSingle();

          const localPhotos = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
          setLocalItem("gallery", [
            ...localPhotos,
            (insertedCover as GalleryPhotoItem) || { id: `photo-${Date.now()}`, ...coverRow },
          ]);
        }
      }

      return albumEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-albums-meta"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
    },
  });
}

export function useDeleteGalleryAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (albumName: string) => {
      const userId = await assertDiretoriaAccess();
      const cleanName = albumName.trim();

      // 1. Remover fotos daquele álbum no banco
      if (cleanName === "Registros Gerais A.S.G.") {
        await (supabase as any).from("gallery_photos").delete().is("event_name", null);
      } else {
        await (supabase as any).from("gallery_photos").delete().eq("event_name", cleanName);
      }

      // 2. Remover metadados do álbum em site_content
      const currentAlbums = getLocalItem<GalleryAlbumItem[]>("gallery_albums", []);
      const filteredAlbums = currentAlbums.filter(
        (a) => a.name.trim().toLowerCase() !== cleanName.toLowerCase(),
      );
      await (supabase as any).from("site_content").upsert(
        {
          page_slug: "galeria",
          section_key: "albums",
          content: { items: filteredAlbums },
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "page_slug,section_key" },
      );
      setLocalItem("gallery_albums", filteredAlbums);

      const currentPhotos = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
      setLocalItem(
        "gallery",
        currentPhotos.filter(
          (p) => (p.event_name?.trim() || "Registros Gerais A.S.G.") !== cleanName,
        ),
      );
      return cleanName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-albums-meta"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
    },
  });
}

export function useGalleryPhotos() {
  return useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async (): Promise<GalleryPhotoItem[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from("gallery_photos")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) {
          if (isMissingTableError(error)) {
            return getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
          }
          return DEFAULT_GALLERY;
        }
        if (!data || data.length === 0) {
          return DEFAULT_GALLERY;
        }
        setLocalItem("gallery", data);
        return data as GalleryPhotoItem[];
      } catch {
        return DEFAULT_GALLERY;
      }
    },
  });
}

export function useSaveGalleryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      photo: Partial<GalleryPhotoItem> & {
        title: string;
        image_url: string;
        is_cover?: boolean;
      },
    ) => {
      await assertDiretoriaAccess();
      const validImageUrl = safeImageUrl(photo.image_url);
      if (!validImageUrl) {
        throw new Error("Informe uma URL de imagem válida (https://).");
      }
      const current = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
      const cleanEvent = photo.event_name?.trim() || null;

      if (photo.is_cover && cleanEvent) {
        await (supabase as any)
          .from("gallery_photos")
          .update({ sort_order: 1 })
          .eq("event_name", cleanEvent)
          .lt("sort_order", 0);
      }

      const payload = {
        title: photo.title.trim(),
        image_url: validImageUrl,
        caption: photo.caption?.trim() || null,
        event_name: cleanEvent,
        published: photo.published ?? true,
        sort_order: photo.is_cover ? -1 : (photo.sort_order ?? current.length + 1),
      };

      let savedId = photo.id || `photo-${Date.now()}`;
      if (photo.id && !photo.id.startsWith("photo-")) {
        const { error } = await (supabase as any)
          .from("gallery_photos")
          .update(payload)
          .eq("id", photo.id);
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível atualizar a foto.");
        }
      } else {
        const { data, error } = await (supabase as any)
          .from("gallery_photos")
          .insert(payload)
          .select("id")
          .single();
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível adicionar a foto.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: GalleryPhotoItem = { id: savedId, ...payload };
      const normalizedCurrent =
        photo.is_cover && cleanEvent
          ? current.map((p) =>
              p.event_name?.trim() === cleanEvent && (p.sort_order ?? 0) < 0
                ? { ...p, sort_order: 1 }
                : p,
            )
          : current;

      const updated = normalizedCurrent.some((p) => p.id === photo.id || p.id === savedId)
        ? normalizedCurrent.map((p) => (p.id === photo.id || p.id === savedId ? itemToSave : p))
        : [...normalizedCurrent, itemToSave];

      setLocalItem("gallery", updated);
      return itemToSave;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gallery-photos"] }),
  });
}

export function useSaveMultipleGalleryPhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      items: Array<{
        title: string;
        image_url: string;
        caption?: string | null;
        event_name?: string | null;
        published?: boolean;
        is_cover?: boolean;
      }>;
    }) => {
      await assertDiretoriaAccess();
      const { items } = params;
      if (!items.length) {
        throw new Error("Selecione pelo menos uma foto para enviar ao álbum.");
      }

      const current = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
      const coverItem = items.find((i) => i.is_cover && i.event_name?.trim());
      if (coverItem?.event_name?.trim()) {
        await (supabase as any)
          .from("gallery_photos")
          .update({ sort_order: 1 })
          .eq("event_name", coverItem.event_name.trim())
          .lt("sort_order", 0);
      }

      const rowsToInsert = items.map((item, idx) => {
        const validImageUrl = safeImageUrl(item.image_url);
        if (!validImageUrl) {
          throw new Error(`URL de imagem inválida na foto "${item.title}".`);
        }
        return {
          title: item.title.trim().slice(0, 160) || `Foto ${idx + 1}`,
          image_url: validImageUrl,
          caption: item.caption?.trim().slice(0, 500) || null,
          event_name: item.event_name?.trim().slice(0, 120) || null,
          published: item.published ?? true,
          sort_order: item.is_cover ? -1 : current.length + idx + 1,
        };
      });

      const { data, error } = await (supabase as any)
        .from("gallery_photos")
        .insert(rowsToInsert)
        .select("*");

      if (error && !isMissingTableError(error)) {
        throw new Error("Não foi possível salvar as fotos selecionadas no álbum.");
      }

      const savedItems: GalleryPhotoItem[] =
        Array.isArray(data) && data.length > 0
          ? (data as GalleryPhotoItem[])
          : rowsToInsert.map((r, i) => ({
              id: `photo-${Date.now()}-${i}`,
              ...r,
            }));

      setLocalItem("gallery", [...current, ...savedItems]);
      return savedItems;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gallery-photos"] }),
  });
}

export function useSetAlbumCover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      photoId,
      eventName,
      imageUrl,
    }: {
      photoId: string;
      eventName?: string | null;
      imageUrl?: string | null;
    }) => {
      const userId = await assertDiretoriaAccess();
      const cleanEvent = eventName?.trim() || null;

      if (cleanEvent) {
        await (supabase as any)
          .from("gallery_photos")
          .update({ sort_order: 1 })
          .eq("event_name", cleanEvent)
          .lt("sort_order", 0);
      } else {
        await (supabase as any)
          .from("gallery_photos")
          .update({ sort_order: 1 })
          .is("event_name", null)
          .lt("sort_order", 0);
      }

      if (!photoId.startsWith("photo-")) {
        const { error } = await (supabase as any)
          .from("gallery_photos")
          .update({ sort_order: -1 })
          .eq("id", photoId);
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível definir a capa do álbum.");
        }
      }

      if (cleanEvent && imageUrl) {
        const currentAlbums = getLocalItem<GalleryAlbumItem[]>("gallery_albums", []);
        const idx = currentAlbums.findIndex(
          (a) => a.name.trim().toLowerCase() === cleanEvent.toLowerCase(),
        );
        if (idx >= 0) {
          const updatedAlbums = currentAlbums.map((a, i) =>
            i === idx ? { ...a, cover_url: imageUrl } : a,
          );
          setLocalItem("gallery_albums", updatedAlbums);
          await (supabase as any).from("site_content").upsert(
            {
              page_slug: "galeria",
              section_key: "albums",
              content: { items: updatedAlbums },
              updated_by: userId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "page_slug,section_key" },
          );
        }
      }

      const current = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
      const updated = current.map((p) => {
        const sameAlbum = (p.event_name?.trim() || null) === cleanEvent;
        if (p.id === photoId) return { ...p, sort_order: -1 };
        if (sameAlbum && (p.sort_order ?? 0) < 0) return { ...p, sort_order: 1 };
        return p;
      });
      setLocalItem("gallery", updated);
      return photoId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-albums-meta"] });
    },
  });
}

export function useDeleteGalleryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await assertDiretoriaAccess();
      if (!id.startsWith("photo-")) {
        const { error } = await (supabase as any).from("gallery_photos").delete().eq("id", id);
        if (error && !isMissingTableError(error)) {
          throw new Error("Não foi possível excluir a foto.");
        }
      }
      const current = getLocalItem<GalleryPhotoItem[]>("gallery", DEFAULT_GALLERY);
      setLocalItem(
        "gallery",
        current.filter((p) => p.id !== id),
      );
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

        if (error || !data || data.length === 0) {
          return DEFAULT_NEWS;
        }
        setLocalItem("news", data);
        return data as NewsArticleItem[];
      } catch {
        return DEFAULT_NEWS;
      }
    },
  });
}

export function useSaveNewsArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (article: Partial<NewsArticleItem> & { title: string; body: string }) => {
      await assertDiretoriaAccess();
      const current = getLocalItem<NewsArticleItem[]>("news", DEFAULT_NEWS);
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

      let savedId = article.id || `news-${Date.now()}`;
      if (article.id && !article.id.startsWith("news-")) {
        const { error } = await supabase.from("news_articles").update(payload).eq("id", article.id);
        if (error) {
          throw new Error("Não foi possível atualizar a notícia.");
        }
      } else {
        const { data, error } = await supabase
          .from("news_articles")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          throw new Error("Não foi possível publicar a notícia.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: NewsArticleItem = { id: savedId, ...payload };
      const updated = current.some((n) => n.id === article.id || n.id === savedId)
        ? current.map((n) => (n.id === article.id || n.id === savedId ? itemToSave : n))
        : [itemToSave, ...current];

      setLocalItem("news", updated);
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
          throw new Error("Não foi possível excluir a notícia.");
        }
      }
      const current = getLocalItem<NewsArticleItem[]>("news", DEFAULT_NEWS);
      setLocalItem(
        "news",
        current.filter((n) => n.id !== id),
      );
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

        if (error || !data || data.length === 0) {
          return DEFAULT_EVENTS;
        }
        setLocalItem("events", data);
        return data as EventItem[];
      } catch {
        return DEFAULT_EVENTS;
      }
    },
  });
}

export function useSaveSiteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Partial<EventItem> & { title: string; description: string }) => {
      await assertDiretoriaAccess();
      const current = getLocalItem<EventItem[]>("events", DEFAULT_EVENTS);
      const payload = {
        title: event.title.trim(),
        description: event.description.trim(),
        location: event.location?.trim() || null,
        starts_at: event.starts_at || null,
        registration_open: event.registration_open ?? false,
        published: event.published ?? true,
      };

      let savedId = event.id || `event-${Date.now()}`;
      if (event.id && !event.id.startsWith("event-")) {
        const { error } = await supabase.from("events").update(payload).eq("id", event.id);
        if (error) {
          throw new Error("Não foi possível atualizar o evento.");
        }
      } else {
        const { data, error } = await supabase.from("events").insert(payload).select("id").single();
        if (error) {
          throw new Error("Não foi possível cadastrar o evento.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: EventItem = { id: savedId, ...payload };
      const updated = current.some((e) => e.id === event.id || e.id === savedId)
        ? current.map((e) => (e.id === event.id || e.id === savedId ? itemToSave : e))
        : [...current, itemToSave];

      setLocalItem("events", updated);
      return itemToSave;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-events"] }),
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
          throw new Error("Não foi possível excluir o evento.");
        }
      }
      const current = getLocalItem<EventItem[]>("events", DEFAULT_EVENTS);
      setLocalItem(
        "events",
        current.filter((e) => e.id !== id),
      );
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-events"] }),
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

        if (error || !data || data.length === 0) {
          return DEFAULT_SPONSORS;
        }
        setLocalItem("sponsors", data);
        return data as SponsorItem[];
      } catch {
        return DEFAULT_SPONSORS;
      }
    },
  });
}

export function useSaveSponsor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sponsor: Partial<SponsorItem> & { name: string }) => {
      await assertDiretoriaAccess();
      const current = getLocalItem<SponsorItem[]>("sponsors", DEFAULT_SPONSORS);
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

      let savedId = sponsor.id || `spon-${Date.now()}`;
      if (sponsor.id && !sponsor.id.startsWith("spon-")) {
        const { error } = await supabase.from("sponsors").update(payload).eq("id", sponsor.id);
        if (error) {
          throw new Error("Não foi possível atualizar o apoiador.");
        }
      } else {
        const { data, error } = await supabase
          .from("sponsors")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          throw new Error("Não foi possível cadastrar o apoiador.");
        }
        if (data?.id) savedId = data.id;
      }

      const itemToSave: SponsorItem = { id: savedId, ...payload };
      const updated = current.some((s) => s.id === sponsor.id || s.id === savedId)
        ? current.map((s) => (s.id === sponsor.id || s.id === savedId ? itemToSave : s))
        : [...current, itemToSave];

      setLocalItem("sponsors", updated);
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
          throw new Error("Não foi possível remover o apoiador.");
        }
      }
      const current = getLocalItem<SponsorItem[]>("sponsors", DEFAULT_SPONSORS);
      setLocalItem(
        "sponsors",
        current.filter((s) => s.id !== id),
      );
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-sponsors"] }),
  });
}
