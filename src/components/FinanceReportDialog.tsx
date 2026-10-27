import { useState } from "react";
import { Download, Printer, BarChart3, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  formatBRL,
  toCents,
  fromCents,
  generateFinancialCSV,
  type FinancialTransactionItem,
  type FinancialSummaryData,
} from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: FinancialTransactionItem[];
  summary: FinancialSummaryData;
  periodLabel: string;
  userRoleName: string;
}

export function FinanceReportDialog({
  open,
  onOpenChange,
  transactions,
  summary,
  periodLabel,
  userRoleName,
}: Props) {
  const [reportView, setReportView] = useState<
    "geral" | "categorias" | "pagamentos" | "pendentes" | "cancelados"
  >("geral");

  // Breakdown by category (only effectively settled transactions, in integer cents)
  const categoryMap = new Map<
    string,
    {
      name: string;
      revenueCents: number;
      expenseCents: number;
      donationCents: number;
      totalCents: number;
    }
  >();
  for (const t of transactions) {
    if (t.status !== "recebido" && t.status !== "pago") continue;
    const catName = t.category_name || "Sem categoria";
    const cents = t.amount_cents || toCents(t.amount);
    const current = categoryMap.get(catName) || {
      name: catName,
      revenueCents: 0,
      expenseCents: 0,
      donationCents: 0,
      totalCents: 0,
    };
    if (t.entry_type === "receita" && t.status === "recebido") current.revenueCents += cents;
    else if (t.entry_type === "doacao" && t.status === "recebido") current.donationCents += cents;
    else if (t.entry_type === "despesa" && t.status === "pago") current.expenseCents += cents;
    current.totalCents = current.revenueCents + current.donationCents - current.expenseCents;
    categoryMap.set(catName, current);
  }
  const categoryBreakdown = Array.from(categoryMap.values()).map((c) => ({
    name: c.name,
    revenue: fromCents(c.revenueCents),
    expense: fromCents(c.expenseCents),
    donation: fromCents(c.donationCents),
    total: fromCents(c.totalCents),
  }));

  // Breakdown by payment method (only effectively settled transactions, in integer cents)
  const paymentMap = new Map<string, { method: string; count: number; totalCents: number }>();
  for (const t of transactions) {
    if (t.status !== "recebido" && t.status !== "pago") continue;
    const method = t.payment_method || "Não informado";
    const cents = t.amount_cents || toCents(t.amount);
    const current = paymentMap.get(method) || { method, count: 0, totalCents: 0 };
    current.count += 1;
    current.totalCents += cents;
    paymentMap.set(method, current);
  }
  const paymentBreakdown = Array.from(paymentMap.values()).map((p) => ({
    method: p.method,
    count: p.count,
    total: fromCents(p.totalCents),
  }));

  // Filtered lists for report
  const pendingTransactions = transactions.filter(
    (t) => t.status === "pendente" || t.status === "previsto",
  );
  const canceledTransactions = transactions.filter(
    (t) => t.status === "cancelado" || t.is_reversal,
  );

  function handleDownloadCSV() {
    const csvContent = generateFinancialCSV(transactions, summary, periodLabel, userRoleName);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedPeriod = periodLabel.replace(/[\/\s]/g, "-");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-financeiro-asg-${sanitizedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handlePrintPDF() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto print:p-0 print:border-none print:shadow-none">
        {/* Actions bar (hidden in print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 print:hidden">
          <div>
            <DialogTitle className="text-xl">Relatório Financeiro Consolidado</DialogTitle>
            <DialogDescription>
              Período de referência: <strong>{periodLabel}</strong> · Emissão:{" "}
              {new Date().toLocaleDateString("pt-BR")}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadCSV}>
              <Download className="mr-1.5 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button size="sm" className="btn-stamp" onClick={handlePrintPDF}>
              <Printer className="mr-1.5 h-4 w-4" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* View selection tabs (hidden in print) */}
        <div className="flex flex-wrap gap-1.5 border-b border-border pb-3 print:hidden">
          <Button
            size="sm"
            variant={reportView === "geral" ? "default" : "outline"}
            className={reportView === "geral" ? "btn-stamp" : ""}
            onClick={() => setReportView("geral")}
          >
            Visão Geral e Totais
          </Button>
          <Button
            size="sm"
            variant={reportView === "categorias" ? "default" : "outline"}
            className={reportView === "categorias" ? "btn-stamp" : ""}
            onClick={() => setReportView("categorias")}
          >
            Por Categorias
          </Button>
          <Button
            size="sm"
            variant={reportView === "pagamentos" ? "default" : "outline"}
            className={reportView === "pagamentos" ? "btn-stamp" : ""}
            onClick={() => setReportView("pagamentos")}
          >
            Por Formas de Pagamento
          </Button>
          <Button
            size="sm"
            variant={reportView === "pendentes" ? "default" : "outline"}
            className={reportView === "pendentes" ? "btn-stamp" : ""}
            onClick={() => setReportView("pendentes")}
          >
            Pendências ({pendingTransactions.length})
          </Button>
          <Button
            size="sm"
            variant={reportView === "cancelados" ? "default" : "outline"}
            className={reportView === "cancelados" ? "btn-stamp" : ""}
            onClick={() => setReportView("cancelados")}
          >
            Cancelados e Estornos ({canceledTransactions.length})
          </Button>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-6 pt-2 print:space-y-4">
          {/* Institutional Print Header */}
          <div className="text-center border-b-2 border-ink pb-4">
            <h1 className="font-display text-2xl uppercase tracking-wider">
              A.S.G. - Associação dos Skatistas de Guararema
            </h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mt-0.5">
              CNPJ · Guararema - SP · Prestação de Contas da Diretoria
            </p>
            <div className="mt-3 flex justify-between text-xs font-semibold px-2">
              <span>Período: {periodLabel}</span>
              <span>Emissão: {new Date().toLocaleString("pt-BR")}</span>
              <span>Responsável: {userRoleName}</span>
            </div>
          </div>

          {/* Resumo de Indicadores Financeiros */}
          <div className="rounded-md border border-ink bg-card p-4">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-3">
              Balancete do Período
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded border border-border p-2.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-semibold">
                  Saldo Inicial
                </span>
                <span className="font-mono font-bold text-base">
                  {formatBRL(summary.openingBalance)}
                </span>
              </div>
              <div className="rounded border border-border p-2.5 bg-emerald-500/5">
                <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block font-semibold">
                  (+) Receitas Efetivas
                </span>
                <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400">
                  {formatBRL(summary.receivedRevenues)}
                </span>
              </div>
              <div className="rounded border border-border p-2.5 bg-sky-500/5">
                <span className="text-[11px] uppercase tracking-wider text-sky-700 dark:text-sky-400 block font-semibold">
                  (+) Doações Efetivas
                </span>
                <span className="font-mono font-bold text-base text-sky-700 dark:text-sky-400">
                  {formatBRL(summary.receivedDonations)}
                </span>
              </div>
              <div className="rounded border border-border p-2.5 bg-destructive/5">
                <span className="text-[11px] uppercase tracking-wider text-destructive block font-semibold">
                  (-) Despesas Pagas
                </span>
                <span className="font-mono font-bold text-base text-destructive">
                  {formatBRL(summary.paidExpenses)}
                </span>
              </div>
              <div className="rounded border border-border p-2.5 sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-semibold">
                  Fluxo Líquido do Período (Entradas - Saídas)
                </span>
                <span
                  className={`font-mono font-bold text-base ${summary.netCashFlow >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {formatBRL(summary.netCashFlow)}
                </span>
              </div>
              <div className="rounded border-2 border-ink p-2.5 bg-card sm:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-foreground block font-bold">
                  (=) Saldo Final Calculado
                </span>
                <span className="font-mono font-bold text-lg text-foreground">
                  {formatBRL(summary.calculatedBalance)}
                </span>
              </div>
            </div>

            {/* Pendências */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-border text-xs">
              <div className="flex justify-between items-center text-amber-700 dark:text-amber-400">
                <span>Valores Pendentes a Receber:</span>
                <strong className="font-mono text-sm">
                  {formatBRL(summary.pendingReceivables)}
                </strong>
              </div>
              <div className="flex justify-between items-center text-amber-700 dark:text-amber-400">
                <span>Valores Pendentes a Pagar:</span>
                <strong className="font-mono text-sm">{formatBRL(summary.pendingPayables)}</strong>
              </div>
            </div>
          </div>

          {/* Relatório por Categorias */}
          {(reportView === "geral" || reportView === "categorias") && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm uppercase tracking-wider">
                Detalhamento por Categoria
              </h3>
              <table className="w-full text-left text-xs border border-ink">
                <thead className="border-b border-ink bg-muted/40 font-bold">
                  <tr>
                    <th className="p-2">Categoria</th>
                    <th className="p-2 text-right">Receitas</th>
                    <th className="p-2 text-right">Doações</th>
                    <th className="p-2 text-right">Despesas</th>
                    <th className="p-2 text-right">Saldo Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((c) => (
                    <tr key={c.name} className="border-b border-border/80">
                      <td className="p-2 font-medium">{c.name}</td>
                      <td className="p-2 text-right font-mono">{formatBRL(c.revenue)}</td>
                      <td className="p-2 text-right font-mono">{formatBRL(c.donation)}</td>
                      <td className="p-2 text-right font-mono text-destructive">
                        {formatBRL(c.expense)}
                      </td>
                      <td
                        className={`p-2 text-right font-mono font-bold ${c.total >= 0 ? "text-emerald-700" : "text-destructive"}`}
                      >
                        {formatBRL(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Relatório por Forma de Pagamento */}
          {(reportView === "geral" || reportView === "pagamentos") && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm uppercase tracking-wider">
                Movimentações por Forma de Pagamento
              </h3>
              <table className="w-full text-left text-xs border border-ink">
                <thead className="border-b border-ink bg-muted/40 font-bold">
                  <tr>
                    <th className="p-2">Forma de Pagamento</th>
                    <th className="p-2 text-right">Quantidade</th>
                    <th className="p-2 text-right">Volume Financeiro</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentBreakdown.map((p) => (
                    <tr key={p.method} className="border-b border-border/80">
                      <td className="p-2 font-medium">{p.method}</td>
                      <td className="p-2 text-right font-mono">{p.count}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatBRL(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pendências */}
          {reportView === "pendentes" && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm uppercase tracking-wider text-amber-700">
                Lançamentos Pendentes e Previstos
              </h3>
              <table className="w-full text-left text-xs border border-ink">
                <thead className="border-b border-ink bg-muted/40 font-bold">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/80">
                      <td className="p-2">
                        {new Date(t.occurred_on + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-2 font-semibold uppercase">{t.entry_type}</td>
                      <td className="p-2">{t.description}</td>
                      <td className="p-2 uppercase">{t.status}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatBRL(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pendingTransactions.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 text-center">
                  Nenhum lançamento pendente no período.
                </p>
              )}
            </div>
          )}

          {/* Cancelados e Estornos */}
          {reportView === "cancelados" && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm uppercase tracking-wider text-destructive">
                Lançamentos Cancelados ou Estornados
              </h3>
              <table className="w-full text-left text-xs border border-ink">
                <thead className="border-b border-ink bg-muted/40 font-bold">
                  <tr>
                    <th className="p-2">Data</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">Motivo / Justificativa Auditada</th>
                    <th className="p-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {canceledTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-border/80">
                      <td className="p-2">
                        {new Date(t.occurred_on + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-2 font-semibold uppercase">
                        {t.is_reversal ? "ESTORNO" : "CANCELADO"}
                      </td>
                      <td className="p-2">{t.description}</td>
                      <td className="p-2 italic">
                        {t.cancellation_reason || t.notes || "Não detalhado"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">{formatBRL(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature lines for printed legal compliance */}
          <div className="hidden print:grid grid-cols-2 gap-8 pt-12 text-center text-xs">
            <div className="border-t border-ink pt-2">
              <p className="font-bold">Diretoria Financeira / Tesouraria</p>
              <p className="text-[10px] text-muted-foreground">
                Associação dos Skatistas de Guararema
              </p>
            </div>
            <div className="border-t border-ink pt-2">
              <p className="font-bold">Presidente / Representante Legal</p>
              <p className="text-[10px] text-muted-foreground">
                Associação dos Skatistas de Guararema
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
