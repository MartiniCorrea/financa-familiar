import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getDaysUntilDue, getTodayString } from "@/lib/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, CheckCircle, Receipt, ArrowDownRight, ArrowUpRight, Clock, AlertTriangle, Layers } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type BillForm = { description: string; amount: string; type: 'pagar' | 'receber'; dueDate: string; notes: string; subcategoryId: string; bankAccountId: string; };
const emptyForm: BillForm = { description: '', amount: '', type: 'pagar', dueDate: getTodayString(), notes: '', subcategoryId: '', bankAccountId: '' };

export default function Bills() {
  const [tab, setTab] = useState('pendente');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BillForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: bankAccounts = [] } = trpc.bankAccounts.list.useQuery();
  const { data: bills = [], isLoading } = trpc.bills.list.useQuery({ status: tab === 'todos' ? undefined : tab as any });
  const { data: expenseGroups = [] } = trpc.expenseGroups.list.useQuery();
  const { data: allSubcats = [] } = trpc.expenseGroups.subcategories.list.useQuery({});
  const createMutation = trpc.bills.create.useMutation({
    onSuccess: () => { utils.bills.list.invalidate(); utils.dashboard.summary.invalidate(); setOpen(false); setForm(emptyForm); toast.success("Conta adicionada!"); },
    onError: () => toast.error("Erro ao salvar conta"),
  });
  const deleteMutation = trpc.bills.delete.useMutation({
    onSuccess: () => { utils.bills.list.invalidate(); toast.success("Conta removida!"); },
    onError: () => toast.error("Erro ao remover conta"),
  });
  const markPaidMutation = trpc.bills.markAsPaid.useMutation({
    onSuccess: () => { utils.bills.list.invalidate(); utils.dashboard.summary.invalidate(); toast.success("Conta marcada como paga!"); },
    onError: () => toast.error("Erro ao marcar como paga"),
  });

  const toPay = bills.filter(b => b.type === 'pagar');
  const toReceive = bills.filter(b => b.type === 'receber');
  const totalToPay = toPay.reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalToReceive = toReceive.reduce((s, b) => s + parseFloat(b.amount), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount || !form.dueDate) return toast.error("Preencha os campos obrigatórios");
    const payload = {
      description: form.description,
      amount: form.amount,
      type: form.type,
      dueDate: form.dueDate,
      notes: form.notes || undefined,
      category: 'outros' as any,
      subcategoryId: form.subcategoryId ? parseInt(form.subcategoryId) : undefined,
      bankAccountId: form.bankAccountId ? parseInt(form.bankAccountId) : undefined,
    };
    createMutation.mutate(payload);
  }

  function getStatusBadge(bill: any) {
    const days = getDaysUntilDue(bill.dueDate);
    if (bill.status === 'pago') return <Badge className="bg-emerald-400/20 text-emerald-400 border-0 text-xs">Pago</Badge>;
    if (bill.status === 'vencido' || days < 0) return <Badge className="bg-red-400/20 text-red-400 border-0 text-xs">Vencido</Badge>;
    if (days <= 3) return <Badge className="bg-amber-400/20 text-amber-400 border-0 text-xs">Urgente</Badge>;
    return <Badge className="bg-blue-400/20 text-blue-400 border-0 text-xs">Pendente</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Contas</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de contas a pagar e receber</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nova Conta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Descrição *</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Aluguel" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Vencimento *</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagar">A Pagar</SelectItem>
                    <SelectItem value="receber">A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Categoria 50/30/20
                  <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Select value={form.subcategoryId || "none"} onValueChange={v => setForm(f => ({ ...f, subcategoryId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma categoria..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {expenseGroups.map(group => {
                      const groupSubcats = allSubcats.filter(s => s.groupId === group.id);
                      if (groupSubcats.length === 0) return null;
                      return (
                        <div key={group.id}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.name}</div>
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
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createMutation.isPending}>Adicionar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-400/10 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">A Pagar</p>
                <p className="text-lg font-bold text-red-400">{formatCurrency(totalToPay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-400/10 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">A Receber</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalToReceive)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="pendente" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="w-3.5 h-3.5 mr-1.5" /> Pendentes
          </TabsTrigger>
          <TabsTrigger value="vencido" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Vencidas
          </TabsTrigger>
          <TabsTrigger value="pago" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Pagas
          </TabsTrigger>
          <TabsTrigger value="todos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : bills.length === 0 ? (
                <div className="p-8 text-center">
                  <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhuma conta encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {bills.map(bill => {
                    const days = getDaysUntilDue(bill.dueDate);
                    return (
                      <div key={bill.id} className="flex items-center justify-between p-4 hover:bg-accent/20 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bill.type === 'pagar' ? 'bg-red-400/10' : 'bg-emerald-400/10'}`}>
                            {bill.type === 'pagar' ? <ArrowDownRight className="w-4 h-4 text-red-400" /> : <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{bill.description}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">Vence {formatDate(bill.dueDate as any)}</span>
                              {bill.status === 'pendente' && days >= 0 && days <= 7 && (
                                <span className="text-xs text-amber-400">{days === 0 ? 'Hoje!' : `${days}d`}</span>
                              )}
                              {getStatusBadge(bill)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className={`text-base font-semibold ${bill.type === 'pagar' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatCurrency(bill.amount)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {bill.status === 'pendente' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markPaidMutation.mutate({ id: bill.id })}>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: bill.id })}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
