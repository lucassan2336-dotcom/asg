import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  DollarSign,
  Plus,
  Edit3,
  Trash2,
  Eye,
  X,
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
  Download,
  Search,
  Filter,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero, Section, Card } from "@/components/SiteLayout";
import { useSession, useMyRoles } from "@/lib/auth";
import { seo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, toCents, fromCents, type FinancialTransactionItem } from "@/lib/finance";

export const Route = createFileRoute("/transparencia")({
  head: () =>
    seo(
      "Portal de Transparência",
      "Prestação de contas, receitas, doações, despesas e finanças da Associação dos Skatistas de Guararema.",
    ),
  component: TransparenciaPage,
});

interface TransparenciaItem {
  id: string;
  entry_type: "receita" | "despesa" | "doacao";
  description: string;
  amount: number;
  amount_cents: number;
  occurred_on: string;
  status: string;
  notes?: string | null;
  attachments?: Array<{
    id: string;
    file_name: string;
    storage_path: string;
  }>;
}

function TransparenciaPage() {
  const { user, loading: authLoading } = useSession();
  const { roles } = useMyRoles(user?.id);
  const isDiretoria = roles.includes("diretoria");
  const queryClient = useQueryClient();

  // Estados dos filtros
  const [filterType, setFilterType] = useState<"todos" | "entrada" | "saida">("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState<"todos" | "mes" | "ano">("todos");

  // Diálogos
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransparenciaItem | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{
    path: string;
    name: string;
    title: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Busca de movimentações com seus comprovantes
  const {
    data: transactions = [],
    isLoading: isTxLoading,
    refetch,
  } = useQuery({
    queryKey: ["transparencia-transactions"],
    enabled: !!user,
    queryFn: async (): Promise<TransparenciaItem[]> => {
      // Busca transações ativas
      const { data: txData, error: txError } = await (supabase as any)
        .from("financial_transactions")
        .select("id, entry_type, description, amount, amount_cents, occurred_on, status, notes")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });

      if (txError) {
        throw new Error(txError.message || "Não foi possível carregar as finanças.");
      }

      if (!txData || txData.length === 0) return [];

      const txIds = txData.map((t: any) => t.id);

      // Busca comprovantes anexados
      const { data: attachData } = await (supabase as any)
        .from("financial_attachments")
        .select("id, transaction_id, file_name, storage_path")
        .in("transaction_id", txIds);

      const attachMap = new Map<
        string,
        Array<{ id: string; file_name: string; storage_path: string }>
      >();
      if (attachData) {
        for (const att of attachData) {
          const list = attachMap.get(att.transaction_id) || [];
          list.push({
            id: att.id,
            file_name: att.file_name,
            storage_path: att.storage_path,
          });
          attachMap.set(att.transaction_id, list);
        }
      }

      return txData.map((t: any) => ({
        id: t.id,
        entry_type: t.entry_type,
        description: t.description,
        amount: Number(t.amount),
        amount_cents: t.amount_cents ? Number(t.amount_cents) : Math.round(Number(t.amount) * 100),
        occurred_on: t.occurred_on,
        status: t.status,
        notes: t.notes,
        attachments: attachMap.get(t.id) || [],
      }));
    },
  });

  // Contabilização e resumo automático
  const { totalEntradas, totalSaidas, saldoCalculado, filteredList } = useMemo(() => {
    let entradasCents = 0;
    let saidasCents = 0;

    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const currentYear = `${today.getFullYear()}`;

    // Contabiliza apenas transações não canceladas
    for (const t of transactions) {
      if (t.status === "cancelado") continue;

      const cents = t.amount_cents || toCents(t.amount);
      if (t.entry_type === "receita" || t.entry_type === "doacao") {
        entradasCents += cents;
      } else if (t.entry_type === "despesa") {
        saidasCents += cents;
      }
    }

    // Aplicação dos filtros para exibição na lista
    const filtered = transactions.filter((t) => {
      // Filtro de tipo
      if (filterType === "entrada" && t.entry_type === "despesa") return false;
      if (filterType === "saida" && t.entry_type !== "despesa") return false;

      // Filtro de período
      if (period === "mes" && !t.occurred_on.startsWith(currentYearMonth)) return false;
      if (period === "ano" && !t.occurred_on.startsWith(currentYear)) return false;

      // Filtro de busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(term);
        const matchesDate = t.occurred_on.includes(term);
        if (!matchesDesc && !matchesDate) return false;
      }

      return true;
    });

    return {
      totalEntradas: fromCents(entradasCents),
      totalSaidas: fromCents(saidasCents),
      saldoCalculado: fromCents(entradasCents - saidasCents),
      filteredList: filtered,
    };
  }, [transactions, filterType, period, searchTerm]);

  // Se o visitante não estiver logado, exibe tela de acesso restrito a membros
  if (!authLoading && !user) {
    return (
      <>
        <PageHero eyebrow="Acesso Exclusivo a Membros" title="Portal de Transparência">
          Prestação de contas oficial da Associação dos Skatistas de Guararema.
        </PageHero>
        <Section className="flex justify-center">
          <Card className="max-w-xl text-center py-10 px-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive/15 text-olive mb-5">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-display uppercase tracking-wide">
              Área Restrita aos Membros
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              O Portal de Transparência da A.S.G. é visível exclusivamente para quem possui conta
              ativa de <strong>Skatista Local</strong> ou <strong>Associado</strong>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Acesse sua conta para consultar todos os lançamentos financeiros, entradas, saídas,
              comprovantes fiscais e saldos auditados.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/auth"
                search={{ redirect: "/transparencia" }}
                className="btn-stamp w-full sm:w-auto justify-center"
              >
                Entrar na Minha Conta
              </Link>
              <Link to="/associe-se" className="btn-ghost-stamp w-full sm:w-auto justify-center">
                Quero Me Associar
              </Link>
            </div>
          </Card>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHero eyebrow="Prestação de Contas" title="Portal de Transparência">
        Acompanhe em tempo real todas as finanças da A.S.G.: o que entra, o que sai e os
        comprovantes oficiais de cada movimentação.
      </PageHero>

      <Section className="space-y-8">
        {/* CARDS DE CONTABILIZAÇÃO AUTOMÁTICA */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Saldo Atual */}
          <div className="rounded-md border-2 border-ink bg-card p-5 shadow-stamp flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-muted-foreground">Saldo em Caixa</span>
              <div
                className={`rounded-full p-2 border border-ink ${
                  saldoCalculado >= 0
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-rust/15 text-rust"
                }`}
              >
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <div
                className={`text-3xl font-display tracking-tight ${
                  saldoCalculado >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rust"
                }`}
              >
                {formatBRL(saldoCalculado)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Contabilizado automaticamente com base em todos os lançamentos
              </p>
            </div>
          </div>

          {/* Total de Entradas */}
          <div className="rounded-md border-2 border-ink bg-card p-5 shadow-stamp flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-muted-foreground">Total de Entradas</span>
              <div className="rounded-full p-2 border border-ink bg-emerald-500/15 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-display text-emerald-700 dark:text-emerald-400 tracking-tight">
                {formatBRL(totalEntradas)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Receitas operacionais, eventos e doações recebidas
              </p>
            </div>
          </div>

          {/* Total de Saídas */}
          <div className="rounded-md border-2 border-ink bg-card p-5 shadow-stamp flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-muted-foreground">Total de Saídas</span>
              <div className="rounded-full p-2 border border-ink bg-rust/15 text-rust">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-display text-rust tracking-tight">
                {formatBRL(totalSaidas)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Despesas com eventos, manutenção de pistas e aquisições
              </p>
            </div>
          </div>
        </div>

        {/* BARRA DE AÇÕES E FILTROS */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Filtros rápidos de Tipo e Período */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border-2 border-ink bg-card p-1 shadow-stamp-sm">
              <button
                type="button"
                onClick={() => setFilterType("todos")}
                className={`rounded px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wider transition-colors ${
                  filterType === "todos" ? "bg-ink text-cream" : "text-foreground hover:bg-muted"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterType("entrada")}
                className={`rounded px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wider transition-colors ${
                  filterType === "entrada"
                    ? "bg-emerald-700 text-cream"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                Entradas (+)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("saida")}
                className={`rounded px-3 py-1 font-condensed text-xs font-bold uppercase tracking-wider transition-colors ${
                  filterType === "saida" ? "bg-rust text-cream" : "text-foreground hover:bg-muted"
                }`}
              >
                Saídas (-)
              </button>
            </div>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="rounded-md border-2 border-ink bg-card px-3 py-1.5 font-condensed text-xs font-bold uppercase tracking-wider shadow-stamp-sm focus:outline-none"
            >
              <option value="todos">Todo o Histórico</option>
              <option value="mes">Mês Atual</option>
              <option value="ano">Ano Atual</option>
            </select>
          </div>

          {/* Busca e Botão de Adicionar da Diretoria */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border-2 border-ink bg-card pl-9 pr-3 py-1.5 text-xs shadow-stamp-sm focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {isDiretoria && (
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsDialogOpen(true);
                }}
                className="btn-stamp inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-stamp"
                title="Cadastrar nova entrada ou saída financeira"
              >
                <Plus className="h-4 w-4" /> Nova Movimentação
              </button>
            )}
          </div>
        </div>

        {/* LISTAGEM DE MOVIMENTAÇÕES */}
        <div className="rounded-md border-2 border-ink bg-card shadow-stamp overflow-hidden">
          <div className="border-b-2 border-ink bg-muted/60 px-5 py-3 flex items-center justify-between">
            <h3 className="font-display text-lg uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-5 w-5 text-olive" />
              Lançamentos Financeiros ({filteredList.length})
            </h3>
            <span className="text-xs text-muted-foreground font-condensed uppercase tracking-wider">
              {isDiretoria ? "Acesso de Gestão (Diretoria)" : "Visualização de Membro"}
            </span>
          </div>

          {isTxLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-olive" />
              <p className="font-condensed uppercase tracking-wider text-xs">
                Carregando registros financeiros...
              </p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-base font-semibold">Nenhuma movimentação encontrada.</p>
              <p className="mt-1 text-xs">
                {searchTerm || filterType !== "todos" || period !== "todos"
                  ? "Tente ajustar os filtros aplicados acima."
                  : "Nenhum lançamento foi registrado até o momento."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink/20 bg-muted/30 font-condensed text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Comprovante</th>
                    {isDiretoria && <th className="py-3 px-4 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {filteredList.map((item) => {
                    const isEntrada = item.entry_type === "receita" || item.entry_type === "doacao";
                    const isCancelado = item.status === "cancelado";
                    const hasAttachment = item.attachments && item.attachments.length > 0;
                    const firstAttachment = hasAttachment ? item.attachments![0] : null;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/40 transition-colors ${
                          isCancelado ? "opacity-50 line-through bg-muted/20" : ""
                        }`}
                      >
                        {/* Data */}
                        <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                          {formatDateBR(item.occurred_on)}
                        </td>

                        {/* Tipo */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isEntrada ? (
                            <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-600 bg-emerald-500/15 px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              <TrendingUp className="h-3 w-3" /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-sm border border-rust bg-rust/15 px-2 py-0.5 font-condensed text-xs font-bold uppercase tracking-wider text-rust">
                              <TrendingDown className="h-3 w-3" /> Saída
                            </span>
                          )}
                        </td>

                        {/* Descrição */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-foreground">{item.description}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {item.notes}
                            </p>
                          )}
                          {isCancelado && (
                            <span className="inline-block mt-0.5 text-xs text-rust font-semibold">
                              (Lançamento cancelado)
                            </span>
                          )}
                        </td>

                        {/* Valor */}
                        <td
                          className={`py-3.5 px-4 text-right font-display whitespace-nowrap text-base ${
                            isEntrada ? "text-emerald-700 dark:text-emerald-400" : "text-rust"
                          }`}
                        >
                          {isEntrada ? "+" : "-"} {formatBRL(item.amount)}
                        </td>

                        {/* Comprovante */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {firstAttachment ? (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingReceipt({
                                  path: firstAttachment.storage_path,
                                  name: firstAttachment.file_name,
                                  title: item.description,
                                })
                              }
                              className="btn-ghost-stamp inline-flex items-center gap-1.5 text-xs py-1 px-2.5"
                              title="Visualizar foto do comprovante oficial"
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-olive" />
                              Ver Foto
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem anexo</span>
                          )}
                        </td>

                        {/* Ações da Diretoria */}
                        {isDiretoria && (
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsDialogOpen(true);
                                }}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Editar movimentação"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              {!isCancelado && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(item.id)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-rust/10 hover:text-rust transition-colors"
                                  title="Cancelar lançamento"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE MOVIMENTAÇÃO */}
      <TransparenciaDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
        }}
        initialData={editingItem}
        onSaved={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
          void queryClient.invalidateQueries({ queryKey: ["transparencia-transactions"] });
          void queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
        }}
      />

      {/* MODAL DE VISUALIZAÇÃO DE COMPROVANTE */}
      {viewingReceipt && (
        <ReceiptViewerModal
          storagePath={viewingReceipt.path}
          fileName={viewingReceipt.name}
          title={viewingReceipt.title}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {deletingId && (
        <CancelConfirmModal
          transactionId={deletingId}
          onClose={() => setDeletingId(null)}
          onSuccess={() => {
            setDeletingId(null);
            void queryClient.invalidateQueries({ queryKey: ["transparencia-transactions"] });
            void queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// DIÁLOGO DE LANÇAMENTO / EDIÇÃO (DATA, VALOR, ENTRADA OU SAÍDA, COMPROVANTE)
// ============================================================================

interface DialogProps {
  open: boolean;
  onClose: () => void;
  initialData?: TransparenciaItem | null;
  onSaved: () => void;
}

function TransparenciaDialog({ open, onClose, initialData, onSaved }: DialogProps) {
  const isEditing = !!initialData;

  const [entryType, setEntryType] = useState<"receita" | "despesa">("receita");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingAttachment, setExistingAttachment] = useState<{
    id: string;
    file_name: string;
    storage_path: string;
  } | null>(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega os dados quando abre para edição ou novo registro
  useMemo(() => {
    if (open) {
      if (initialData) {
        setEntryType(initialData.entry_type === "despesa" ? "despesa" : "receita");
        setOccurredOn(initialData.occurred_on);
        setAmountStr(initialData.amount.toString().replace(".", ","));
        setDescription(initialData.description);
        setNotes(initialData.notes || "");
        setSelectedFile(null);
        setPreviewUrl(null);
        setRemoveExistingAttachment(false);
        const first =
          initialData.attachments && initialData.attachments.length > 0
            ? initialData.attachments[0]
            : null;
        setExistingAttachment(first);
      } else {
        setEntryType("receita");
        setOccurredOn(new Date().toISOString().slice(0, 10));
        setAmountStr("");
        setDescription("");
        setNotes("");
        setSelectedFile(null);
        setPreviewUrl(null);
        setExistingAttachment(null);
        setRemoveExistingAttachment(false);
      }
    }
  }, [open, initialData]);

  // Limpa object URL ao fechar
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem (JPEG, PNG ou WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanDesc = description.trim();
    if (cleanDesc.length < 3) {
      toast.error("Informe uma descrição clara com pelo menos 3 caracteres.");
      return;
    }

    const cleanAmount = parseFloat(amountStr.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      toast.error("Informe um valor monetário válido maior que zero.");
      return;
    }

    if (!occurredOn || !/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      toast.error("Selecione uma data válida para a movimentação.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        entry_type: entryType,
        description: cleanDesc,
        amount: cleanAmount,
        amount_cents: Math.round(cleanAmount * 100),
        occurred_on: occurredOn,
        settlement_date: occurredOn,
        status: entryType === "despesa" ? "pago" : "recebido",
        notes: notes.trim() || null,
      };

      let txId: string;

      if (isEditing && initialData) {
        txId = initialData.id;
        const { error: updateError } = await (supabase as any)
          .from("financial_transactions")
          .update(payload)
          .eq("id", txId);

        if (updateError) throw updateError;
      } else {
        const { data: insertData, error: insertError } = await (supabase as any)
          .from("financial_transactions")
          .insert(payload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        txId = insertData.id;
      }

      // Se marcou para remover anexo existente
      if (removeExistingAttachment && existingAttachment) {
        await (supabase as any)
          .from("financial_attachments")
          .delete()
          .eq("id", existingAttachment.id);

        await supabase.storage.from("comprovantes").remove([existingAttachment.storage_path]);
      }

      // Se há um novo arquivo de comprovante selecionado
      if (selectedFile) {
        const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${txId}/${Date.now()}-${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("comprovantes")
          .upload(storagePath, selectedFile, {
            contentType: selectedFile.type,
            upsert: true,
          });

        if (uploadError) {
          toast.error("Movimentação salva, mas o upload da imagem falhou.");
        } else {
          await (supabase as any).from("financial_attachments").insert({
            transaction_id: txId,
            storage_path: storagePath,
            file_name: selectedFile.name,
            uploaded_by: user?.id,
          });
        }
      }

      toast.success(
        isEditing
          ? "Movimentação atualizada com sucesso!"
          : "Movimentação registrada e contabilizada com sucesso!",
      );
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar a movimentação.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg rounded-md border-2 border-ink bg-card p-6 shadow-stamp max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b-2 border-ink/20 pb-3">
          <h2 className="font-display text-xl uppercase tracking-wide">
            {isEditing ? "Editar Movimentação" : "Nova Entrada / Saída"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* SELEÇÃO: ENTRADA OU SAÍDA */}
          <div>
            <label className="eyebrow block mb-1.5">Tipo de Movimentação *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEntryType("receita")}
                className={`flex items-center justify-center gap-2 rounded-sm border-2 p-3 font-condensed text-sm font-bold uppercase tracking-wider transition-all ${
                  entryType === "receita"
                    ? "border-emerald-700 bg-emerald-600 text-cream shadow-stamp-sm"
                    : "border-ink/30 bg-card text-foreground hover:border-ink"
                }`}
              >
                <TrendingUp className="h-4 w-4" /> Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => setEntryType("despesa")}
                className={`flex items-center justify-center gap-2 rounded-sm border-2 p-3 font-condensed text-sm font-bold uppercase tracking-wider transition-all ${
                  entryType === "despesa"
                    ? "border-rust bg-rust text-cream shadow-stamp-sm"
                    : "border-ink/30 bg-card text-foreground hover:border-ink"
                }`}
              >
                <TrendingDown className="h-4 w-4" /> Saída (-)
              </button>
            </div>
          </div>

          {/* DATA E VALOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="eyebrow block mb-1">Data da Movimentação *</label>
              <input
                required
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="w-full rounded-md border-2 border-ink bg-card px-3 py-2 text-sm shadow-stamp-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1">Valor (R$) *</label>
              <input
                required
                type="text"
                placeholder="Ex: 150,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-md border-2 border-ink bg-card px-3 py-2 text-sm font-display shadow-stamp-sm focus:outline-none"
              />
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div>
            <label className="eyebrow block mb-1">Descrição do Lançamento *</label>
            <input
              required
              type="text"
              placeholder="Ex: Manutenção da pista de skate, doação, taxas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border-2 border-ink bg-card px-3 py-2 text-sm shadow-stamp-sm focus:outline-none"
            />
          </div>

          {/* OBSERVAÇÕES / DETALHES (OPCIONAL) */}
          <div>
            <label className="eyebrow block mb-1">Observações adicionais (opcional)</label>
            <textarea
              rows={2}
              placeholder="Detalhes ou identificador da nota..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border-2 border-ink bg-card px-3 py-2 text-xs shadow-stamp-sm focus:outline-none"
            />
          </div>

          {/* UPLOAD DO COMPROVANTE (IMAGEM) */}
          <div className="rounded-md border-2 border-dashed border-ink/40 bg-muted/30 p-4">
            <span className="eyebrow block mb-2 flex items-center gap-1.5 text-foreground">
              <ImageIcon className="h-4 w-4 text-olive" />
              Comprovante (Foto / Imagem da Nota ou Recibo)
            </span>

            {/* Imagem existente para edição */}
            {existingAttachment && !removeExistingAttachment && !previewUrl && (
              <div className="mb-3 flex items-center justify-between rounded border border-ink/20 bg-card p-2.5">
                <div className="flex items-center gap-2 overflow-hidden text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{existingAttachment.file_name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveExistingAttachment(true)}
                  className="text-xs text-rust font-semibold hover:underline"
                >
                  Substituir
                </button>
              </div>
            )}

            {/* Preview da foto recém-selecionada */}
            {previewUrl && (
              <div className="mb-3 relative rounded border-2 border-ink overflow-hidden bg-black/5 max-h-48 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Pré-visualização do comprovante"
                  className="max-h-48 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-rust p-1 text-cream shadow-stamp-sm"
                  title="Remover foto selecionada"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Campo de arquivo */}
            {(!existingAttachment || removeExistingAttachment || previewUrl) && (
              <label className="flex flex-col items-center justify-center cursor-pointer py-3 hover:bg-muted/50 rounded transition-colors">
                <UploadCloud className="h-6 w-6 text-olive mb-1" />
                <span className="font-condensed text-xs font-bold uppercase tracking-wider text-foreground">
                  {selectedFile ? "Alterar foto selecionada" : "Selecionar foto do comprovante"}
                </span>
                <span className="text-[0.65rem] text-muted-foreground mt-0.5">
                  Formatos aceitos: JPEG, PNG, WEBP (até 5MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="btn-ghost-stamp text-xs py-2 px-4"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-stamp text-xs py-2 px-5 inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar e Contabilizar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL DE VISUALIZAÇÃO DO COMPROVANTE (IMAGEM AMPLIADA)
// ============================================================================

function ReceiptViewerModal({
  storagePath,
  fileName,
  title,
  onClose,
}: {
  storagePath: string;
  fileName: string;
  title: string;
  onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useMemo(() => {
    let active = true;
    setLoading(true);

    supabase.storage
      .from("comprovantes")
      .createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (data?.signedUrl) {
          setImageUrl(data.signedUrl);
        } else {
          toast.error("Não foi possível carregar a imagem do comprovante.");
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storagePath]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/90 text-cream backdrop-blur-md animate-fade-in p-4"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-cream/20 pb-3">
        <div className="truncate pr-4">
          <p className="eyebrow text-amber">Comprovante Oficial</p>
          <h3 className="font-display text-lg uppercase truncate">{title}</h3>
          <p className="text-xs text-cream/70 font-mono truncate">{fileName}</p>
        </div>
        <div className="flex items-center gap-2">
          {imageUrl && (
            <a
              href={imageUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="btn-stamp text-xs py-1.5 px-3 bg-amber text-ink inline-flex items-center gap-1"
              title="Baixar comprovante"
            >
              <Download className="h-3.5 w-3.5" /> Baixar
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-cream/15 p-2 text-cream hover:bg-cream/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Visualização Central */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {loading ? (
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber mb-2" />
            <p className="text-xs text-cream/70 font-condensed uppercase tracking-wider">
              Carregando comprovante...
            </p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[75vh] max-w-full rounded border border-cream/20 object-contain shadow-2xl"
          />
        ) : (
          <p className="text-sm text-rust">Imagem indisponível.</p>
        )}
      </div>

      {/* Rodapé informativo */}
      <div className="text-center text-xs text-cream/60 py-2 border-t border-cream/15 font-condensed uppercase tracking-wider">
        Associação dos Skatistas de Guararema · Transparência Pública
      </div>
    </div>
  );
}

// ============================================================================
// CONFIRMAÇÃO DE CANCELAMENTO DE LANÇAMENTO
// ============================================================================

function CancelConfirmModal({
  transactionId,
  onClose,
  onSuccess,
}: {
  transactionId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCancel() {
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      toast.error("Informe uma justificativa para o cancelamento (mínimo de 3 caracteres).");
      return;
    }

    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from("financial_transactions")
        .update({
          status: "cancelado",
          cancellation_reason: cleanReason,
        })
        .eq("id", transactionId);

      if (error) throw error;
      toast.success("Lançamento cancelado e saldo recalculado!");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível cancelar o lançamento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md rounded-md border-2 border-ink bg-card p-6 shadow-stamp">
        <h3 className="font-display text-xl uppercase text-rust">Cancelar Lançamento</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Por normas contábeis da A.S.G., os lançamentos cancelados mantêm o registro de auditoria,
          mas são removidos do cálculo de saldo automaticamente.
        </p>

        <div className="mt-4">
          <label className="eyebrow block mb-1">Justificativa do Cancelamento *</label>
          <input
            type="text"
            placeholder="Ex: Erro de digitação no valor, duplicidade"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border-2 border-ink bg-card px-3 py-2 text-sm shadow-stamp-sm focus:outline-none"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="btn-ghost-stamp text-xs py-2 px-3"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleCancel}
            className="btn-stamp bg-rust text-cream text-xs py-2 px-4 inline-flex items-center gap-1.5"
          >
            {busy ? "Cancelando..." : "Confirmar Cancelamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Auxiliar para formatar data AAAA-MM-DD para DD/MM/AAAA
function formatDateBR(dateStr: string): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
