import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Wallet, Building2, PiggyBank, Briefcase, TrendingUp,
  TrendingDown, ArrowUpRight, ArrowDownRight, ChevronRight, X, RefreshCw, ArrowLeftRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const ACCOUNT_TYPES = [
  { value: "corrente", label: "Conta Corrente", icon: Building2, color: "#6366f1" },
  { value: "poupanca", label: "Poupança", icon: PiggyBank, color: "#22c55e" },
  { value: "carteira", label: "Carteira", icon: Wallet, color: "#f59e0b" },
  { value: "investimento", label: "Investimento", icon: Briefcase, color: "#3b82f6" },
  { value: "outro", label: "Outro", icon: Wallet, color: "#8b5cf6" },
];

const PRESET_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

const POPULAR_BANKS = [
  "Nubank", "Itaú", "Bradesco", "Santander", "Banco do Brasil",
  "Caixa Econômica", "Inter", "C6 Bank", "BTG Pactual", "XP",
  "Sicoob", "Sicredi", "Mercado Pago", "PicPay", "Outro",
];

const emptyForm = {
  name: "",
  bank: "",
  type: "corrente" as const,
  color: "#6366f1",
  initialBalance: "0",
};

type FormState = typeof emptyForm;

const emptyTransferForm = { fromAccountId: '', toAccountId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], notes: '' };

