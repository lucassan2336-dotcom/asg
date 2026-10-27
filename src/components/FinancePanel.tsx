import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FileSpreadsheet,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  HeartHandshake,
  Wallet,
  Clock,
  RotateCcw,
  XCircle,
  Paperclip,
  Eye,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/SiteLayout";
import { FinanceStatusBadge } from "@/components/FinanceStatusBadge";
import { FinanceTransactionDialog } from "@/components/FinanceTransactionDialog";
import { FinanceCancellationDialog } from "@/components/FinanceCancellationDialog";
import { FinanceReportDialog } from "@/components/FinanceReportDialog";
import {
  formatBRL,
  computeFinancialSummary,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  type FinancialTransactionItem,
  type TransactionType,
  type TransactionStatus,
} from "@/lib/finance";

export function FinancePanel() {
  const queryClient = useQueryClient();

  // Period filters
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const firstDayOfMonth = `${currentYear}-${currentMonth}-01`;
  const lastDayOfMonth = new Date(currentYear, today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [periodPreset, setPeriodPreset] = useState<
    "mes" | "mes_anterior" | "ano" | "todos" | "custom"
  >("mes");
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);

  // Other filters
  const [filterType, setFilterType] = useState<"todos" | TransactionType>("todos");
  const [filterStatus, setFilterStatus] = useState<"todos" | TransactionStatus>("todos");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<FinancialTransactionItem | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [transactionToCancel, setTransactionToCancel] = useState<FinancialTransactionItem | null>(
    null,
  );
  const [cancelMode, setCancelMode] = useState<"cancel" | "reverse">("cancel");

  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // 1. Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("id, name, kind")
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Fetch Transactions & Attachments
  const {
    data: rawTransactions = [],
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["financial-transactions"],
    queryFn: async () => {
      const { data: txs, error: txError } = await supabase
        .from("financial_transactions")
        .select(
          `
          id,
          entry_type,
          category_id,
          description,
          amount,
          amount_cents,
          occurred_on,
          competency_date,
          settlement_date,
          payment_method,
          status,
          donor_name,
          notes,
          cancellation_reason,
          original_transaction_id,
          is_reversal,
          created_by,
          created_at,
          financial_categories ( id, name ),
          financial_attachments ( id, file_name, storage_path )
        `,
        )
        .order("occurred_on", { ascending: false });

      if (txError) throw txError;

      return (txs || []).map((t: any) => ({
        id: t.id,
        entry_type:
          (t.entry_type as TransactionType) ||
          (t.is_donation ? "doacao" : (t.kind as TransactionType)),
        description: t.description,
        category_id: t.category_id,
        amount: Number(t.amount),
        amount_cents: Number(t.amount_cents || Math.round(Number(t.amount) * 100)),
        occurred_on: t.occurred_on,
        competency_date: t.competency_date,
        settlement_date: t.settlement_date,
        payment_method: t.payment_method,
        status: (t.status as TransactionStatus) || "recebido",
        donor_name: t.donor_name,
        notes: t.notes,
        cancellation_reason: t.cancellation_reason,
        original_transaction_id: t.original_transaction_id,
        is_reversal: Boolean(t.is_reversal),
        created_by: t.created_by,
        created_at: t.created_at,
        category_name: t.financial_categories?.name || "Sem categoria",
        attachments: t.financial_attachments || [],
      })) as FinancialTransactionItem[];
    },
  });

  // Handle Preset changes
  function applyPreset(preset: "mes" | "mes_anterior" | "ano" | "todos" | "custom") {
    setPeriodPreset(preset);
    const now = new Date();
    if (preset === "mes") {
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === "mes_anterior") {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const start = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-01`;
      const end = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === "ano") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    } else if (preset === "todos") {
      setStartDate("2000-01-01");
      setEndDate("2099-12-31");
    }
  }

  // Summary computed with exact cent arithmetic
  const summary = useMemo(() => {
    return computeFinancialSummary(rawTransactions, startDate, endDate);
  }, [rawTransactions, startDate, endDate]);

  // Filtered transactions for display
  const filteredTransactions = useMemo(() => {
    return rawTransactions.filter((t) => {
      // Period filter based on date of occurrence/settlement
      const dateForFilter = t.settlement_date || t.occurred_on;
      if (periodPreset !== "todos") {
        if (dateForFilter < startDate || dateForFilter > endDate) return false;
      }

      // Type filter
      if (filterType !== "todos" && t.entry_type !== filterType) return false;

      // Status filter
      if (filterStatus !== "todos" && t.status !== filterStatus) return false;

      // Category filter
      if (filterCategory !== "todos" && t.category_id !== filterCategory) return false;

      // Text search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesDonor = t.donor_name?.toLowerCase().includes(query) ?? false;
        const matchesNotes = t.notes?.toLowerCase().includes(query) ?? false;
        if (!matchesDesc && !matchesDonor && !matchesNotes) return false;
      }

      return true;
    });
  }, [
    rawTransactions,
    periodPreset,
    startDate,
    endDate,
    filterType,
    filterStatus,
    filterCategory,
    searchTerm,
  ]);

  function handleOpenCreate() {
    setTransactionToEdit(null);
    setTransactionDialogOpen(true);
  }

  function handleOpenEdit(item: FinancialTransactionItem) {
    setTransactionToEdit(item);
    setTransactionDialogOpen(true);
  }

  function handleOpenCancellation(item: FinancialTransactionItem, mode: "cancel" | "reverse") {
    setTransactionToCancel(item);
    setCancelMode(mode);
    setCancelDialogOpen(true);
  }

  async function openSignedAttachment(storagePath: string) {
    try {
      const { data, error } = await supabase.storage
        .from("comprovantes")
        .createSignedUrl(storagePath, 900);
      if (error || !data?.signedUrl) {
        toast.error("Não foi possível gerar link temporário para o comprovante.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Erro ao abrir comprovante.");
    }
  }

  const periodLabel = useMemo(() => {
    if (periodPreset === "todos") return "Histórico Completo";
    const startFormatted = new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR");
    const endFormatted = new Date(endDate + "T00:00:00").toLocaleDateString("pt-BR");
    return `${startFormatted} a ${endFormatted}`;
  }, [periodPreset, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-olive" />
            Gestão Financeira e Livro Caixa
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controle de receitas, despesas, doações e comprovantes integrado ao Supabase.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} title="Atualizar dados">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setReportDialogOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-700 dark:text-emerald-400" />
            Relatórios e Exportação
          </Button>
          <Button size="sm" className="btn-stamp" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Period selector bar */}
      <div className="rounded-md border border-ink bg-card p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
            <Clock className="h-4 w-4 text-olive" />
            <span>Período de Referência:</span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm normal-case">
              {periodLabel}
            </span>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => applyPreset("mes")}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase ${
                periodPreset === "mes"
                  ? "btn-stamp text-cream"
                  : "border border-border bg-card hover:bg-muted"
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => applyPreset("mes_anterior")}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase ${
                periodPreset === "mes_anterior"
                  ? "btn-stamp text-cream"
                  : "border border-border bg-card hover:bg-muted"
              }`}
            >
              Mês Anterior
            </button>
            <button
              onClick={() => applyPreset("ano")}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase ${
                periodPreset === "ano"
                  ? "btn-stamp text-cream"
                  : "border border-border bg-card hover:bg-muted"
              }`}
            >
              Ano Atual
            </button>
            <button
              onClick={() => applyPreset("todos")}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase ${
                periodPreset === "todos"
                  ? "btn-stamp text-cream"
                  : "border border-border bg-card hover:bg-muted"
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Custom date range inputs */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/80 text-xs">
          <span className="font-semibold text-muted-foreground">Intervalo personalizado:</span>
          <label className="flex items-center gap-1.5">
            <span>De:</span>
            <input
              type="date"
              className="field py-1 text-xs"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset("custom");
              }}
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span>Até:</span>
            <input
              type="date"
              className="field py-1 text-xs"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset("custom");
              }}
            />
          </label>
        </div>
      </div>

      {/* Financial Indicators Grid (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Inicial */}
        <Card className="p-4 border-ink relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Inicial</span>
            <Wallet className="h-4 w-4 text-olive" />
          </div>
          <div className="font-mono text-xl font-bold text-foreground">
            {formatBRL(summary.openingBalance)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Acumulado anterior a {new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR")}.
          </p>
        </Card>

        {/* Receitas Efetivamente Recebidas */}
        <Card className="p-4 border-ink bg-emerald-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Receitas Recebidas</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatBRL(summary.receivedRevenues)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Recebidas no período ({periodLabel}).
          </p>
        </Card>

        {/* Doações Efetivamente Recebidas */}
        <Card className="p-4 border-ink bg-sky-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between text-sky-800 dark:text-sky-300 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Doações Recebidas</span>
            <HeartHandshake className="h-4 w-4" />
          </div>
          <div className="font-mono text-xl font-bold text-sky-700 dark:text-sky-400">
            {formatBRL(summary.receivedDonations)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Doações auditadas no período (sem duplicar receitas).
          </p>
        </Card>

        {/* Despesas Efetivamente Pagas */}
        <Card className="p-4 border-ink bg-destructive/5 relative overflow-hidden">
          <div className="flex items-center justify-between text-destructive mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Despesas Pagas</span>
            <TrendingDown className="h-4 w-4" />
          </div>
          <div className="font-mono text-xl font-bold text-destructive">
            {formatBRL(summary.paidExpenses)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Pagas no período ({periodLabel}).
          </p>
        </Card>

        {/* Saldo Calculado Final (Span 2) */}
        <Card className="p-4 border-2 border-ink bg-card sm:col-span-2 relative shadow-stamp-sm">
          <div className="flex items-center justify-between text-foreground mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">
              Saldo Calculado Final
            </span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted">
              Saldo Inicial + Receitas + Doações - Despesas
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className={`font-mono text-2xl font-bold ${summary.calculatedBalance >= 0 ? "text-foreground" : "text-destructive"}`}
            >
              {formatBRL(summary.calculatedBalance)}
            </span>
            <span className="text-xs text-muted-foreground">
              (Fluxo líquido no período: {summary.netCashFlow >= 0 ? "+" : ""}
              {formatBRL(summary.netCashFlow)})
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Posição consolidada da tesouraria em{" "}
            {new Date(endDate + "T00:00:00").toLocaleDateString("pt-BR")}.
          </p>
        </Card>

        {/* Valores Pendentes de Recebimento */}
        <Card className="p-4 border-ink bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pendentes a Receber</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="font-mono text-xl font-bold text-amber-700 dark:text-amber-400">
            {formatBRL(summary.pendingReceivables)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Previstos ou em cobrança (não contabilizados no saldo).
          </p>
        </Card>

        {/* Valores Pendentes de Pagamento */}
        <Card className="p-4 border-ink bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pendentes a Pagar</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="font-mono text-xl font-bold text-amber-700 dark:text-amber-400">
            {formatBRL(summary.pendingPayables)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Compromissos a liquidar (não contabilizados no saldo).
          </p>
        </Card>
      </div>

      {/* Filter and search bar */}
      <div className="rounded-md border border-border bg-card p-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Tipo */}
          <div>
            <label className="block font-semibold mb-1">Tipo de Movimentação</label>
            <select
              className="field py-1"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="todos">Todos os tipos</option>
              <option value="receita">Receitas</option>
              <option value="doacao">Doações</option>
              <option value="despesa">Despesas</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold mb-1">Status Contábil</label>
            <select
              className="field py-1"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="todos">Todos os status</option>
              <option value="recebido">Recebido</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="previsto">Previsto</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block font-semibold mb-1">Categoria</label>
            <select
              className="field py-1"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="todos">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind === "despesa" ? "Despesa" : "Receita/Doação"})
                </option>
              ))}
            </select>
          </div>

          {/* Busca textual */}
          <div>
            <label className="block font-semibold mb-1">Buscar Lançamento</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Descrição, doador ou notas..."
                className="field pl-8 py-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Exibindo <strong>{filteredTransactions.length}</strong> lançamento(s) correspondente(s)
            aos filtros.
          </span>
          {filteredTransactions.length !== rawTransactions.length && (
            <button
              onClick={() => {
                applyPreset("todos");
                setFilterType("todos");
                setFilterStatus("todos");
                setFilterCategory("todos");
                setSearchTerm("");
              }}
              className="underline hover:text-foreground"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>

        {isPending ? (
          <p className="py-12 text-center text-muted-foreground">Carregando livro caixa…</p>
        ) : error ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-center space-y-2"
          >
            <p className="text-destructive font-semibold">
              Não foi possível carregar os lançamentos financeiros.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-ink bg-card">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b-2 border-ink bg-muted/40 font-bold">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Forma Pagto</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Anexos</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border/80 transition-colors hover:bg-muted/20 ${
                      t.status === "cancelado" ? "opacity-60 bg-muted/30" : ""
                    }`}
                  >
                    {/* Data */}
                    <td className="whitespace-nowrap p-3 font-mono text-xs">
                      {new Date(t.occurred_on + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>

                    {/* Tipo */}
                    <td className="p-3 font-semibold uppercase text-xs">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          t.entry_type === "receita"
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                            : t.entry_type === "doacao"
                              ? "bg-sky-500/10 text-sky-800 dark:text-sky-300"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {t.is_reversal ? "Estorno" : t.entry_type}
                      </span>
                    </td>

                    {/* Categoria */}
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {t.category_name}
                    </td>

                    {/* Descrição & Doador */}
                    <td className="p-3 font-medium text-foreground max-w-xs">
                      <p className="truncate" title={t.description}>
                        {t.description}
                      </p>
                      {t.donor_name && (
                        <p className="text-[11px] text-sky-700 dark:text-sky-300 truncate">
                          Doador: {t.donor_name}
                        </p>
                      )}
                      {t.cancellation_reason && (
                        <p className="text-[11px] text-destructive italic truncate">
                          Motivo: {t.cancellation_reason}
                        </p>
                      )}
                    </td>

                    {/* Forma Pagto */}
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {t.payment_method || "-"}
                    </td>

                    {/* Valor */}
                    <td
                      className={`whitespace-nowrap p-3 text-right font-mono font-bold ${
                        t.status === "cancelado"
                          ? "line-through text-muted-foreground"
                          : t.entry_type === "despesa"
                            ? "text-destructive"
                            : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {t.entry_type === "despesa" ? "-" : "+"}
                      {formatBRL(t.amount)}
                    </td>

                    {/* Status */}
                    <td className="p-3 whitespace-nowrap">
                      <FinanceStatusBadge status={t.status} />
                    </td>

                    {/* Anexos */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {t.attachments && t.attachments.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => openSignedAttachment(t.attachments![0]!.storage_path)}
                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-foreground hover:bg-border"
                          title="Abrir comprovante seguro (link expira em 15min)"
                        >
                          <Paperclip className="h-3 w-3 text-olive" />
                          <span>{t.attachments.length}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-foreground"
                          title="Detalhes / Editar"
                          onClick={() => handleOpenEdit(t)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {t.status !== "cancelado" && (
                          <>
                            {t.status === "recebido" || t.status === "pago" ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-amber-600 hover:bg-amber-50"
                                title="Estornar lançamento"
                                onClick={() => handleOpenCancellation(t, "reverse")}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title="Cancelar lançamento"
                                onClick={() => handleOpenCancellation(t, "cancel")}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTransactions.length === 0 && (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <p>Nenhum lançamento financeiro encontrado para os filtros selecionados.</p>
                <Button size="sm" variant="outline" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Primeiro Lançamento
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <FinanceTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        transactionToEdit={transactionToEdit}
        categories={categories}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
        }}
      />

      <FinanceCancellationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        transaction={transactionToCancel}
        mode={cancelMode}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
        }}
      />

      <FinanceReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        transactions={filteredTransactions}
        summary={summary}
        periodLabel={periodLabel}
        userRoleName="Diretoria Executiva"
      />
    </div>
  );
}
