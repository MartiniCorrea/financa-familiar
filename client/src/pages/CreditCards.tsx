import { trpc } from "@/lib/trpc";
import { formatCurrency, getTodayString, getCurrentMonth, getCurrentYear } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, CreditCard, Receipt, ChevronLeft, ChevronRight, CheckCircle2, PlusCircle, X, RotateCcw, Repeat, FileUp, CornerDownLeft, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CsvImportModal } from "@/components/CsvImportModal";

const CARD_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#d97706'];

// Formata datas do banco (podem vir como Date, string ISO ou string YYYY-MM-DD)
function formatDbDate(dateVal: any): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return dateVal.toLocaleDateString('pt-BR');
  }
  const s = String(dateVal);
  // Se for YYYY-MM-DD, adiciona T12:00:00 para evitar problema de timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR');
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1);
  return { value: i + 1, label: d.toLocaleDateString('pt-BR', { month: 'long' }) };
});
const EXPENSE_CATEGORIES = [
  { value: "habitacao", label: "Habitação" }, { value: "alimentacao", label: "Alimentação" },
  { value: "saude", label: "Saúde" }, { value: "educacao", label: "Educação" },
  { value: "transporte", label: "Transporte" }, { value: "vestuario", label: "Vestuário" },
  { value: "lazer", label: "Lazer" }, { value: "financeiro", label: "Financeiro" },
  { value: "utilidades", label: "Utilidades" }, { value: "pessoal", label: "Pessoal" },
  { value: "outros", label: "Outros" },
];

type CardForm = { name: string; bank: string; lastFourDigits: string; creditLimit: string; closingDay: string; dueDay: string; color: string; };
const emptyCardForm: CardForm = { name: '', bank: '', lastFourDigits: '', creditLimit: '', closingDay: '1', dueDay: '10', color: '#6366f1' };

type ItemForm = { description: string; amount: string; subcategoryId: string; purchaseDate: string; installments: string; notes: string; isRecurring: boolean; frequency: string; endDate: string; };
const emptyItemForm: ItemForm = { description: '', amount: '', subcategoryId: '', purchaseDate: getTodayString(), installments: '1', notes: '', isRecurring: false, frequency: 'monthly', endDate: '' };

function statusBadge(status: string) {
  if (status === 'paga') return <Badge className="bg-emerald-400/20 text-emerald-400 border-0">Paga</Badge>;
  if (status === 'parcialmente_paga') return <Badge className="bg-teal-400/20 text-teal-400 border-0">Parcialmente Paga</Badge>;
  if (status === 'fechada') return <Badge className="bg-amber-400/20 text-amber-400 border-0">Fechada</Badge>;
  return <Badge className="bg-blue-400/20 text-blue-400 border-0">Aberta</Badge>;
}