export default function BankAccounts() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ ...emptyTransferForm });

  const { data: accounts, refetch } = trpc.bankAccounts.listWithBalance.useQuery();
  const { data: transactions, isLoading: txLoading } = trpc.bankAccounts.getTransactions.useQuery(
    { accountId: selectedAccountId! },
    { enabled: selectedAccountId !== null }
  );

  const utils = trpc.useUtils();

  const createMutation = trpc.bankAccounts.create.useMutation({
    onSuccess: () => { refetch(); utils.bankAccounts.listWithBalance.invalidate(); setShowModal(false); toast.success("Conta criada com sucesso!"); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = trpc.bankAccounts.update.useMutation({
    onSuccess: () => { refetch(); utils.bankAccounts.listWithBalance.invalidate(); setShowModal(false); toast.success("Conta atualizada!"); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = trpc.bankAccounts.delete.useMutation({
    onSuccess: () => { refetch(); utils.bankAccounts.listWithBalance.invalidate(); setShowDeleteConfirm(null); if (selectedAccountId === showDeleteConfirm) setSelectedAccountId(null); toast.success("Conta removida!"); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const transferMutation = trpc.accountTransfers.create.useMutation({
    onSuccess: () => {
      refetch();
      utils.bankAccounts.listWithBalance.invalidate();
      utils.bankAccounts.getTransactions.invalidate();
      setShowTransferModal(false);
      setTransferForm({ ...emptyTransferForm });
      toast.success('Transferência realizada com sucesso!');
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  function handleTransfer() {
    const amount = parseFloat(transferForm.amount.replace(',', '.'));
    if (!transferForm.fromAccountId || !transferForm.toAccountId) { toast.error('Selecione as contas de origem e destino'); return; }
    if (transferForm.fromAccountId === transferForm.toAccountId) { toast.error('As contas de origem e destino devem ser diferentes'); return; }
    if (isNaN(amount) || amount <= 0) { toast.error('Valor inválido'); return; }
    if (!transferForm.description.trim()) { toast.error('Informe uma descrição'); return; }
    transferMutation.mutate({
      fromAccountId: parseInt(transferForm.fromAccountId),
      toAccountId: parseInt(transferForm.toAccountId),
      amount: String(amount),
      description: transferForm.description,
      date: transferForm.date,
      notes: transferForm.notes || undefined,
    });
  }

  const totalBalance = useMemo(() => (accounts ?? []).reduce((s, a) => s + (a.balance ?? 0), 0), [accounts]);

  const openCreate = () => { setForm({ ...emptyForm }); setEditingId(null); setShowModal(true); };
  const openEdit = (acc: any) => {
    setForm({ name: acc.name, bank: acc.bank || "", type: acc.type, color: acc.color || "#6366f1", initialBalance: String(acc.initialBalance ?? 0) });
    setEditingId(acc.id);
    setShowModal(true);
  };

  const handleSave = () => {
    const balance = parseFloat(form.initialBalance.replace(",", "."));
    if (isNaN(balance) || balance < 0) { toast.error("Saldo inicial inválido"); return; }
    if (!form.name.trim()) { toast.error("Nome da conta é obrigatório"); return; }
    const payload = { ...form, initialBalance: String(balance) };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  };

  const selectedAccount = accounts?.find(a => a.id === selectedAccountId);
  const typeInfo = (type: string) => ACCOUNT_TYPES.find(t => t.value === type) ?? ACCOUNT_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Contas Bancárias
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas contas e acompanhe o saldo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTransferModal(true)} className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            Transferir
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Total consolidado */}
      <Card className="bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Saldo Total Consolidado</p>
          <p className={`text-3xl font-bold ${totalBalance >= 0 ? "text-primary" : "text-red-400"}`}>
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{accounts?.length ?? 0} conta(s) ativa(s)</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de contas */}
        <div className="lg:col-span-1 space-y-3">
          {!accounts?.length ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm">Nenhuma conta cadastrada</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar conta
                </Button>
              </CardContent>
            </Card>
          ) : (
            accounts.map((acc) => {
              const info = typeInfo(acc.type);
              const Icon = info.icon;
              const isSelected = selectedAccountId === acc.id;
              return (
                <Card
                  key={acc.id}
                  className={`cursor-pointer transition-all border-2 ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                  onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: (acc.color || info.color) + "22" }}>
                          <Icon className="w-5 h-5" style={{ color: acc.color || info.color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                          {acc.bank && <p className="text-xs text-muted-foreground">{acc.bank}</p>}
                          <Badge variant="secondary" className="text-xs mt-0.5">{info.label}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${(acc.balance ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatCurrency(acc.balance ?? 0)}
                        </p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => { e.stopPropagation(); openEdit(acc); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-6 h-6 text-red-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(acc.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
                      <span>Saldo inicial: {formatCurrency(acc.initialBalance)}</span>
                      <span className="flex items-center gap-1">
                        Ver extrato <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Extrato da conta selecionada */}
        <div className="lg:col-span-2">
          {!selectedAccount ? (
            <Card className="bg-card border-border h-full">
              <CardContent className="p-8 flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                <Wallet className="w-12 h-12 text-muted-foreground opacity-30 mb-3" />
                <p className="text-muted-foreground">Selecione uma conta para ver o extrato</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">{selectedAccount.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Saldo atual: <span className={`font-semibold ${(selectedAccount.balance ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(selectedAccount.balance ?? 0)}</span>
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAccountId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Carregando extrato...
                  </div>
                ) : !transactions?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhuma movimentação vinculada a esta conta
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {transactions.map((tx: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.isIncome ? "bg-emerald-400/15" : "bg-red-400/15"}`}>
                            {tx.isIncome
                              ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                              : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.date as string)} · {tx.category}</p>
                          </div>
                        </div>
                        <p className={`font-semibold text-sm ${tx.isIncome ? "text-emerald-400" : "text-red-400"}`}>
                          {tx.isIncome ? "+" : "-"}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Conta */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Conta" : "Nova Conta Bancária"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome da conta *</Label>
              <Input placeholder="Ex: Conta Corrente Nubank" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Banco / Instituição</Label>
              <Select value={form.bank} onValueChange={v => setForm(f => ({ ...f, bank: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                <SelectContent>
                  {POPULAR_BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de conta</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Saldo inicial (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.initialBalance}
                onChange={e => setForm(f => ({ ...f, initialBalance: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Quanto você já tem nesta conta antes de começar a usar o sistema</p>
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={v => { setShowTransferModal(v); if (!v) setTransferForm({ ...emptyTransferForm }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="w-5 h-5" /> Transferência entre Contas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tf-from">Conta de Origem</Label>
              <Select value={transferForm.fromAccountId} onValueChange={v => setTransferForm(f => ({ ...f, fromAccountId: v }))}>
                <SelectTrigger id="tf-from"><SelectValue placeholder="Selecione a conta de origem" /></SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}{a.bank ? ` — ${a.bank}` : ''} ({formatCurrency(a.balance ?? 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-to">Conta de Destino</Label>
              <Select value={transferForm.toAccountId} onValueChange={v => setTransferForm(f => ({ ...f, toAccountId: v }))}>
                <SelectTrigger id="tf-to"><SelectValue placeholder="Selecione a conta de destino" /></SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).filter(a => String(a.id) !== transferForm.fromAccountId).map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}{a.bank ? ` — ${a.bank}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-amount">Valor</Label>
              <Input id="tf-amount" type="number" step="0.01" min="0.01" placeholder="0,00" value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-desc">Descrição</Label>
              <Input id="tf-desc" placeholder="Ex: Transferência para conta conjunta" value={transferForm.description} onChange={e => setTransferForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-date">Data</Label>
              <Input id="tf-date" type="date" value={transferForm.date} onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tf-notes">Observações (opcional)</Label>
              <Input id="tf-notes" placeholder="Observações adicionais" value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancelar</Button>
            <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? 'Transferindo...' : 'Confirmar Transferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover conta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            A conta será desativada. As movimentações vinculadas a ela não serão excluídas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && deleteMutation.mutate({ id: showDeleteConfirm })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
