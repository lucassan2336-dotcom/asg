import { z } from "zod";

export type TransactionType = "receita" | "despesa" | "doacao";
export type TransactionStatus = "previsto" | "pendente" | "recebido" | "pago" | "cancelado";

export const TRANSACTION_TYPES: { id: TransactionType; label: string; description: string }[] = [
  {
    id: "receita",
    label: "Receita",
    description: "Entrada operacional (mensalidades, eventos, patrocínios, taxas)",
  },
  {
    id: "doacao",
    label: "Doação",
    description: "Entrada voluntária de recursos por pessoa física ou jurídica",
  },
  {
    id: "despesa",
    label: "Despesa",
    description: "Saída de recursos (manutenção, compras, aluguel, taxas)",
  },
];

export const TRANSACTION_STATUSES: { id: TransactionStatus; label: string; badgeClass: string }[] =
  [
    {
      id: "previsto",
      label: "Previsto",
      badgeClass: "border-sky-500/80 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    },
    {
      id: "pendente",
      label: "Pendente",
      badgeClass: "border-amber-500/80 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    },
    {
      id: "recebido",
      label: "Recebido",
      badgeClass: "border-emerald-500/80 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
    {
      id: "pago",
      label: "Pago",
      badgeClass: "border-emerald-600/80 bg-emerald-600/15 text-emerald-800 dark:text-emerald-200",
    },
    {
      id: "cancelado",
      label: "Cancelado",
      badgeClass:
        "border-red-500/80 bg-red-500/15 text-red-700 dark:text-red-300 line-through opacity-75",
    },
  ];

export const PAYMENT_METHODS = [
  "PIX",
  "Transferência Bancária (TED/DOC)",
  "Boleto Bancário",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Dinheiro em Espécie",
  "Cheque",
  "Outro",
] as const;

export const MAX_ATTACHMENT_SIZE_MB = 5;
export const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Exact financial formatting in BRL
export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Convert monetary decimal string or number to integer cents without floating point drift
export function toCents(val: number | string): number {
  if (typeof val === "number") return Math.round(val * 100);
  const clean = val.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export const transactionSchema = z.object({
  entry_type: z.enum(["receita", "despesa", "doacao"]),
  description: z.string().trim().min(3, "Descrição deve ter no mínimo 3 caracteres.").max(300),
  category_id: z.string().uuid("Selecione uma categoria válida.").optional().nullable(),
  amount: z
    .number()
    .positive("O valor deve ser maior que zero.")
    .max(999999999.99, "Valor acima do limite permitido."),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do lançamento."),
  competency_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de competência inválida.")
    .optional()
    .nullable(),
  settlement_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de liquidação inválida.")
    .optional()
    .nullable(),
  payment_method: z.string().max(60).optional().nullable(),
  status: z.enum(["previsto", "pendente", "recebido", "pago", "cancelado"]),
  donor_name: z.string().max(120).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

export interface FinancialSummaryData {
  openingBalance: number;
  receivedRevenues: number;
  receivedDonations: number;
  paidExpenses: number;
  netCashFlow: number;
  calculatedBalance: number;
  pendingReceivables: number;
  pendingPayables: number;
}

export interface FinancialTransactionItem {
  id: string;
  entry_type: TransactionType;
  description: string;
  category_id: string | null;
  amount: number;
  amount_cents: number;
  occurred_on: string;
  competency_date: string | null;
  settlement_date: string | null;
  payment_method: string | null;
  status: TransactionStatus;
  donor_name: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  original_transaction_id: string | null;
  is_reversal: boolean;
  created_by: string | null;
  created_at: string;
  category_name?: string;
  attachments?: { id: string; file_name: string; storage_path: string }[];
}

function toDateStr(val: any): string {
  if (!val) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

/**
 * Calculates financial indicators using exact integer arithmetic (cents)
 * to prevent floating-point imprecision.
 */
export function computeFinancialSummary(
  transactions: FinancialTransactionItem[],
  startDate: string,
  endDate: string,
): FinancialSummaryData {
  let openingRevenuesCents = 0;
  let openingDonationsCents = 0;
  let openingExpensesCents = 0;

  let receivedRevenuesCents = 0;
  let receivedDonationsCents = 0;
  let paidExpensesCents = 0;

  let pendingReceivablesCents = 0;
  let pendingPayablesCents = 0;

  const startStr = toDateStr(startDate);
  const endStr = toDateStr(endDate);

  for (const t of transactions) {
    // Canceled transactions are NEVER counted in balance or pending
    if (t.status === "cancelado") continue;

    const dateForBalance = toDateStr(t.settlement_date || t.occurred_on);
    const occurredDateStr = toDateStr(t.occurred_on);
    const cents = t.amount_cents || toCents(t.amount);

    if (dateForBalance < startStr) {
      // Prior to period: only settled transactions count towards opening balance
      if (t.status === "recebido") {
        if (t.entry_type === "doacao") openingDonationsCents += cents;
        else if (t.entry_type === "receita") openingRevenuesCents += cents;
      } else if (t.status === "pago" && t.entry_type === "despesa") {
        openingExpensesCents += cents;
      }
    } else if (dateForBalance <= endStr) {
      // Inside period: effectively settled
      if (t.status === "recebido") {
        if (t.entry_type === "doacao") {
          receivedDonationsCents += cents;
        } else if (t.entry_type === "receita") {
          receivedRevenuesCents += cents;
        }
      } else if (t.status === "pago" && t.entry_type === "despesa") {
        paidExpensesCents += cents;
      }
    }

    // Pending inside period (aligned with SQL get_financial_summary on occurred_on)
    if (
      (t.status === "pendente" || t.status === "previsto") &&
      occurredDateStr >= startStr &&
      occurredDateStr <= endStr
    ) {
      if (t.entry_type === "receita" || t.entry_type === "doacao") {
        pendingReceivablesCents += cents;
      } else if (t.entry_type === "despesa") {
        pendingPayablesCents += cents;
      }
    }
  }

  const openingBalanceCents = openingRevenuesCents + openingDonationsCents - openingExpensesCents;
  const netCashFlowCents = receivedRevenuesCents + receivedDonationsCents - paidExpensesCents;
  const calculatedBalanceCents = openingBalanceCents + netCashFlowCents;

  return {
    openingBalance: fromCents(openingBalanceCents),
    receivedRevenues: fromCents(receivedRevenuesCents),
    receivedDonations: fromCents(receivedDonationsCents),
    paidExpenses: fromCents(paidExpensesCents),
    netCashFlow: fromCents(netCashFlowCents),
    calculatedBalance: fromCents(calculatedBalanceCents),
    pendingReceivables: fromCents(pendingReceivablesCents),
    pendingPayables: fromCents(pendingPayablesCents),
  };
}

/**
 * Generates an Excel-compatible CSV export (UTF-8 with BOM)
 * with institutional header, period parameters, transaction details, and summary totals.
 */
export function generateFinancialCSV(
  transactions: FinancialTransactionItem[],
  summary: FinancialSummaryData,
  periodLabel: string,
  generatorName: string,
): string {
  const rows: string[] = [];

  // Header metadata
  rows.push("A.S.G. - ASSOCIAÇÃO DOS SKATISTAS DE GUARAREMA");
  rows.push("RELATÓRIO DE GESTÃO FINANCEIRA");
  rows.push(`Período de Referência: ${periodLabel}`);
  rows.push(`Data de Emissão: ${new Date().toLocaleString("pt-BR")}`);
  rows.push(`Gerado por: ${generatorName}`);
  rows.push("");

  // Summary section
  rows.push("RESUMO FINANCEIRO CONSOLIDADO");
  rows.push(`Saldo Inicial do Período;${formatBRL(summary.openingBalance)}`);
  rows.push(`(+) Total de Receitas Recebidas;${formatBRL(summary.receivedRevenues)}`);
  rows.push(`(+) Total de Doações Recebidas;${formatBRL(summary.receivedDonations)}`);
  rows.push(`(-) Total de Despesas Pagas;${formatBRL(summary.paidExpenses)}`);
  rows.push(`Fluxo Líquido do Período;${formatBRL(summary.netCashFlow)}`);
  rows.push(`(=) Saldo Calculado Final;${formatBRL(summary.calculatedBalance)}`);
  rows.push(`Valores Pendentes de Recebimento;${formatBRL(summary.pendingReceivables)}`);
  rows.push(`Valores Pendentes de Pagamento;${formatBRL(summary.pendingPayables)}`);
  rows.push("");

  // Transactions list
  rows.push("LANÇAMENTOS DETALHADOS");
  rows.push(
    [
      "Data Lançamento",
      "Competência",
      "Data Efetiva/Liquidação",
      "Tipo",
      "Categoria",
      "Descrição",
      "Forma de Pagamento",
      "Status",
      "Valor (R$)",
      "Doador/Identificador",
      "Comprovantes",
      "Observações/Justificativa",
    ].join(";"),
  );

  for (const t of transactions) {
    const attachCount = t.attachments?.length || 0;
    const notesOrReason =
      t.status === "cancelado"
        ? `CANCELADO: ${t.cancellation_reason || t.notes || ""}`
        : t.is_reversal
          ? `ESTORNO: ${t.cancellation_reason || t.notes || ""}`
          : t.notes || "";

    rows.push(
      [
        t.occurred_on,
        t.competency_date || "-",
        t.settlement_date || "-",
        t.entry_type.toUpperCase(),
        t.category_name || "Sem categoria",
        `"${t.description.replace(/"/g, '""')}"`,
        t.payment_method || "Não informado",
        t.status.toUpperCase(),
        t.amount.toFixed(2).replace(".", ","),
        t.donor_name ? `"${t.donor_name.replace(/"/g, '""')}"` : "-",
        attachCount > 0 ? `${attachCount} anexo(s)` : "Sem anexo",
        `"${notesOrReason.replace(/"/g, '""')}"`,
      ].join(";"),
    );
  }

  // UTF-8 BOM + semicolon-separated CSV
  return "\uFEFF" + rows.join("\r\n");
}
