import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, INVESTMENT_TYPES, getTodayString } from "@/lib/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, PiggyBank, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type InvestForm = { name: string; type: string; institution: string; investedAmount: string; currentValue: string; startDate: string; notes: string; };
const emptyForm: InvestForm = { name: '', type: 'cdb', institution: '', investedAmount: '', currentValue: '', startDate: getTodayString(), notes: '' };

export default function Investments() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InvestForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: investments = [], isLoading } = trpc.investments.list.useQuery();
  const createMutation = trpc.investments.create.useMutation({
    onSuccess: () => { utils.investments.list.invalidate(); setOpen(false); setForm(emptyForm); toast.success("Investimento adicionado!"); },
    onError: () => toast.error("Erro ao salvar investimento"),
  });
  const deleteMutation = trpc.investments.delete.useMutation({
    onSuccess: () => { utils.investments.list.invalidate(); toast.success("Investimento removido!"); },
    onError: () => toast.error("Erro ao remover investimento"),
  });

  const totalInvested = investments.reduce((s: number, i: any) => s + parseFloat(i.initialAmount ?? i.investedAmount ?? '0'), 0);
  const totalCurrent = investments.reduce((s: number, i: any) => s + parseFloat(i.currentAmount ?? i.currentValue ?? i.initialAmount ?? '0'), 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.investedAmount) return toast.error("Preencha os campos obrigatórios");
    createMutation.mutate({ name: form.name, type: form.type as any, initialAmount: form.investedAmount, currentAmount: form.currentValue || form.investedAmount, institution: form.institution, investedAt: form.startDate, notes: form.notes });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Investimentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe sua carteira de investimentos</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Novo Investimento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Novo Investimento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: CDB Banco XP" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>{INVESTMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Instituição</Label>
                  <Input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Ex: XP Investimentos" className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Valor Investido (R$) *</Label>
                  <Input type="number" step="0.01" value={form.investedAmount} onChange={e => setForm(f => ({ ...f, investedAmount: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Valor Atual (R$)</Label>
                  <Input type="number" step="0.01" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Data de Início</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-input border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Observações</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" className="bg-input border-border text-foreground" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createMutation.isPending}>Adicionar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center shrink-0">
                <PiggyBank className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Investido</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalInvested)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Atual</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalCurrent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${totalReturn >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10'}`}>
                {totalReturn >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rentabilidade</p>
                <p className={`text-lg font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalReturn >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : investments.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <PiggyBank className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum investimento cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {investments.map((inv: any) => {
            const current = parseFloat(inv.currentAmount ?? inv.currentValue ?? inv.initialAmount ?? '0');
            const invested = parseFloat(inv.initialAmount ?? inv.investedAmount ?? '0');
            const ret = current - invested;
            const retPct = invested > 0 ? (ret / invested) * 100 : 0;
            const typeLabel = INVESTMENT_TYPES.find(t => t.value === inv.type)?.label ?? inv.type;
            return (
              <Card key={inv.id} className="bg-card border-border group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{inv.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                        {inv.institution && <span className="text-xs text-muted-foreground">{inv.institution}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" onClick={() => deleteMutation.mutate({ id: inv.id })}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Investido</span>
                      <span className="text-foreground font-medium">{formatCurrency(inv.initialAmount ?? inv.investedAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Atual</span>
                      <span className="text-foreground font-medium">{formatCurrency(current)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rendimento</span>
                      <span className={`font-semibold ${ret >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ret >= 0 ? '+' : ''}{formatCurrency(ret)} ({retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%)
                      </span>
                    </div>
                    {inv.startDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Início</span>
                        <span className="text-foreground">{formatDate(inv.startDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