export default function CreditCards() {
  const [cardOpen, setCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [itemOpen, setItemOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editItemForm, setEditItemForm] = useState<ItemForm>(emptyItemForm);

  const utils = trpc.useUtils();
  const { data: cards = [], isLoading } = trpc.creditCards.list.useQuery();
  const { data: expenseGroups = [] } = trpc.expenseGroups.list.useQuery();
  const { data: allSubcats = [] } = trpc.expenseGroups.subcategories.list.useQuery({});

  const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);

  const { data: invoices = [] } = trpc.creditCardInvoices.list.useQuery(
    { creditCardId: selectedCardId ?? undefined },
    { enabled: !!selectedCardId }
  );

  const currentInvoice = useMemo(() =>
    invoices.find(inv => inv.month === month && inv.year === year) || null,
    [invoices, month, year]
  );

  const { data: items = [] } = trpc.creditCardInvoices.getItems.useQuery(
    { invoiceId: currentInvoice?.id ?? 0 },
    { enabled: !!currentInvoice?.id }
  );

  const createCardMutation = trpc.creditCards.create.useMutation({
    onSuccess: () => { utils.creditCards.list.invalidate(); setCardOpen(false); setCardForm(emptyCardForm); toast.success("Cartão adicionado!"); },
    onError: (e) => toast.error(e.message || "Erro ao salvar cartão"),
  });

  const deleteCardMutation = trpc.creditCards.delete.useMutation({
    onSuccess: () => { utils.creditCards.list.invalidate(); setSelectedCardId(null); toast.success("Cartão removido!"); },
    onError: () => toast.error("Erro ao remover cartão"),
  });

  const getOrCreateInvoiceMutation = trpc.creditCardInvoices.getOrCreate.useMutation({
    onSuccess: (inv) => {
      setInvoiceId(inv.id);
      utils.creditCardInvoices.list.invalidate();
      setItemOpen(true);
    },
    onError: (e) => toast.error(e.message || "Erro ao abrir fatura"),
  });

  const createRecurringMutation = trpc.recurring.create.useMutation({
    onSuccess: () => { utils.recurring.list.invalidate(); },
    onError: (err) => toast.error("Erro ao criar recorrência: " + err.message),
  });

  const addItemMutation = trpc.creditCardInvoices.addItem.useMutation({
    onSuccess: (result) => {
      utils.creditCardInvoices.list.invalidate();
      utils.creditCardInvoices.getItems.invalidate();
      setItemOpen(false);
      setItemForm(emptyItemForm);
      // Navegar para o mês/ano correto da fatura se for diferente do atual
      if (result.invoiceMonth && result.invoiceYear) {
        if (result.invoiceMonth !== month || result.invoiceYear !== year) {
          setMonth(result.invoiceMonth);
          setYear(result.invoiceYear);
          toast.success(`Gasto adicionado à fatura de ${new Date(result.invoiceYear, result.invoiceMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}!`);
        } else {
          toast.success("Gasto adicionado à fatura!");
        }
      } else {
        toast.success("Gasto adicionado à fatura!");
      }
    },
    onError: (e) => toast.error(e.message || "Erro ao adicionar gasto"),
  });

  const removeItemMutation = trpc.creditCardInvoices.removeItem.useMutation({
    onSuccess: () => {
      utils.creditCardInvoices.list.invalidate();
      utils.creditCardInvoices.getItems.invalidate();
      toast.success("Item removido!");
    },
    onError: (e) => toast.error(e.message || "Erro ao remover item"),
  });

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payBankAccountId, setPayBankAccountId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<'full' | 'partial'>('full');

  // Estorno
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundTargetItem, setRefundTargetItem] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundDesc, setRefundDesc] = useState<string>('');
  const [refundDate, setRefundDate] = useState<string>(getTodayString());
  const [refundNotes, setRefundNotes] = useState<string>('');

  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery();

  const updateItemMutation = trpc.creditCardInvoices.updateItem.useMutation({
    onMutate: async (variables) => {
      // Cancelar queries em andamento
      await utils.creditCardInvoices.getItems.cancel();
      // Snapshot do estado atual
      const invoiceId = currentInvoice?.id ?? 0;
      const previousItems = utils.creditCardInvoices.getItems.getData({ invoiceId });
      // Atualizar o cache otimisticamente
      utils.creditCardInvoices.getItems.setData({ invoiceId }, (old: any) => {
        if (!old) return old;
        return old.map((item: any) =>
          item.id === variables.itemId
            ? { ...item, description: variables.description, amount: variables.amount, parentCategory: variables.parentCategory, subcategoryId: variables.subcategoryId, purchaseDate: variables.purchaseDate, notes: variables.notes }
            : item
        );
      });
      return { previousItems, invoiceId };
    },
    onSuccess: (_data, _variables, context) => {
      // Forçar refetch para garantir dados frescos do servidor
      utils.creditCardInvoices.getItems.invalidate({ invoiceId: context?.invoiceId });
      utils.creditCardInvoices.list.invalidate();
      setEditItemOpen(false);
      toast.success('Gasto atualizado!');
    },
    onError: (e, _variables, context) => {
      // Reverter em caso de erro
      if (context?.previousItems !== undefined) {
        utils.creditCardInvoices.getItems.setData({ invoiceId: context.invoiceId }, context.previousItems);
      }
      toast.error(e.message || 'Erro ao atualizar gasto');
    },
  });

  function openEditItem(item: any) {
    setEditItemId(item.id);
    setEditItemForm({
      description: item.description,
      amount: String(item.amount),
      subcategoryId: item.subcategoryId ? String(item.subcategoryId) : '',
      purchaseDate: typeof item.purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.purchaseDate)
        ? item.purchaseDate
        : item.purchaseDate instanceof Date
          ? item.purchaseDate.toISOString().split('T')[0]
          : String(item.purchaseDate).split('T')[0],
      installments: String(item.totalInstallments || 1),
      notes: item.notes || '',
      isRecurring: false,
      frequency: 'monthly',
      endDate: '',
    });
    setEditItemOpen(true);
  }

  function handleEditItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editItemId || !editItemForm.description || !editItemForm.amount) return toast.error('Preencha os campos obrigatórios');
    const subcatId = editItemForm.subcategoryId ? parseInt(editItemForm.subcategoryId) : undefined;
    const subcat = subcatId ? allSubcats.find(s => s.id === subcatId) : undefined;
    // Usar parentCategory da própria subcategoria (campo adicionado na tabela)
    const parentCategory = (subcat as any)?.parentCategory || 'outros';
    updateItemMutation.mutate({
      itemId: editItemId,
      description: editItemForm.description,
      amount: editItemForm.amount,
      parentCategory: parentCategory as any,
      subcategoryId: subcatId ?? null,
      purchaseDate: editItemForm.purchaseDate,
      notes: editItemForm.notes || null,
    });
  }

  const addRefundMutation = trpc.creditCardInvoices.addRefundItem.useMutation({
    onSuccess: () => {
      utils.creditCardInvoices.list.invalidate();
      utils.creditCardInvoices.getItems.invalidate();
      setRefundDialogOpen(false);
      setRefundTargetItem(null);
      setRefundAmount('');
      setRefundDesc('');
      setRefundNotes('');
      toast.success('Estorno registrado com sucesso!');
    },
    onError: (e) => toast.error(e.message || 'Erro ao registrar estorno'),
  });

  const partialPayMutation = trpc.creditCardInvoices.partialPayInvoice.useMutation({
    onSuccess: (result) => {
      utils.creditCardInvoices.list.invalidate();
      utils.creditCardInvoices.getItems.invalidate();
      utils.bills.list.invalidate();
      utils.bankAccounts.listWithBalance.invalidate();
      utils.expenses.list.invalidate();
      setPayDialogOpen(false);
      setPayBankAccountId('');
      setPayAmount('');
      setPayMode('full');
      if (result.type === 'full') {
        toast.success('Fatura paga integralmente!');
      } else {
        toast.success(`Adiantamento de ${formatCurrency(result.paidAmount)} registrado. Saldo devedor: ${formatCurrency(result.remaining)}`);
      }
    },
    onError: (e) => toast.error(e.message || 'Erro ao registrar pagamento'),
  });

  const reversePaymentMutation = trpc.creditCardInvoices.reversePayment.useMutation({
    onSuccess: () => {
      utils.creditCardInvoices.list.invalidate();
      utils.creditCardInvoices.getItems.invalidate();
      utils.bills.list.invalidate();
      utils.bankAccounts.listWithBalance.invalidate();
      utils.expenses.list.invalidate();
      toast.success('Pagamento estornado! A fatura foi reaberta.');
    },
    onError: (e) => toast.error(e.message || 'Erro ao estornar pagamento'),
  });

  const payInvoiceMutation = trpc.creditCardInvoices.payInvoice.useMutation({
    onSuccess: (result) => {
      utils.creditCardInvoices.list.invalidate();
      utils.creditCardInvoices.getItems.invalidate();
      utils.bills.list.invalidate();
      utils.bankAccounts.listWithBalance.invalidate();
      setPayDialogOpen(false);
      setPayBankAccountId('');
      toast.success(`Fatura paga! ${result.itemsLaunched} despesas lançadas automaticamente.`);
    },
    onError: (e) => toast.error(e.message || "Erro ao pagar fatura"),
  });

  function handlePayInvoice() {
    if (!currentInvoice) return;
    if (payMode === 'partial') {
      const amt = parseFloat(payAmount);
      if (!payAmount || isNaN(amt) || amt <= 0) return toast.error('Informe um valor válido para o adiantamento');
      partialPayMutation.mutate({
        invoiceId: currentInvoice.id,
        amount: amt,
        bankAccountId: payBankAccountId && payBankAccountId !== 'none' ? parseInt(payBankAccountId) : null,
      });
    } else {
      payInvoiceMutation.mutate({
        invoiceId: currentInvoice.id,
        bankAccountId: payBankAccountId && payBankAccountId !== 'none' ? parseInt(payBankAccountId) : null,
      });
    }
  }

  function openRefundDialog(item: any) {
    setRefundTargetItem(item);
    setRefundAmount(String(item.amount));
    setRefundDesc(`Estorno: ${item.description}`);
    setRefundDate(getTodayString());
    setRefundNotes('');
    setRefundDialogOpen(true);
  }

  function handleAddRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!refundTargetItem || !currentInvoice || !selectedCardId) return;
    const amt = parseFloat(refundAmount);
    if (!refundAmount || isNaN(amt) || amt <= 0) return toast.error('Informe um valor válido');
    addRefundMutation.mutate({
      invoiceId: currentInvoice.id,
      creditCardId: selectedCardId,
      originalItemId: refundTargetItem.id,
      description: refundDesc,
      amount: refundAmount,
      purchaseDate: refundDate,
      notes: refundNotes || null,
    });
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.description || !itemForm.amount || !selectedCardId) return toast.error("Preencha os campos obrigatórios");
    const targetInvoiceId = currentInvoice?.id ?? invoiceId;
    if (!targetInvoiceId) {
      getOrCreateInvoiceMutation.mutate({ creditCardId: selectedCardId, month, year });
      return;
    }
    const subcatId = itemForm.subcategoryId ? parseInt(itemForm.subcategoryId) : undefined;
    const subcat = subcatId ? allSubcats.find(s => s.id === subcatId) : undefined;
    // Usar parentCategory da própria subcategoria (campo adicionado na tabela)
    const parentCategory = (subcat as any)?.parentCategory || 'outros';
    addItemMutation.mutate({
      invoiceId: targetInvoiceId,
      creditCardId: selectedCardId,
      description: itemForm.description,
      amount: itemForm.amount,
      parentCategory: parentCategory as any,
      subcategoryId: subcatId,
      purchaseDate: itemForm.purchaseDate,
      installments: parseInt(itemForm.installments) || 1,
      notes: itemForm.notes || undefined,
    });
    // Se for recorrente, cria a regra de recorrência
    if (itemForm.isRecurring && selectedCardId) {
      createRecurringMutation.mutate({
        type: 'credit_card_item',
        description: itemForm.description,
        amount: itemForm.amount,
        creditCardId: selectedCardId,
        subcategoryId: subcatId,
        frequency: itemForm.frequency as any,
        startDate: itemForm.purchaseDate,
        endDate: itemForm.endDate || undefined,
        notes: itemForm.notes || undefined,
      });
    }
  }

  function openAddItem() {
    if (!selectedCardId) return;
    if (currentInvoice) {
      setInvoiceId(currentInvoice.id);
      setItemOpen(true);
    } else {
      getOrCreateInvoiceMutation.mutate({ creditCardId: selectedCardId, month, year });
    }
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const totalItems = items.reduce((s, i) => s + parseFloat(i.amount as string), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cartões de Crédito</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus cartões e faturas</p>
        </div>
        <Dialog open={cardOpen} onOpenChange={setCardOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Cartão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Cartão</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); createCardMutation.mutate({ name: cardForm.name, bank: cardForm.bank, lastFourDigits: cardForm.lastFourDigits, creditLimit: cardForm.creditLimit, closingDay: parseInt(cardForm.closingDay), dueDay: parseInt(cardForm.dueDay), color: cardForm.color }); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nome do Cartão *</Label><Input value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Nubank Luiz" required /></div>
                <div><Label>Banco</Label><Input value={cardForm.bank} onChange={e => setCardForm(f => ({ ...f, bank: e.target.value }))} placeholder="Nubank" /></div>
                <div><Label>Últimos 4 dígitos</Label><Input value={cardForm.lastFourDigits} onChange={e => setCardForm(f => ({ ...f, lastFourDigits: e.target.value }))} placeholder="1234" maxLength={4} /></div>
                <div><Label>Limite (R$) *</Label><Input type="number" step="0.01" value={cardForm.creditLimit} onChange={e => setCardForm(f => ({ ...f, creditLimit: e.target.value }))} required /></div>
                <div><Label>Dia de Fechamento *</Label><Input type="number" min="1" max="31" value={cardForm.closingDay} onChange={e => setCardForm(f => ({ ...f, closingDay: e.target.value }))} required /></div>
                <div><Label>Dia de Vencimento *</Label><Input type="number" min="1" max="31" value={cardForm.dueDay} onChange={e => setCardForm(f => ({ ...f, dueDay: e.target.value }))} required /></div>
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {CARD_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setCardForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: cardForm.color === c ? 'white' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createCardMutation.isPending}>
                {createCardMutation.isPending ? "Salvando..." : "Adicionar Cartão"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : cards.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum cartão cadastrado ainda.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.id}
              onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
              className={`relative rounded-xl p-5 cursor-pointer transition-all border-2 ${selectedCardId === card.id ? 'border-white/50 scale-[1.02]' : 'border-transparent hover:scale-[1.01]'}`}
              style={{ background: `linear-gradient(135deg, ${card.color || '#6366f1'}, ${card.color || '#6366f1'}99)` }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/70 text-xs uppercase tracking-wider">{card.bank || 'Cartão'}</p>
                  <p className="text-white font-bold text-lg">{card.name}</p>
                </div>
                <CreditCard className="text-white/60 w-8 h-8" />
              </div>
              <p className="text-white/60 text-sm">•••• •••• •••• {card.lastFourDigits || '****'}</p>
              <div className="flex justify-between items-end mt-3">
                <div>
                  <p className="text-white/60 text-xs">Limite</p>
                  <p className="text-white font-semibold">{formatCurrency(parseFloat(String(card.creditLimit)))}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs">Fecha dia {card.closingDay} · Vence dia {card.dueDay}</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button onClick={e => e.stopPropagation()} className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover cartão?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteCardMutation.mutate({ id: card.id })} className="bg-red-500 hover:bg-red-600">Remover</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Section */}
      {selectedCard && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Fatura — {selectedCard.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {MONTHS[month - 1].label} {year}
                  </span>
                  <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total da Fatura</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(currentInvoice ? parseFloat(String(currentInvoice.totalAmount)) : 0)}
                  </p>
                  {currentInvoice?.dueDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Vencimento: {formatDbDate(currentInvoice.dueDate)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {currentInvoice && statusBadge(currentInvoice.status)}
                  {currentInvoice && currentInvoice.status === 'paga' && (
                    <Button
                      variant="outline"
                      className="gap-2 border-amber-500 text-amber-500 hover:bg-amber-500/10"
                      onClick={() => {
                        if (confirm('Deseja estornar o pagamento desta fatura? As despesas lançadas automaticamente serão removidas e a fatura será reaberta.')) {
                          reversePaymentMutation.mutate({ invoiceId: currentInvoice.id });
                        }
                      }}
                      disabled={reversePaymentMutation.isPending}
                    >
                      <RotateCcw className="w-4 h-4" />
                      {reversePaymentMutation.isPending ? 'Estornando...' : 'Estornar Pagamento'}
                    </Button>
                  )}
                  {currentInvoice && (currentInvoice.status === 'aberta' || currentInvoice.status === 'fechada' || currentInvoice.status === 'parcialmente_paga') && items.length > 0 && (
                    <>
                      <Button
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => { setPayBankAccountId(''); setPayAmount(''); setPayMode('full'); setPayDialogOpen(true); }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {currentInvoice.status === 'parcialmente_paga' ? 'Continuar Pagamento' : 'Pagar Fatura'}
                      </Button>
                      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Wallet className="w-5 h-5" />
                              {currentInvoice.status === 'parcialmente_paga' ? 'Continuar Pagamento da Fatura' : 'Pagar Fatura'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total da fatura:</span>
                                <strong className="text-foreground">{formatCurrency(parseFloat(String(currentInvoice.totalAmount)))}</strong>
                              </div>
                              {currentInvoice.status === 'parcialmente_paga' && (
                                <>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Já pago:</span>
                                    <span className="text-emerald-400">{formatCurrency(parseFloat(String(currentInvoice.paidAmount || '0')))}</span>
                                  </div>
                                  <div className="flex justify-between text-sm font-semibold">
                                    <span className="text-muted-foreground">Saldo devedor:</span>
                                    <span className="text-red-400">{formatCurrency(parseFloat(String(currentInvoice.totalAmount)) - parseFloat(String(currentInvoice.paidAmount || '0')))}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Modo de pagamento */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setPayMode('full')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                  payMode === 'full'
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" />
                                Pagar total
                              </button>
                              <button
                                type="button"
                                onClick={() => setPayMode('partial')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                  payMode === 'partial'
                                    ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                                }`}
                              >
                                <Wallet className="w-3.5 h-3.5 inline mr-1.5" />
                                Adiantamento parcial
                              </button>
                            </div>
                            {payMode === 'partial' && (
                              <div className="space-y-1.5">
                                <Label htmlFor="pay-partial-amount">Valor do adiantamento (R$)</Label>
                                <Input
                                  id="pay-partial-amount"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={parseFloat(String(currentInvoice.totalAmount)) - parseFloat(String(currentInvoice.paidAmount || '0'))}
                                  value={payAmount}
                                  onChange={e => setPayAmount(e.target.value)}
                                  placeholder="Ex: 500.00"
                                />
                                <p className="text-xs text-muted-foreground">O valor será lançado como despesa na conta selecionada. A fatura ficará com status <em>Parcialmente Paga</em>.</p>
                              </div>
                            )}
                            <div className="space-y-1.5">
                              <Label htmlFor="pay-account">Conta para débito</Label>
                              <Select value={payBankAccountId} onValueChange={setPayBankAccountId}>
                                <SelectTrigger id="pay-account">
                                  <SelectValue placeholder="Selecione a conta (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sem conta específica</SelectItem>
                                  {bankAccounts.map(acc => (
                                    <SelectItem key={acc.id} value={String(acc.id)}>
                                      {acc.name}{acc.bank ? ` — ${acc.bank}` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">O valor será abatido do saldo da conta selecionada.</p>
                            </div>
                            {payMode === 'full' && (
                              <p className="text-xs text-muted-foreground">
                                Cada gasto será lançado em <strong>Despesas</strong> vinculado ao cartão {selectedCard.name}. A fatura será marcada como paga.
                              </p>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
                            <Button
                              className={payMode === 'partial' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                              onClick={handlePayInvoice}
                              disabled={payInvoiceMutation.isPending || partialPayMutation.isPending}
                            >
                              {(payInvoiceMutation.isPending || partialPayMutation.isPending)
                                ? 'Processando...'
                                : payMode === 'partial' ? 'Registrar Adiantamento' : 'Confirmar Pagamento'
                              }
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                  {(!currentInvoice || currentInvoice.status !== 'paga') && (
                    <>
                      <Button variant="outline" onClick={() => setCsvImportOpen(true)} className="gap-2">
                        <FileUp className="w-4 h-4" /> Importar CSV
                      </Button>
                      {selectedCardId && (
                        <CsvImportModal
                          open={csvImportOpen}
                          onOpenChange={setCsvImportOpen}
                          mode="creditCard"
                          creditCardId={selectedCardId}
                          onSuccess={() => { utils.creditCardInvoices.list.invalidate(); utils.creditCardInvoices.getItems.invalidate(); }}
                        />
                      )}
                      <Button onClick={openAddItem} className="gap-2" disabled={getOrCreateInvoiceMutation.isPending}>
                        <PlusCircle className="w-4 h-4" /> Adicionar Gasto
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum gasto nesta fatura ainda.</p>
                  <p className="text-xs mt-1">Clique em "Adicionar Gasto" para lançar um item.</p>
                </div>
              ) : (
                <>
                <div className="space-y-2">
                  {items.map(item => {
                    const isRefund = Number(item.isRefund) === 1;
                    const itemAmount = parseFloat(String(item.amount));
                    return (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isRefund ? 'bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10' : 'bg-muted/30 hover:bg-muted/50'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isRefund && <CornerDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          <p className={`font-medium text-sm truncate ${isRefund ? 'text-emerald-400' : 'text-foreground'}`}>{item.description}</p>
                          {isRefund && <Badge className="text-xs shrink-0 bg-emerald-400/15 text-emerald-400 border-0">Estorno</Badge>}
                          {!isRefund && item.totalInstallments > 1 && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {item.currentInstallment}/{item.totalInstallments}x
                            </Badge>
                          )}
{(() => {
                              const subcat = item.subcategoryId ? allSubcats.find((s: any) => s.id === item.subcategoryId) : null;
                              const group = subcat ? expenseGroups.find((g: any) => g.id === subcat.groupId) : null;
                              const subcatColor = (subcat as any)?.color || '#6366f1';
                              if (subcat) return (
                                <>
                                  <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: subcatColor + '60', color: subcatColor }}>
                                    <div className="w-1.5 h-1.5 rounded-full mr-1 inline-block" style={{ backgroundColor: subcatColor }} />
                                    {subcat.name}
                                  </Badge>
                                  {group && <Badge variant="secondary" className="text-xs shrink-0 text-muted-foreground">{group.name}</Badge>}
                                </>
                              );
                              if (!isRefund) return <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">Sem categoria</Badge>;
                              return null;
                            })()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDbDate(item.purchaseDate)}
                          {item.notes && ` · ${item.notes}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        <p className={`font-semibold ${isRefund ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isRefund ? '+' : ''}{formatCurrency(Math.abs(itemAmount))}
                        </p>
                        <div className="flex items-center gap-1">
                          {!isRefund && (
                            <button
                              onClick={() => openRefundDialog(item)}
                              className="text-muted-foreground hover:text-emerald-400 transition-colors p-1"
                              title="Registrar estorno"
                            >
                              <CornerDownLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isRefund && (
                            <button onClick={() => openEditItem(item)} className="text-muted-foreground hover:text-blue-400 transition-colors p-1" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (currentInvoice?.status === 'paga') {
                                if (!confirm('Esta fatura já está paga. Excluir este item irá alterar o total da fatura. Deseja continuar?')) return;
                              }
                              removeItemMutation.mutate({ itemId: item.id });
                            }}
                            className="text-muted-foreground hover:text-red-400 transition-colors p-1" title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-sm font-medium text-muted-foreground">{items.length} item(s)</span>
                    <span className="font-bold text-foreground">{formatCurrency(totalItems)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Gasto</DialogTitle></DialogHeader>
          <form onSubmit={handleEditItem} className="space-y-3 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-item-desc">Descrição *</Label>
              <Input id="edit-item-desc" value={editItemForm.description} onChange={e => setEditItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-item-amount">Valor (R$) *</Label>
                <Input id="edit-item-amount" type="number" step="0.01" min="0.01" value={editItemForm.amount} onChange={e => setEditItemForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-item-date">Data da Compra *</Label>
                <Input id="edit-item-date" type="date" value={editItemForm.purchaseDate} onChange={e => setEditItemForm(f => ({ ...f, purchaseDate: e.target.value }))} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-item-subcat">Categoria 50/30/20 <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={editItemForm.subcategoryId || 'none'} onValueChange={v => setEditItemForm(f => ({ ...f, subcategoryId: v === 'none' ? '' : v }))}>
                <SelectTrigger id="edit-item-subcat"><SelectValue placeholder="Selecione uma subcategoria..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem subcategoria</SelectItem>
                  {expenseGroups.map(group => {
                    const groupSubcats = allSubcats.filter(s => s.groupId === group.id);
                    if (groupSubcats.length === 0) return null;
                    return (
                      <div key={group.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.name}</div>
                        {groupSubcats.map(sub => (
                          <SelectItem key={sub.id} value={String(sub.id)}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color || '#6366f1' }} />
                              {sub.name}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-item-notes">Observações <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="edit-item-notes" value={editItemForm.notes} onChange={e => setEditItemForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Compra parcelada" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditItemOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={updateItemMutation.isPending}>
                {updateItemMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Gasto na Fatura</DialogTitle></DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-3 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-desc">Descrição *</Label>
              <Input id="item-desc" value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-amount">Valor (R$) *</Label>
                <Input id="item-amount" type="number" step="0.01" min="0.01" value={itemForm.amount} onChange={e => setItemForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="item-date">Data da Compra *</Label>
                <Input id="item-date" type="date" value={itemForm.purchaseDate} onChange={e => setItemForm(f => ({ ...f, purchaseDate: e.target.value }))} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-subcat">Categoria 50/30/20 <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <Select
                value={itemForm.subcategoryId || "none"}
                onValueChange={v => setItemForm(f => ({ ...f, subcategoryId: v === "none" ? "" : v }))}
              >
                <SelectTrigger id="item-subcat"><SelectValue placeholder="Selecione uma subcategoria..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem subcategoria</SelectItem>
                  {expenseGroups.map(group => {
                    const groupSubcats = allSubcats.filter(s => s.groupId === group.id);
                    if (groupSubcats.length === 0) return null;
                    return (
                      <div key={group.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.name}
                        </div>
                        {groupSubcats.map(sub => (
                          <SelectItem key={sub.id} value={String(sub.id)}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color || "#6366f1" }} />
                              {sub.name}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-installments">Parcelas</Label>
              <Input id="item-installments" type="number" min="1" max="72" value={itemForm.installments} onChange={e => setItemForm(f => ({ ...f, installments: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-notes">Observações <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="item-notes" value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: Compra parcelada" />
            </div>
            {parseInt(itemForm.installments) > 1 && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
                As parcelas 2 a {itemForm.installments} serão lançadas automaticamente nas faturas dos próximos meses.
              </div>
            )}
            {/* Recorrência */}
            <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="item-recurring"
                  checked={itemForm.isRecurring}
                  onCheckedChange={v => setItemForm(f => ({ ...f, isRecurring: !!v }))}
                />
                <Label htmlFor="item-recurring" className="flex items-center gap-1.5 cursor-pointer font-medium">
                  <Repeat className="w-3.5 h-3.5 text-primary" />
                  Gasto recorrente
                </Label>
              </div>
              {itemForm.isRecurring && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Frequência</Label>
                    <Select value={itemForm.frequency} onValueChange={v => setItemForm(f => ({ ...f, frequency: v }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="yearly">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data de encerramento</Label>
                    <Input type="date" value={itemForm.endDate} onChange={e => setItemForm(f => ({ ...f, endDate: e.target.value }))} className="h-8 text-sm" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setItemOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={addItemMutation.isPending}>
                {addItemMutation.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Estorno de Item */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CornerDownLeft className="w-5 h-5 text-emerald-400" />
              Registrar Estorno
            </DialogTitle>
          </DialogHeader>
          {refundTargetItem && (
            <form onSubmit={handleAddRefund} className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="text-muted-foreground">Item original:</p>
                <p className="font-medium text-foreground">{refundTargetItem.description}</p>
                <p className="text-red-400 font-semibold">{formatCurrency(parseFloat(String(refundTargetItem.amount)))}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="refund-desc">Descrição do estorno *</Label>
                <Input
                  id="refund-desc"
                  value={refundDesc}
                  onChange={e => setRefundDesc(e.target.value)}
                  placeholder="Ex: Estorno: Supermercado"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="refund-amount">Valor do estorno (R$) *</Label>
                  <Input
                    id="refund-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={parseFloat(String(refundTargetItem.amount))}
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Máx: {formatCurrency(parseFloat(String(refundTargetItem.amount)))}</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="refund-date">Data do estorno *</Label>
                  <Input
                    id="refund-date"
                    type="date"
                    value={refundDate}
                    onChange={e => setRefundDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="refund-notes">Observações <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="refund-notes"
                  value={refundNotes}
                  onChange={e => setRefundNotes(e.target.value)}
                  placeholder="Ex: Produto devolvido"
                />
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                O estorno aparecerá como crédito (valor positivo em verde) na fatura e reduzirá o total.
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setRefundDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={addRefundMutation.isPending}>
                  {addRefundMutation.isPending ? 'Registrando...' : 'Confirmar Estorno'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
