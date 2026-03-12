import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getIncomeCategoryInfo, INCOME_CATEGORIES, getCurrentMonth, getCurrentYear, getTodayString } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, TrendingUp, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1);
  return { value: i + 1, label: d.toLocaleDateString('pt-BR', { month: 'long' }) };
});
const _cy = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => _cy - 5 + i);

type IncomeForm = {
  description: string;
  amount: string;
  category: string;
  date: string;
  notes: string;
  bankAccountId: string;
};

const emptyForm: IncomeForm = {
  description: '',
  amount: '',
  category: 'salario',
  date: getTodayString(),
  notes: '',
  bankAccountId: '',
};

export default function Incomes() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<IncomeForm>(emptyForm);
  const [detailIncome, setDetailIncome] = useState<any | null>(null);
  const [detailNotes, setDetailNotes] = useState('');

  const utils = trpc.useUtils();
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery();
  const { data: incomes = [], isLoading } = trpc.incomes.list.useQuery({ month, year });
  const createMutation = trpc.incomes.create.useMutation({
    onSuccess: () => { utils.incomes.list.invalidate(); utils.dashboard.summary.invalidate(); setOpen(false); setForm(emptyForm); toast.success("Receita adicionada!"); },
    onError: () => toast.error("Erro ao salvar receita"),
  });
  const updateMutation = trpc.incomes.update.useMutation({
    onSuccess: () => { utils.incomes.list.invalidate(); utils.dashboard.summary.invalidate(); setOpen(false); setEditId(null); setForm(emptyForm); toast.success("Receita atualizada!"); },
    onError: () => toast.error("Erro ao atualizar receita"),
  });
  const deleteMutation = trpc.incomes.delete.useMutation({
    onSuccess: () => { utils.incomes.list.invalidate(); utils.dashboard.summary.invalidate(); toast.success("Receita removida!"); },
    onError: () => toast.error("Erro ao remover receita"),
  });

  const filtered = incomes.filter(i => i.description.toLowerCase().includes(search.toLowerCase()));
  const total = filtered.reduce((sum, i) => sum + parseFloat(i.amount), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) return toast.error("Preencha os campos obrigatórios");
    const bankAccountId = form.bankAccountId ? parseInt(form.bankAccountId) : undefined;
    const payload = {
      description: form.description,
      amount: form.amount,
      category: form.category as any,
      date: form.date,
      notes: form.notes || undefined,
      bankAccountId,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload, bankAccountId: bankAccountId ?? null });
    } else {
      createMutation.mutate(payload);
    }
  }

  function openDetail(income: any) {
    setDetailIncome(income);
    setDetailNotes(income.notes ?? '');
  }

  function openEdit(income: any) {
    setEditId(income.id);
    setForm({
      description: income.description,
      amount: income.amount,
      category: income.category,
      date: typeof income.date === 'string' ? income.date : new Date(income.date).toISOString().split('T')[0],
      notes: income.notes ?? '',
      bankAccountId: income.bankAccountId ? String(income.bankAccountId) : '',
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Receitas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie todas as suas entradas financeiras</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editId ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Descrição *</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Salário mensal" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Data *</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Conta Bancária</Label>
                <Select value={form.bankAccountId} onValueChange={v => setForm(f => ({ ...f, bankAccountId: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue placeholder="Selecione a conta (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem conta específica</SelectItem>
                    {bankAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}{acc.bank ? ` — ${acc.bank}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Observações</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" className="bg-input border-border text-foreground" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createMutation.isPending || updateMutation.isPending}>
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar receitas..." className="pl-9 bg-card border-border text-foreground" />
        </div>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total do Período</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(total)}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'receita' : 'receitas'}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma receita encontrada</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Adicione sua primeira receita clicando no botão acima</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(income => {
                const cat = getIncomeCategoryInfo(income.category);
                return (
                  <div key={income.id} className="flex items-center justify-between p-4 hover:bg-accent/20 transition-colors group cursor-pointer" onClick={() => openDetail(income)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                        {cat.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{income.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDate(income.date as any)}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0" style={{ borderColor: cat.color + '40', color: cat.color }}>{cat.label}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-base font-semibold text-emerald-400">{formatCurrency(income.amount)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(income)}>
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: income.id })}>
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
      <Sheet open={!!detailIncome} onOpenChange={v => { if (!v) setDetailIncome(null); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailIncome && (() => {
            const cat = getIncomeCategoryInfo(detailIncome.category);
            const bankAcc = bankAccounts.find((b: any) => b.id === detailIncome.bankAccountId);
            return (
              <>
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: cat.color + '20' }}>
                      {cat.icon}
                    </div>
                    <span className="truncate">{detailIncome.description}</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Valor</p>
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(parseFloat(detailIncome.amount))}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Data</p>
                      <p className="text-sm font-medium">{formatDate(detailIncome.date)}</p>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Categoria</p>
                    <p className="text-sm font-medium">{cat.label}</p>
                  </div>
                  {bankAcc && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Conta</p>
                      <p className="text-sm font-medium">{bankAcc.name}{bankAcc.bank ? ` — ${bankAcc.bank}` : ''}</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Observações</Label>
                    <Textarea
                      value={detailNotes}
                      onChange={e => setDetailNotes(e.target.value)}
                      placeholder="Adicione observações sobre esta receita..."
                      rows={3}
                    />
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: detailIncome.id, notes: detailNotes || undefined })} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Salvando...' : 'Salvar Observações'}
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" className="flex-1 gap-2" onClick={() => { setDetailIncome(null); openEdit(detailIncome); }}>
                      <Pencil className="w-3.5 h-3.5" /> Editar Receita
                    </Button>
                    <Button variant="outline" className="gap-2 border-destructive text-destructive hover:bg-destructive/10" onClick={() => { deleteMutation.mutate({ id: detailIncome.id }); setDetailIncome(null); }}>
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
