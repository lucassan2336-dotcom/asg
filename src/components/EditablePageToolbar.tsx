import { useState } from "react";
import { Edit3, Plus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useSession, useMyRoles } from "@/lib/auth";
import { usePageContent, useSavePageContent } from "@/lib/cms";

interface EditablePageToolbarProps {
  pageSlug: string;
  pageName: string;
  onAddItem?: () => void;
  addItemLabel?: string;
}

export function EditablePageToolbar({
  pageSlug,
  pageName,
  onAddItem,
  addItemLabel,
}: EditablePageToolbarProps) {
  const { user } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");
  const [modalOpen, setModalOpen] = useState(false);

  if (!isDiretoria) return null;

  return (
    <>
      <aside
        aria-label="Controles administrativos"
        className="sticky top-[58px] z-30 border-b-2 border-ink bg-amber-400/95 px-4 py-2 text-ink shadow-sm backdrop-blur"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded bg-ink px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-cream">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Diretoria
            </span>
            <span className="text-sm font-semibold">
              Edição da página: <span className="underline">{pageName}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAddItem && (
              <button
                onClick={onAddItem}
                className="btn-stamp flex items-center gap-1.5 py-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                {addItemLabel || "Adicionar item"}
              </button>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="btn-stamp flex items-center gap-1.5 bg-ink py-1 text-xs text-cream hover:bg-ink/90"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar textos da página
            </button>
          </div>
        </div>
      </aside>

      {modalOpen && (
        <EditPageModal
          pageSlug={pageSlug}
          pageName={pageName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

export function EditPageModal({
  pageSlug,
  pageName,
  onClose,
}: {
  pageSlug: string;
  pageName: string;
  onClose: () => void;
}) {
  const { content } = usePageContent<any>(pageSlug);
  const saveMutation = useSavePageContent();
  const [formData, setFormData] = useState<any>(() => JSON.parse(JSON.stringify(content)));

  const handleHeroChange = (field: string, val: string) => {
    setFormData((prev: any) => ({
      ...prev,
      hero: {
        ...(prev.hero || {}),
        [field]: val,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync({
        pageSlug,
        sectionKey: "main",
        content: formData,
      });
      toast.success(`Textos de "${pageName}" salvos com sucesso!`);
      onClose();
    } catch {
      toast.error("Erro ao salvar textos.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border-2 border-ink bg-card p-6 shadow-stamp">
        <div className="flex items-center justify-between border-b-2 border-ink pb-3">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl">Editar {pageName}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {/* Hero Section */}
          <div className="rounded border-2 border-border p-4 bg-muted/40">
            <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
              Cabeçalho da Página (Hero)
            </h3>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="eyebrow">Chapéu / Eyebrow</span>
                <input
                  className="field mt-1"
                  value={formData.hero?.eyebrow || ""}
                  onChange={(e) => handleHeroChange("eyebrow", e.target.value)}
                  placeholder="Ex: Guararema · SP"
                />
              </label>

              <label className="block">
                <span className="eyebrow">Título Principal</span>
                <input
                  required
                  className="field mt-1"
                  value={formData.hero?.title || ""}
                  onChange={(e) => handleHeroChange("title", e.target.value)}
                  placeholder="Título de impacto"
                />
              </label>

              <label className="block">
                <span className="eyebrow">Subtítulo / Descrição</span>
                <textarea
                  rows={3}
                  className="field mt-1"
                  value={formData.hero?.description || ""}
                  onChange={(e) => handleHeroChange("description", e.target.value)}
                  placeholder="Texto introdutório da página"
                />
              </label>

              {pageSlug === "home" && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <label className="block">
                    <span className="eyebrow">Texto Botão 1</span>
                    <input
                      className="field mt-1"
                      value={formData.hero?.primaryCtaText || ""}
                      onChange={(e) => handleHeroChange("primaryCtaText", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Link Botão 1</span>
                    <input
                      className="field mt-1"
                      value={formData.hero?.primaryCtaLink || ""}
                      onChange={(e) => handleHeroChange("primaryCtaLink", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Texto Botão 2</span>
                    <input
                      className="field mt-1"
                      value={formData.hero?.secondaryCtaText || ""}
                      onChange={(e) => handleHeroChange("secondaryCtaText", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Link Botão 2</span>
                    <input
                      className="field mt-1"
                      value={formData.hero?.secondaryCtaLink || ""}
                      onChange={(e) => handleHeroChange("secondaryCtaLink", e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Início Specifics */}
          {pageSlug === "home" && (
            <>
              <div className="rounded border-2 border-border p-4 bg-muted/40">
                <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Pilares de Destaque
                </h3>
                <div className="mt-3 space-y-4">
                  {(formData.pillars || []).map((pillar: any, idx: number) => (
                    <div key={idx} className="space-y-2 border-b border-border pb-3">
                      <label className="block">
                        <span className="eyebrow">Título do Pilar #{idx + 1}</span>
                        <input
                          className="field mt-1"
                          value={pillar.title || ""}
                          onChange={(e) => {
                            const newPillars = [...formData.pillars];
                            newPillars[idx] = { ...pillar, title: e.target.value };
                            setFormData({ ...formData, pillars: newPillars });
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className="eyebrow">Descrição do Pilar #{idx + 1}</span>
                        <textarea
                          rows={2}
                          className="field mt-1"
                          value={pillar.description || ""}
                          onChange={(e) => {
                            const newPillars = [...formData.pillars];
                            newPillars[idx] = { ...pillar, description: e.target.value };
                            setFormData({ ...formData, pillars: newPillars });
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border-2 border-border p-4 bg-muted/40">
                <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Banner de Chamada (Rodapé)
                </h3>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="eyebrow">Título do Banner</span>
                    <input
                      className="field mt-1"
                      value={formData.ctaBanner?.title || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ctaBanner: { ...formData.ctaBanner, title: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Texto do Banner</span>
                    <textarea
                      rows={2}
                      className="field mt-1"
                      value={formData.ctaBanner?.description || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ctaBanner: { ...formData.ctaBanner, description: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Texto do Botão</span>
                    <input
                      className="field mt-1"
                      value={formData.ctaBanner?.buttonText || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ctaBanner: { ...formData.ctaBanner, buttonText: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Sobre Specifics */}
          {pageSlug === "sobre" && (
            <>
              <div className="rounded border-2 border-border p-4 bg-muted/40">
                <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Missão, Visão e Valores
                </h3>
                <div className="mt-3 space-y-3">
                  {(formData.pillars || []).map((p: any, idx: number) => (
                    <div key={idx} className="space-y-1 border-b border-border pb-2">
                      <span className="eyebrow">{p.title}</span>
                      <textarea
                        rows={2}
                        className="field mt-1"
                        value={p.description || ""}
                        onChange={(e) => {
                          const updated = [...formData.pillars];
                          updated[idx] = { ...p, description: e.target.value };
                          setFormData({ ...formData, pillars: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border-2 border-border p-4 bg-muted/40">
                <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                  História Institucional
                </h3>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="eyebrow">Título</span>
                    <input
                      className="field mt-1"
                      value={formData.history?.title || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          history: { ...formData.history, title: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Texto da História</span>
                    <textarea
                      rows={4}
                      className="field mt-1"
                      value={formData.history?.text || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          history: { ...formData.history, text: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="rounded border-2 border-border p-4 bg-muted/40">
                <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Composição da Diretoria
                </h3>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="eyebrow">Título</span>
                    <input
                      className="field mt-1"
                      value={formData.board?.title || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          board: { ...formData.board, title: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Descrição dos Cargos e Membros</span>
                    <textarea
                      rows={3}
                      className="field mt-1"
                      value={formData.board?.members || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          board: { ...formData.board, members: e.target.value },
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Contato Specifics */}
          {pageSlug === "contato" && (
            <div className="rounded border-2 border-border p-4 bg-muted/40">
              <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                Canais Oficiais de Atendimento
              </h3>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="eyebrow">E-mail Oficial</span>
                  <input
                    type="email"
                    className="field mt-1"
                    value={formData.contactInfo?.email || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, email: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Telefone / WhatsApp</span>
                  <input
                    className="field mt-1"
                    value={formData.contactInfo?.phone || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, phone: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Instagram</span>
                  <input
                    className="field mt-1"
                    value={formData.contactInfo?.instagram || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, instagram: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Endereço da Pista / Sede</span>
                  <input
                    className="field mt-1"
                    value={formData.contactInfo?.address || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, address: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Horários de Atendimento</span>
                  <input
                    className="field mt-1"
                    value={formData.contactInfo?.hours || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, hours: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          )}

          {/* Criação de Conta & Login Specifics */}
          {pageSlug === "auth" && (
            <>
              <div className="rounded border-2 border-border p-4 bg-muted/40">
                <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Textos do Cabeçalho e Abas
                </h3>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="eyebrow">Título da Aba "Criar Conta"</span>
                    <input
                      className="field mt-1"
                      value={formData.signupTitle || ""}
                      onChange={(e) => setFormData({ ...formData, signupTitle: e.target.value })}
                      placeholder="Ex: Criar conta"
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Descrição da Criação de Conta</span>
                    <textarea
                      rows={2}
                      className="field mt-1"
                      value={formData.signupDescription || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, signupDescription: e.target.value })
                      }
                      placeholder="Orientações aos novos usuários"
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Título da Aba "Entrar"</span>
                    <input
                      className="field mt-1"
                      value={formData.loginTitle || ""}
                      onChange={(e) => setFormData({ ...formData, loginTitle: e.target.value })}
                      placeholder="Ex: Entrar"
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Descrição da Tela de Login</span>
                    <textarea
                      rows={2}
                      className="field mt-1"
                      value={formData.loginDescription || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, loginDescription: e.target.value })
                      }
                      placeholder="Instruções para acessar a conta"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded border-2 border-border p-4 bg-muted/40">
                <h3 className="font-condensed text-base font-bold uppercase tracking-wider text-muted-foreground">
                  Cards de Tipo de Conta (Skatista & Associado)
                </h3>
                <div className="mt-3 space-y-3">
                  <div className="border-b border-border pb-3 space-y-2">
                    <label className="block">
                      <span className="eyebrow">Título do Card: Skatista Local</span>
                      <input
                        className="field mt-1"
                        value={formData.skaterCardTitle || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, skaterCardTitle: e.target.value })
                        }
                        placeholder="Ex: Skatista Local"
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow">Descrição do Card: Skatista Local</span>
                      <textarea
                        rows={2}
                        className="field mt-1"
                        value={formData.skaterCardDescription || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, skaterCardDescription: e.target.value })
                        }
                        placeholder="Texto explicativo para o atleta"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="block">
                      <span className="eyebrow">Título do Card: Associado</span>
                      <input
                        className="field mt-1"
                        value={formData.associateCardTitle || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, associateCardTitle: e.target.value })
                        }
                        placeholder="Ex: Associado A.S.G."
                      />
                    </label>
                    <label className="block">
                      <span className="eyebrow">Descrição do Card: Associado</span>
                      <textarea
                        rows={2}
                        className="field mt-1"
                        value={formData.associateCardDescription || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, associateCardDescription: e.target.value })
                        }
                        placeholder="Texto explicativo para o associado"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-ghost-stamp">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-stamp disabled:opacity-60"
            >
              {saveMutation.isPending ? "Salvando…" : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
