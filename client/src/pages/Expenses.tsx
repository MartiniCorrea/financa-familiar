import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getCurrentMonth, getCurrentYear, getTodayString } from "@/lib/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, TrendingDown, Search, Layers, X, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1);
  return { value: i + 1, label: d.toLocaleDateString('pt-BR', { month: 'long' }) };
});
const _cy = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => _cy - 5 + i);
const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' }, { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' }, { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' }, { value: 'boleto', label: 'Boleto' }, { value: 'outros', label: 'Outros' },
];

type ExpenseForm = {
  description: string; amount: string; date: string;
  paymentMethod: string; installments: string; notes: string;
  subcategoryId: string; bankAccountId: string;
};

const emptyForm: ExpenseForm = {
  description: '', amount: '', date: getTodayString(),
  paymentMethod: 'outros', installments: '1', notes: '', subcategoryId: '', bankAccountId: '',
};

export default function Expenses() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [search, setSearch] = useState('');
  const [subcatFilter, setSubcatFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [detailExpense, setDetailExpense] = useState<any | null>(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const utils = trpc.useUtils();
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery();
  const { data: expenses = [], isLoading } = trpc.expenses.list.useQuery({ month, year });
  // Busca grupos e subcategorias para o seletor 50/30/20
  const { data: expenseGroups = [] } = trpc.expenseGroups.list.useQuery();
  const { data: allSubcats = [] } = trpc.expenseGroups.subcategories.list.useQuery({});

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); utils.dashboard.summary.invalidate(); utils.expenseGroups.summary.invalidate(); setOpen(false); setForm(emptyForm); toast.success("Despesa adicionada!"); },
    onError: () => toast.error("Erro ao salvar despesa"),
  });
  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); utils.dashboard.summary.invalidate(); utils.expenseGroups.summary.invalidate(); setOpen(false); setEditId(null); setForm(emptyForm); toast.success("Despesa atualizada!"); },
    onError: () => toast.error("Erro ao atualizar despesa"),
  });
  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => { utils.expenses.list.invalidate(); utils.dashboard.summary.invalidate(); toast.success("Despesa removida!"); },
    onError: () => toast.error("Erro ao remover despesa"),
  });

  const filtered = expenses.filter(e =>
    e.description.toLowerCase().includes(search.toLowerCase()) &&
    (subcatFilter === 'all' || String((e as any).subcategoryId) === subcatFilter)
  );
  const total = filtered.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    if (!form.description || !form.amount || !form.date) return toast.error("Preencha os campos obrigatórios");
    const payload = {
      description: form.description,
      amount: form.amount,
      date: form.date,
      notes: form.notes || undefined,
      parentCategory: 'outros' as any,
      paymentMethod: form.paymentMethod as any,
      installments: parseInt(form.installments) || 1,
      subcategoryId: form.subcategoryId ? parseInt(form.subcategoryId) : undefined,
      bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId) : undefined,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload, bankAccountId: payload.bankAccountId ?? null });
    else createMutation.mutate(payload);
  }

  function openDetail(expense: any) {
    setDetailExpense(expense);
    setDetailNotes(expense.notes ?? '');
  }

  async function saveDetailNotes() {
    if (!detailExpense) return;
    setSavingNotes(true);
    updateMutation.mutate({ id: detailExpense.id, notes: detailNotes || undefined });
    setSavingNotes(false);
    setDetailExpense((prev: any) => prev ? { ...prev, notes: detailNotes } : null);
  }

  function openEdit(expense: any) {
    setEditId(expense.id);
    setForm({
      description: expense.description, amount: expense.amount,
      date: typeof expense.date === 'string' ? expense.date : new Date(expense.date).toISOString().split('T')[0],
      paymentMethod: expense.paymentMethod ?? 'outros',
      installments: String(expense.installments ?? 1),
      notes: expense.notes ?? '',
      subcategoryId: expense.subcategoryId ? String(expense.subcategoryId) : '',
      bankAccountId: expense.bankAccountId ? String(expense.bankAccountId) : '',
    });
    setOpen(true);
  }

  // Encontra a subcategoria de uma despesa para exibir na lista
  function getSubcatInfo(subcategoryId: number | null | undefined) {
    if (!subcategoryId) return null;
    const sub = allSubcats.find(s => s.id === subcategoryId);
    if (!sub) return null;
    const group = expenseGroups.find(g => g.id === sub.groupId);
    return { sub, group };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Despesas</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle todos os seus gastos</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Descrição *</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Supermercado, Conta de luz..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Data *</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              {/* Categoria 50/30/20 */}
              <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Categoria 50/30/20
                    <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Select
                    value={form.subcategoryId || "none"}
                    onValueChange={v => setForm(f => ({ ...f, subcategoryId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma subcategoria..." />
                    </SelectTrigger>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Parcelas</Label>
                  <Input type="number" min="1" max="48" value={form.installments} onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Conta Bancária</Label>
                <Select value={form.bankAccountId} onValueChange={v => setForm(f => ({ ...f, bankAccountId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a conta (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta específica</SelectItem>
                    {bankAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}{acc.bank ? ` — ${acc.bank}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editId ? 'Salvar' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar despesas..." className="pl-9" />
        </div>
        <Select value={subcatFilter} onValueChange={setSubcatFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
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
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total do Período</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(total)}</p>
              </div>
            </div>
            <Badge variant="secondary">{filtered.length} {filtered.length === 1 ? 'despesa' : 'despesas'}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingDown className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma despesa encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(expense => {
                const isInstallment = (expense.installments ?? 1) > 1;
                const subcatInfo = getSubcatInfo((expense as any).subcategoryId);
                const subcatColor = subcatInfo?.sub.color || '#6366f1';
                return (
                  <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-accent/20 transition-colors group cursor-pointer" onClick={() => openDetail(expense)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: subcatColor + '20' }}>
                        <span className="text-sm font-bold" style={{ color: subcatColor }}>{expense.description.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{expense.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{formatDate(expense.date as any)}</span>
                          {subcatInfo ? (
                            <>
                              <Badge variant="outline" className="text-xs px-1.5 py-0" style={{ borderColor: subcatColor + '60', color: subcatColor }}>
                                <div className="w-1.5 h-1.5 rounded-full mr-1 inline-block" style={{ backgroundColor: subcatColor }} />
                                {subcatInfo.sub.name}
                              </Badge>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 text-muted-foreground">{subcatInfo.group?.name}</Badge>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">Sem categoria</Badge>
                          )}
                          {isInstallment && <Badge variant="secondary" className="text-xs px-1.5 py-0">{expense.currentInstallment}/{expense.installments}x</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-base font-semibold text-destructive">{formatCurrency(expense.amount)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(expense)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: expense.id })}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!detailExpense} onOpenChange={v => { if (!v) setDetailExpense(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailExpense && (() => {
            const subcatInfo = getSubcatInfo(detailExpense.subcategoryId);
            const subcatColor = subcatInfo?.sub.color || '#6366f1';
            const isCard = detailExpense.sourceType === 'cartao_credito';
            const bankAcc = bankAccounts.find(b => b.id === detailExpense.bankAccountId);
            return (
              <>
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: subcatColor + '20' }}>
                      <span className="text-sm font-bold" style={{ color: subcatColor }}>{detailExpense.description.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="truncate">{detailExpense.description}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Valor</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(parseFloat(detailExpense.amount))}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Data</p>
                      <p className="text-sm font-medium">{formatDate(detailExpense.date)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Categoria</p>
                      <p className="text-sm font-medium">{subcatInfo ? subcatInfo.sub.name : 'Sem categoria'}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Pagamento</p>
                      <p className="text-sm font-medium capitalize">{detailExpense.paymentMethod || 'outros'}</p>
                    </div>
                  </div>
                  {bankAcc && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Conta</p>
                      <p className="text-sm font-medium">{bankAcc.name}{bankAcc.bank ? ` — ${bankAcc.bank}` : ''}</p>
                    </div>
                  )}
                  {isCard && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-500/10 rounded-lg p-3">
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                      <span>Lançado automaticamente ao pagar fatura do cartão</span>
                    </div>
                  )}
                  {(detailExpense.installments ?? 1) > 1 && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Parcelas</p>
                      <p className="text-sm font-medium">{detailExpense.currentInstallment}/{detailExpense.installments}x</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Observações</Label>
                    <Textarea
                      value={detailNotes}
                      onChange={e => setDetailNotes(e.target.value)}
                      placeholder="Adicione observações sobre esta despesa..."
                      rows={3}
                    />
                    <Button size="sm" onClick={saveDetailNotes} disabled={savingNotes || updateMutation.isPending}>
                      {updateMutation.isPending ? 'Salvando...' : 'Salvar Observações'}
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => { setDetailExpense(null); openEdit(detailExpense); }}>
                      <Pencil className="w-3.5 h-3.5" /> Editar Despesa
                    </Button>
                    <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={() => { deleteMutation.mutate({ id: detailExpense.id }); setDetailExpense(null); }}>
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
