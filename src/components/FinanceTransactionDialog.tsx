import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UploadCloud, FileText, Image as ImageIcon, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_SIZE_MB,
  ALLOWED_MIME_TYPES,
  MIME_TO_EXT,
  transactionSchema,
  formatBRL,
  toCents,
  type TransactionType,
  type TransactionStatus,
  type FinancialTransactionItem,
} from "@/lib/finance";

interface Category {
  id: string;
  name: string;
  kind: "receita" | "despesa";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: FinancialTransactionItem | null;
  categories: Category[];
  onSuccess: () => void;
}

export function FinanceTransactionDialog({
  open,
  onOpenChange,
  transactionToEdit,
  categories,
  onSuccess,
}: Props) {
  const isEditing = !!transactionToEdit;

  const [entryType, setEntryType] = useState<TransactionType>("receita");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amountStr, setAmountStr] = useState("");
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [competencyDate, setCompetencyDate] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [status, setStatus] = useState<TransactionStatus>("recebido");
  const [donorName, setDonorName] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<
    { id: string; file_name: string; storage_path: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  useEffect(() => {
    if (open) {
      if (transactionToEdit) {
        setEntryType(transactionToEdit.entry_type);
        setDescription(transactionToEdit.description);
        setCategoryId(transactionToEdit.category_id || "");
        setAmountStr(transactionToEdit.amount.toString().replace(".", ","));
        setOccurredOn(transactionToEdit.occurred_on);
        setCompetencyDate(transactionToEdit.competency_date || "");
        setSettlementDate(transactionToEdit.settlement_date || "");
        setPaymentMethod(transactionToEdit.payment_method || "PIX");
        setStatus(transactionToEdit.status);
        setDonorName(transactionToEdit.donor_name || "");
        setNotes(transactionToEdit.notes || "");
        setExistingAttachments(transactionToEdit.attachments || []);
      } else {
        setEntryType("receita");
        setDescription("");
        setCategoryId("");
        setAmountStr("");
        const today = new Date().toISOString().slice(0, 10);
        setOccurredOn(today);
        setCompetencyDate(today.slice(0, 7) + "-01");
        setSettlementDate(today);
        setPaymentMethod("PIX");
        setStatus("recebido");
        setDonorName("");
        setNotes("");
        setExistingAttachments([]);
        setIdempotencyKey(crypto.randomUUID());
      }
      setSelectedFiles([]);
      setFormError("");
    }
  }, [open, transactionToEdit]);

  // Adjust default status if entryType changes
  function handleTypeChange(newType: TransactionType) {
    setEntryType(newType);
    if (newType === "despesa") {
      if (status === "recebido") setStatus("pago");
    } else {
      if (status === "pago") setStatus("recebido");
    }
  }

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    for (const f of files) {
      if (!ALLOWED_MIME_TYPES.includes(f.type)) {
        toast.error(`Tipo de arquivo não suportado: ${f.name}. Use PDF, JPG ou PNG.`);
        return;
      }
      if (f.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast.error(`Arquivo ${f.name} excede o limite máximo de ${MAX_ATTACHMENT_SIZE_MB}MB.`);
        return;
      }
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function openSignedReceipt(storagePath: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from("comprovantes")
        .createSignedUrl(storagePath, 900); // 15 minutes validity
      if (error || !data?.signedUrl) {
        toast.error("Não foi possível gerar link seguro para o comprovante.");
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Erro ao acessar comprovante.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const cents = toCents(amountStr);
    if (cents <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    const cleanAmount = cents / 100;

    const parseResult = transactionSchema.safeParse({
      entry_type: entryType,
      description,
      category_id: categoryId || null,
      amount: cleanAmount,
      occurred_on: occurredOn,
      competency_date: competencyDate || null,
      settlement_date:
        status === "recebido" || status === "pago" ? settlementDate || occurredOn : null,
      payment_method: paymentMethod || null,
      status,
      donor_name: entryType === "doacao" ? donorName || null : null,
      notes: notes || null,
    });

    if (!parseResult.success) {
      setFormError(parseResult.error.issues[0]?.message ?? "Verifique os dados informados.");
      return;
    }

    setBusy(true);
    try {
      let transactionId = transactionToEdit?.id;

      if (isEditing && transactionId) {
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            entry_type: parseResult.data.entry_type,
            description: parseResult.data.description,
            category_id: parseResult.data.category_id ?? null,
            amount: parseResult.data.amount,
            occurred_on: parseResult.data.occurred_on,
            competency_date: parseResult.data.competency_date ?? null,
            settlement_date: parseResult.data.settlement_date ?? null,
            payment_method: parseResult.data.payment_method ?? null,
            status: parseResult.data.status,
            donor_name: parseResult.data.donor_name ?? null,
            notes: parseResult.data.notes ?? null,
          })
          .eq("id", transactionId);

        if (error) {
          setFormError(
            error.code === "23514" || error.code === "42501"
              ? error.message
              : "Não foi possível atualizar o lançamento financeiro. Verifique os dados informados.",
          );
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("financial_transactions")
          .insert({
            entry_type: parseResult.data.entry_type,
            kind: parseResult.data.entry_type === "despesa" ? "despesa" : "receita",
            description: parseResult.data.description,
            category_id: parseResult.data.category_id ?? null,
            amount: parseResult.data.amount,
            occurred_on: parseResult.data.occurred_on,
            competency_date: parseResult.data.competency_date ?? null,
            settlement_date: parseResult.data.settlement_date ?? null,
            payment_method: parseResult.data.payment_method ?? null,
            status: parseResult.data.status,
            donor_name: parseResult.data.donor_name ?? null,
            notes: parseResult.data.notes ?? null,
            idempotency_key: idempotencyKey,
          })
          .select("id")
          .single();

        if (error) {
          if (error.code === "23505") {
            setFormError(
              "Este lançamento já foi enviado anteriormente (prevenção de duplicidade).",
            );
          } else if (error.code === "23514" || error.code === "42501") {
            setFormError(error.message);
          } else {
            setFormError("Não foi possível registrar o lançamento financeiro.");
          }
          return;
        }
        transactionId = data.id;
      }

      // Upload newly attached receipts to private 'comprovantes' bucket
      if (selectedFiles.length > 0 && transactionId) {
        for (const file of selectedFiles) {
          const extension = MIME_TO_EXT[file.type];
          if (!extension) {
            toast.warning(`Arquivo ignorado por formato inválido: ${file.name}`);
            continue;
          }
          const safeFileName = `${crypto.randomUUID()}.${extension}`;
          const storagePath = `${transactionId}/${safeFileName}`;
          const cleanOriginalName =
            file.name
              .replace(/[\\/<>\x00-\x1f]/g, "_")
              .trim()
              .slice(0, 150) || safeFileName;

          const { error: uploadErr } = await supabase.storage
            .from("comprovantes")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            });

          if (uploadErr) {
            toast.warning(`Não foi possível enviar o comprovante "${cleanOriginalName}".`);
          } else {
            const { error: attachErr } = await supabase.from("financial_attachments").insert({
              transaction_id: transactionId,
              storage_path: storagePath,
              file_name: cleanOriginalName,
            });
            if (attachErr) {
              toast.warning(`Erro ao vincular comprovante "${cleanOriginalName}".`);
            }
          }
        }
      }

      toast.success(
        isEditing ? "Lançamento atualizado com sucesso." : "Lançamento registrado com sucesso.",
      );
      onOpenChange(false);
      onSuccess();
    } catch {
      setFormError("Erro de comunicação com o servidor.");
    } finally {
      setBusy(false);
    }
  }

  const filteredCategories = categories.filter((c) =>
    entryType === "despesa" ? c.kind === "despesa" : c.kind === "receita",
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Lançamento Financeiro" : "Novo Lançamento Financeiro"}
          </DialogTitle>
          <DialogDescription>
            Registro contábil integrado da A.S.G. com cálculo automático em centavos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Lançamento */}
          <div>
            <span className="eyebrow block mb-1.5">Tipo de Movimentação *</span>
            <div className="grid grid-cols-3 gap-2">
              {TRANSACTION_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  disabled={isEditing}
                  onClick={() => handleTypeChange(t.id)}
                  className={`rounded-md border p-2.5 text-center text-sm font-semibold transition-colors ${
                    entryType === t.id
                      ? "border-ink bg-olive text-cream shadow-sm"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {TRANSACTION_TYPES.find((t) => t.id === entryType)?.description}
            </p>
          </div>

          {/* Descrição & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block">
                <span className="eyebrow">Descrição *</span>
                <input
                  required
                  maxLength={300}
                  className="field mt-1"
                  placeholder="Ex: Mensalidade associado, Compra de rolamentos, Patrocínio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="eyebrow">Categoria</span>
                <select
                  className="field mt-1"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Selecione uma categoria...</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Doador (se doação) */}
          {entryType === "doacao" && (
            <div>
              <label className="block">
                <span className="eyebrow">Nome do Doador / Entidade (Opcional)</span>
                <input
                  maxLength={120}
                  className="field mt-1"
                  placeholder="Nome do doador (anônimo caso não informado)"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* Valor, Data e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block">
                <span className="eyebrow">Valor (R$) *</span>
                <input
                  required
                  type="text"
                  className="field mt-1 font-mono font-bold text-base"
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                />
                {amountStr && (
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    {formatBRL(toCents(amountStr) / 100)}
                  </span>
                )}
              </label>
            </div>

            <div>
              <label className="block">
                <span className="eyebrow">Data do Lançamento *</span>
                <input
                  required
                  type="date"
                  className="field mt-1"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="eyebrow">Forma de Pagamento</span>
                <select
                  className="field mt-1"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Status, Data de Competência e Liquidação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block">
                <span className="eyebrow">Status *</span>
                <select
                  className="field mt-1 font-semibold"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                >
                  {entryType === "despesa" ? (
                    <>
                      <option value="pago">Pago (Efetivado)</option>
                      <option value="pendente">Pendente (A pagar)</option>
                      <option value="previsto">Previsto</option>
                    </>
                  ) : (
                    <>
                      <option value="recebido">Recebido (Efetivado)</option>
                      <option value="pendente">Pendente (A receber)</option>
                      <option value="previsto">Previsto</option>
                    </>
                  )}
                  {isEditing && <option value="cancelado">Cancelado</option>}
                </select>
              </label>
            </div>

            <div>
              <label className="block">
                <span className="eyebrow">Competência (Opcional)</span>
                <input
                  type="date"
                  className="field mt-1"
                  value={competencyDate}
                  onChange={(e) => setCompetencyDate(e.target.value)}
                />
              </label>
            </div>

            <div>
              <label className="block">
                <span className="eyebrow">
                  {status === "pago"
                    ? "Data de Pagamento"
                    : status === "recebido"
                      ? "Data de Recebimento"
                      : "Data Prevista"}
                </span>
                <input
                  type="date"
                  className="field mt-1"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block">
              <span className="eyebrow">Observações Internas (Opcional)</span>
              <textarea
                maxLength={1000}
                rows={2}
                className="field mt-1"
                placeholder="Detalhes adicionais, número de documento, justificativa contábil..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          {/* Comprovantes (Upload & Lista) */}
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-olive" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Comprovantes e Anexos (PDF, JPG, PNG até {MAX_ATTACHMENT_SIZE_MB}MB)
                </span>
              </div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted">
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Adicionar Arquivo</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileSelection}
                />
              </label>
            </div>

            {/* Comprovantes já salvos */}
            {existingAttachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Anexos salvos no bucket privado:
                </span>
                <ul className="space-y-1">
                  {existingAttachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between rounded border border-border/70 bg-card p-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <ImageIcon className="h-3.5 w-3.5 text-olive shrink-0" />
                        <span className="truncate">{att.file_name}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-olive"
                        onClick={() => openSignedReceipt(att.storage_path, att.file_name)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visualizar
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Novos arquivos selecionados para envio */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Arquivos prontos para envio:
                </span>
                <ul className="space-y-1">
                  {selectedFiles.map((file, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded border border-emerald-500/40 bg-emerald-500/10 p-1.5 text-xs"
                    >
                      <span className="truncate pr-2">
                        {file.name} ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeSelectedFile(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Os arquivos são protegidos no Supabase Storage em bucket privado. Links temporários e
              assinados expiram em 15 minutos.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive font-medium"
            >
              {formError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy} className="btn-stamp">
              {busy ? "Salvando…" : isEditing ? "Salvar Alterações" : "Registrar Lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
