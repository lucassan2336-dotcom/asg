import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { formatBRL, type FinancialTransactionItem } from "@/lib/finance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: FinancialTransactionItem | null;
  mode: "cancel" | "reverse";
  onSuccess: () => void;
}

export function FinanceCancellationDialog({
  open,
  onOpenChange,
  transaction,
  mode,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!transaction) return null;

  const isReverse = mode === "reverse";

  async function handleConfirm() {
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      toast.error("Informe uma justificativa com no mínimo 3 caracteres.");
      return;
    }
    if (cleanReason.length > 500) {
      toast.error("A justificativa deve ter no máximo 500 caracteres.");
      return;
    }

    setBusy(true);
    try {
      if (isReverse) {
        const { error } = await supabase.rpc("reverse_financial_transaction", {
          _transaction_id: transaction.id,
          _reason: cleanReason,
        });
        if (error) {
          const msg = error.message || "";
          const safeMsg = msg.includes("estorno ativo")
            ? "Este lançamento já possui um estorno registrado."
            : msg.includes("recebidos ou pagos")
              ? "Apenas lançamentos recebidos ou pagos podem ser estornados."
              : "Verifique a situação do lançamento e suas permissões.";
          toast.error("Falha ao registrar estorno: " + safeMsg);
          return;
        }
        toast.success(`Estorno de ${formatBRL(transaction.amount)} realizado com sucesso.`);
      } else {
        const { error } = await supabase.rpc("cancel_financial_transaction", {
          _transaction_id: transaction.id,
          _reason: cleanReason,
        });
        if (error) {
          const msg = error.message || "";
          const safeMsg = msg.includes("já está cancelado")
            ? "Este lançamento já se encontra cancelado."
            : msg.includes("estornados não podem")
              ? "Lançamentos estornados não podem ser cancelados diretamente."
              : "Verifique a situação do lançamento e suas permissões.";
          toast.error("Falha ao cancelar lançamento: " + safeMsg);
          return;
        }
        toast.success(`Lançamento de ${formatBRL(transaction.amount)} cancelado com sucesso.`);
      }

      setReason("");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o);
      }}
    >
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {isReverse ? (
              <RotateCcw className="h-5 w-5 text-amber-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <AlertDialogTitle>
              {isReverse ? "Confirmar Estorno Contábil" : "Confirmar Cancelamento de Lançamento"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-foreground/80 pt-2 space-y-2">
            <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs">
              <p>
                <strong>Lançamento:</strong> {transaction.description}
              </p>
              <p>
                <strong>Tipo:</strong> {transaction.entry_type.toUpperCase()} ·{" "}
                <strong>Valor:</strong> {formatBRL(transaction.amount)}
              </p>
              <p>
                <strong>Status atual:</strong> {transaction.status.toUpperCase()} ·{" "}
                <strong>Data:</strong>{" "}
                {new Date(transaction.occurred_on + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>

            <p>
              {isReverse
                ? "O estorno gerará automaticamente uma contrapartida contábil inversa de mesmo valor referenciando este lançamento, mantendo a integridade auditada do livro caixa."
                : "O lançamento passará para o status Cancelado e deixará de ser contabilizado no saldo e em pendências. O registro é mantido para fins de auditoria interna."}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <label className="block text-sm space-y-1.5 my-2">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Justificativa obrigatória (auditada):
          </span>
          <textarea
            required
            rows={3}
            maxLength={500}
            className="field mt-1"
            placeholder={
              isReverse
                ? "Descreva o motivo contábil do estorno (ex: devolução de pagamento duplicado, erro no valor)..."
                : "Descreva a justificativa para o cancelamento do lançamento..."
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="text-[11px] text-muted-foreground block text-right">
            {reason.length}/500 caracteres
          </span>
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
          <Button
            disabled={busy || reason.trim().length < 3}
            className={
              isReverse
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
            onClick={handleConfirm}
          >
            {busy ? "Processando…" : isReverse ? "Confirmar Estorno" : "Confirmar Cancelamento"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
