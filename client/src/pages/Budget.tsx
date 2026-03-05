import { trpc } from "@/lib/trpc";
import { formatCurrency, formatPercent, getCategoryInfo, EXPENSE_CATEGORIES, getCurrentMonth, getCurrentYear } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Wallet, TrendingDown, TrendingUp, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1);
  return { value: i + 1, label: d.toLocaleDateString('pt-BR', { month: 'long' }) };
});
const _cy = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => _cy - 5 + i);

export default function Budget() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'alimentacao', budgetedAmount: '', plannedAmount: '' });

  const utils = trpc.useUtils();
  const { data: budgets = [], isLoading } = trpc.budgets.list.useQuery({ month, year });
  const createMutation = trpc.budgets.upsert.useMutation({
    onSuccess: () => { utils.budgets.list.invalidate(); setOpen(false); setForm({ category: 'alimentacao', budgetedAmount: '', plannedAmount: '' }); toast.success("Meta de orçamento adicionada!"); },
    onError: () => toast.error("Erro ao salvar orçamento"),
  });

  const totalBudgeted = budgets.reduce((s: number, b: any) => s + parseFloat(b.budgetedAmount), 0);
  const totalSpent = budgets.reduce((s: number, b: any) => s + parseFloat(b.actualAmount ?? '0'), 0);
  const totalRemaining = totalBudgeted - totalSpent;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.budgetedAmount) return toast.error("Informe o valor orçado");
    createMutation.mutate({ category: form.category as any, plannedAmount: form.budgetedAmount, month, year });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Orçamento</h1>
          <p className="text-muted-foreground text-sm mt-1">Defina e acompanhe suas metas mensais</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36 bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label.charAt(0).toUpperCase() + m.label.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={v => { setOpen(v); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Nova Meta de Orçamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Valor Orçado (R$) *</Label>
                  <Input type="number" step="0.01" value={form.budgetedAmount} onChange={e => setForm(f => ({ ...f, budgetedAmount: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createMutation.isPending}>Adicionar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Orçado', value: totalBudgeted, icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Gasto', value: totalSpent, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10' },
          { label: 'Disponível', value: totalRemaining, icon: Wallet, color: totalRemaining >= 0 ? 'text-emerald-400' : 'text-red-400', bg: totalRemaining >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10' },
        ].map(item => (
          <Card key={item.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Budget Items */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : budgets.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma meta definida para este mês</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Clique em "Nova Meta" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map((budget: any) => {
            const cat = getCategoryInfo(budget.category);
            const spent = parseFloat(budget.actualAmount ?? '0');
            const budgeted = parseFloat(budget.budgetedAmount);
            const pct = budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0;
            const isOver = spent > budgeted;
            return (
              <Card key={budget.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ backgroundColor: cat.color + '20' }}>
                        {cat.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{cat.label}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(spent)} de {formatCurrency(budgeted)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isOver ? '−' : '+'}{formatCurrency(Math.abs(budgeted - spent))}
                      </p>
                      <p className={`text-xs ${isOver ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {formatPercent(pct)}
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    className="h-2"
                    style={{ '--progress-color': isOver ? '#ef4444' : cat.color } as any}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
