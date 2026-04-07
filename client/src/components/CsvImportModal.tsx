import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, Check, X, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CsvImportMode = "expenses" | "creditCard";

interface ParsedRow {
  id: string;
  date: string;
  amount: string;
  identifier: string;
  description: string;
  // after AI categorization
  category: string;
  subcategoryId?: number;
  bankAccountId?: number;
  paymentMethod?: string;
  notes?: string;
  // UI state
  selected: boolean;
  edited: boolean;
}

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CsvImportMode;
  creditCardId?: number;
  bankAccountId?: number;
  onSuccess?: () => void;
}

// ─── Category labels ──────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { value: "alimentacao", label: "Alimentação" },
  { value: "habitacao", label: "Habitação" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "transporte", label: "Transporte" },
  { value: "vestuario", label: "Vestuário" },
  { value: "lazer", label: "Lazer" },
  { value: "financeiro", label: "Financeiro" },
  { value: "utilidades", label: "Utilidades" },
  { value: "pessoal", label: "Pessoal" },
  { value: "outros", label: "Outros" },
];

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "outros", label: "Outros" },
];

// ─── CSV Parser ───────────────────────────────────────────────────────────────
// Detecta se o valor usa formato americano (ponto decimal) ou brasileiro (vírgula decimal)
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[R$\s]/g, "").trim();
  if (!cleaned) return null;

  // Formato americano: só tem ponto como decimal (ex: 7.95, 1234.56, -3987.66)
  // Formato brasileiro com milhar: 1.234,56 (tem ponto E vírgula)
  // Formato brasileiro sem milhar: 1234,56 (só vírgula)

  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  let normalized: string;
  if (hasDot && hasComma) {
    // Formato brasileiro com milhar: 1.234,56 → remover pontos, trocar vírgula por ponto
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    // Formato brasileiro sem milhar: 1234,56 → trocar vírgula por ponto
    normalized = cleaned.replace(",", ".");
  } else {
    // Formato americano ou sem separador: 7.95, 1234.56, 1234
    normalized = cleaned;
  }

  const val = parseFloat(normalized);
  return isNaN(val) ? null : val;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Detectar separador: ponto-e-vírgula ou vírgula
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));

  // Encontrar índice de coluna de forma flexível
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h === name || h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIdx = findCol("data", "date", "dt");
  const amountIdx = findCol("valor", "amount", "value", "vl", "quantia");
  const identifierIdx = findCol("identificador", "identifier", "codigo", "code", "ref");
  // Nubank usa "title"; outros bancos usam "descricao", "description", etc.
  const descIdx = findCol("title", "descricao", "descrição", "description", "desc",
    "historico", "histórico", "memo", "estabelecimento", "lançamento", "lancamento");

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Processar campos com suporte a aspas
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === sep && !inQuote) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());

    const rawDate = dateIdx >= 0 ? (cols[dateIdx] ?? "") : "";
    const rawAmount = amountIdx >= 0 ? (cols[amountIdx] ?? "") : "";
    const rawIdentifier = identifierIdx >= 0 ? (cols[identifierIdx] ?? "") : "";
    const rawDesc = descIdx >= 0
      ? (cols[descIdx] ?? "")
      : cols.filter((_, ci) => ci !== dateIdx && ci !== amountIdx).join(" ");

    // Converter data: DD/MM/AAAA ou DD/MM/AA → AAAA-MM-DD
    let isoDate = rawDate;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split("/");
      isoDate = `${y}-${m}-${d}`;
    } else if (/^\d{2}\/\d{2}\/\d{2}$/.test(rawDate)) {
      const [d, m, y] = rawDate.split("/");
      isoDate = `20${y}-${m}-${d}`;
    }

    // Converter valor com detecção automática de formato
    const parsedVal = parseAmount(rawAmount);
    if (parsedVal === null || parsedVal === 0) continue;

    // Ignorar linhas de pagamento/crédito (valor negativo = dinheiro recebido/estorno)
    if (parsedVal < 0) continue;

    const absAmount = parsedVal.toFixed(2);

    // Limpar descrição de aspas extras do CSV
    const description = rawDesc.replace(/^"|"$/g, "").trim() || rawIdentifier || `Transação ${i}`;

    rows.push({
      id: `row-${i}`,
      date: isoDate,
      amount: absAmount,
      identifier: rawIdentifier || `TX${i}`,
      description,
      category: "outros",
      selected: true,
      edited: false,
    });
  }
  return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CsvImportModal({ open, onOpenChange, mode, creditCardId, bankAccountId, onSuccess }: CsvImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCategorizingAI, setIsCategorizingAI] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: expenseGroups = [] } = trpc.expenseGroups.list.useQuery();
  const { data: allSubcats = [] } = trpc.expenseGroups.subcategories.list.useQuery({});
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery();

  const categorizeMutation = trpc.importCsv.categorize.useMutation();
  const importExpensesMutation = trpc.importCsv.importExpenses.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} despesas importadas com sucesso!`);
      utils.expenses.list.invalidate();
      utils.dashboard.summary.invalidate();
      setStep("done");
      onSuccess?.();
    },
    onError: (e) => toast.error(`Erro ao importar: ${e.message}`),
  });
  const importCardMutation = trpc.importCsv.importCreditCardItems.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} lançamentos importados com sucesso!`);
      utils.creditCards.invalidate();
      utils.creditCardInvoices.invalidate();
      setStep("done");
      onSuccess?.();
    },
    onError: (e) => toast.error(`Erro ao importar: ${e.message}`),
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Por favor, selecione um arquivo CSV.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("Nenhuma transação encontrada. Verifique o formato do arquivo.");
        return;
      }
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleAICategorize = async () => {
    setIsCategorizingAI(true);
    try {
      const transactions = rows.map(r => ({ id: r.id, description: r.description, amount: parseFloat(r.amount) }));
      const result = await categorizeMutation.mutateAsync({ transactions });
      setRows(prev => prev.map(r => {
        const match = result.results.find(res => res.id === r.id);
        return match ? { ...r, category: match.category, edited: false } : r;
      }));
      toast.success("Categorização automática concluída!");
    } catch {
      toast.error("Erro ao categorizar com IA. Tente novamente.");
    } finally {
      setIsCategorizingAI(false);
    }
  };

  const updateRow = (id: string, field: keyof ParsedRow, value: string | number | boolean) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value, edited: field !== "selected" ? true : r.edited };
      // Quando subcategoryId muda, recalcular parentCategory automaticamente
      if (field === "subcategoryId" && typeof value === "number" && value > 0) {
        const subcat = allSubcats.find((s: any) => s.id === value);
        const group = subcat ? expenseGroups.find((g: any) => g.id === subcat.groupId) : undefined;
        const groupToEnum: Record<string, string> = {
          'necessidades': 'habitacao', 'desejos': 'lazer', 'investimentos': 'financeiro',
        };
        const derivedCategory = group ? (groupToEnum[group.name.toLowerCase()] || 'outros') : 'outros';
        updated.category = derivedCategory;
      }
      return updated;
    }));
  };

  const toggleAll = (selected: boolean) => {
    setRows(prev => prev.map(r => ({ ...r, selected })));
  };

  const handleConfirm = () => {
    const selected = rows.filter(r => r.selected);
    if (selected.length === 0) {
      toast.error("Selecione ao menos uma transação para importar.");
      return;
    }

    if (mode === "expenses") {
      importExpensesMutation.mutate({
        expenses: selected.map(r => ({
          description: r.description,
          amount: r.amount,
          date: r.date,
          parentCategory: r.category as any,
          subcategoryId: r.subcategoryId,
          bankAccountId: bankAccountId,
          paymentMethod: (r.paymentMethod as any) || "outros",
          notes: r.notes,
        })),
      });
    } else if (mode === "creditCard" && creditCardId) {
      importCardMutation.mutate({
        creditCardId,
        items: selected.map(r => ({
          description: r.description,
          amount: r.amount,
          date: r.date,
          category: r.category as any,
          // Enviar undefined (não null nem 0) para campos opcionais sem valor
          subcategoryId: (r.subcategoryId && r.subcategoryId > 0) ? r.subcategoryId : undefined,
          notes: (r.notes && r.notes.trim() !== '') ? r.notes.trim() : undefined,
        })),
      });
    }
  };

  const handleClose = () => {
    setStep("upload");
    setRows([]);
    setExpandedRow(null);
    onOpenChange(false);
  };

  const selectedCount = rows.filter(r => r.selected).length;
  const isImporting = importExpensesMutation.isPending || importCardMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Importar {mode === "expenses" ? "Despesas" : "Fatura do Cartão"} via CSV
          </DialogTitle>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div className="flex flex-col gap-4 p-2">
            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className={`w-10 h-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <div className="text-center">
                <p className="font-medium">Arraste o arquivo CSV aqui</p>
                <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground mb-2">Formatos suportados:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5"><Badge variant="secondary" className="text-xs">Nubank</Badge> <span className="text-xs">date;title;amount (separador <code>;</code>, valores com ponto)</span></div>
                <div className="flex items-center gap-1.5"><Badge variant="secondary" className="text-xs">Outros bancos</Badge> <span className="text-xs">data;descrição;valor ou data,descrição,valor</span></div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Datas aceitas: DD/MM/AAAA ou AAAA-MM-DD. Valores: formato americano (7.95) ou brasileiro (7,95). Linhas com valor negativo (pagamentos) são ignoradas automaticamente.</p>
            </div>
          </div>
        )}

        {/* ── Step: Preview & Categorize ── */}
        {step === "preview" && (
          <div className="flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{rows.length} transações detectadas</span>
                <Badge variant="secondary">{selectedCount} selecionadas</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Selecionar todas</Button>
                <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Desmarcar todas</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAICategorize}
                  disabled={isCategorizingAI}
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isCategorizingAI ? "Categorizando..." : "Categorizar com IA"}
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="w-8 p-2 text-center">
                      <input type="checkbox" checked={selectedCount === rows.length && rows.length > 0} onChange={e => toggleAll(e.target.checked)} className="rounded" />
                    </th>
                    <th className="p-2 text-left font-medium">Data</th>
                    <th className="p-2 text-left font-medium">Descrição</th>
                    <th className="p-2 text-right font-medium">Valor</th>
                    <th className="p-2 text-left font-medium">Categoria</th>
                    <th className="w-8 p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <>
                      <tr key={row.id} className={`border-t transition-colors ${!row.selected ? "opacity-50" : ""} hover:bg-muted/30`}>
                        <td className="p-2 text-center">
                          <input type="checkbox" checked={row.selected} onChange={e => updateRow(row.id, "selected", e.target.checked)} className="rounded" />
                        </td>
                        <td className="p-2 text-muted-foreground whitespace-nowrap">
                          {row.date ? new Date(row.date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="p-2 max-w-[200px]">
                          <div className="truncate font-medium" title={row.description}>{row.description}</div>
                          {row.identifier && <div className="text-xs text-muted-foreground truncate">{row.identifier}</div>}
                        </td>
                        <td className="p-2 text-right font-medium tabular-nums">
                          R$ {parseFloat(row.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2">
                          <Select value={row.category} onValueChange={v => updateRow(row.id, "category", v)}>
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                            {expandedRow === row.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                        </td>
                      </tr>
                      {expandedRow === row.id && (
                        <tr key={`${row.id}-expanded`} className="bg-muted/20 border-t">
                          <td colSpan={6} className="p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
                                <Input value={row.description} onChange={e => updateRow(row.id, "description", e.target.value)} className="h-7 text-xs" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
                                <Input type="date" value={row.date} onChange={e => updateRow(row.id, "date", e.target.value)} className="h-7 text-xs" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor (R$)</label>
                                <Input value={row.amount} onChange={e => updateRow(row.id, "amount", e.target.value)} className="h-7 text-xs" />
                              </div>
                              {mode === "expenses" && (
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de Pagamento</label>
                                  <Select value={row.paymentMethod || "outros"} onValueChange={v => updateRow(row.id, "paymentMethod", v)}>
                                    <SelectTrigger className="h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PAYMENT_METHODS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subcategoria</label>
                                <Select
                                  value={row.subcategoryId ? String(row.subcategoryId) : "none"}
                                  onValueChange={v => updateRow(row.id, "subcategoryId", v === "none" ? undefined as any : parseInt(v))}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Sem subcategoria" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">Sem subcategoria</SelectItem>
                                    {expenseGroups.map(group => {
                                      const subs = allSubcats.filter(s => s.groupId === group.id);
                                      if (subs.length === 0) return null;
                                      return subs.map(sub => (
                                        <SelectItem key={sub.id} value={String(sub.id)} className="text-xs">{group.name} › {sub.name}</SelectItem>
                                      ));
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
                                <Input value={row.notes || ""} onChange={e => updateRow(row.id, "notes", e.target.value)} className="h-7 text-xs" placeholder="Opcional..." />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>Revise as categorias antes de confirmar. Você pode editar cada linha clicando na seta.</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleConfirm} disabled={selectedCount === 0 || isImporting} className="gap-1.5">
                  <Check className="w-4 h-4" />
                  {isImporting ? "Importando..." : `Importar ${selectedCount} transações`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">As transações foram lançadas com sucesso.</p>
            </div>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
