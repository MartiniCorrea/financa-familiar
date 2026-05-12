import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getCurrentMonth, getCurrentYear, getDaysUntilDue, getMonthName } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, ChevronRight, ArrowUpRight, ArrowDownRight, Layers, Pencil, Bell, BellRing } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
const _cy = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => _cy - 5 + i);

export default function Dashboard() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [, setLocation] = useLocation();
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  const { data: summary } = trpc.dashboard.summary.useQuery({ month, year });
  const { data: evolution } = trpc.dashboard.evolution.useQuery({ months: 6 });
  const { data: groupSummary } = trpc.expenseGroups.summary.useQuery({ month, year });
  const { data: initialBalance, refetch: refetchInitialBalance } = trpc.balance.get.useQuery();
  const { data: totalBalance, refetch: refetchTotalBalance } = trpc.balance.getTotal.useQuery();
  const { data: bankAccountsWithBalance } = trpc.bankAccounts.listWithBalance.useQuery();
  const { data: upcomingAlerts } = trpc.billAlerts.getUpcoming.useQuery();

  const utils = trpc.useUtils();
  const setBalanceMutation = trpc.balance.set.useMutation({
    onSuccess: () => {
      refetchInitialBalance();
      refetchTotalBalance();
      utils.dashboard.summary.invalidate();
      setShowBalanceModal(false);
      toast.success("Saldo inicial atualizado com sucesso!");
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar saldo: ${err.message}`);
    },
  });

  const handleOpenBalanceModal = () => {
    setBalanceInput(String(initialBalance ?? 0));
    setShowBalanceModal(true);
  };

  const handleSaveBalance = () => {
    const amount = parseFloat(balanceInput.replace(",", "."));
    if (isNaN(amount) || amount < 0) {
      toast.error("Valor inválido. Digite um número válido (ex: 1500.00)");
      return;
    }
    setBalanceMutation.mutate({ amount });
  };

  const pieData = useMemo(() => {
    if (!groupSummary?.length) return [];
    const bySub: { name: string; value: number; color: string }[] = [];
    for (const group of groupSummary) {
      for (const sub of (group.subcategories ?? [])) {
        if ((sub as any).spent > 0) {
          bySub.push({ name: sub.name, value: (sub as any).spent, color: sub.color || '#6366f1' });
        }
      }
    }
    if (bySub.length > 0) return bySub.sort((a, b) => b.value - a.value);
    return groupSummary
      .filter(g => g.spent > 0)
      .map(g => ({ name: g.name, value: g.spent, color: g.color || '#6366f1' }))
      .sort((a, b) => b.value - a.value);
  }, [groupSummary]);

  const totalBalanceValue = useMemo(() => {
    if (bankAccountsWithBalance && bankAccountsWithBalance.length > 0) {
      return bankAccountsWithBalance.reduce((sum: number, acc: any) => sum + (acc.balance ?? 0), 0);
    }
    return totalBalance ?? 0;
  }, [bankAccountsWithBalance, totalBalance]);

  const kpis = [
    {
      title: "Receitas do Mês",
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      iconBg: 'oklch(0.48 0.18 145 / 0.12)',
      iconColor: 'oklch(0.42 0.16 145)',
      valueColor: 'oklch(0.38 0.16 145)',
      accent: 'oklch(0.48 0.18 145)',
    },
    {
      title: "Despesas do Mês",
      value: summary?.totalExpense ?? 0,
      icon: TrendingDown,
      iconBg: 'oklch(0.55 0.20 25 / 0.12)',
      iconColor: 'oklch(0.48 0.18 25)',
      valueColor: 'oklch(0.45 0.18 25)',
      accent: 'oklch(0.55 0.20 25)',
    },
    {
      title: "Saldo do Mês",
      value: summary?.balance ?? 0,
      icon: Wallet,
      iconBg: (summary?.balance ?? 0) >= 0 ? 'oklch(0.52 0.24 268 / 0.12)' : 'oklch(0.55 0.20 25 / 0.12)',
      iconColor: (summary?.balance ?? 0) >= 0 ? 'oklch(0.45 0.22 268)' : 'oklch(0.48 0.18 25)',
      valueColor: (summary?.balance ?? 0) >= 0 ? 'oklch(0.42 0.22 268)' : 'oklch(0.45 0.18 25)',
      accent: (summary?.balance ?? 0) >= 0 ? 'oklch(0.52 0.24 268)' : 'oklch(0.55 0.20 25)',
    },
    {
      title: "Taxa de Poupança",
      value: summary?.savingsRate ?? 0,
      icon: PiggyBank,
      iconBg: 'oklch(0.55 0.22 290 / 0.12)',
      iconColor: 'oklch(0.48 0.20 290)',
      valueColor: 'oklch(0.45 0.20 290)',
      accent: 'oklch(0.55 0.22 290)',
      isPercent: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36 bg-white border-border shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 bg-white border-border shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Saldo Total */}
      <div
        className="animate-fade-in-up delay-75 rounded-2xl overflow-hidden p-6"
        style={{
          background: 'linear-gradient(135deg, oklch(0.52 0.24 268), oklch(0.55 0.20 290))',
          boxShadow: '0 8px 32px oklch(0.52 0.24 268 / 0.30)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-white/70 font-semibold uppercase tracking-wider mb-2">Saldo Total Consolidado</p>
            <p className="text-4xl font-bold text-white number-display" style={{ letterSpacing: '-0.03em' }}>
              {formatCurrency(totalBalanceValue)}
            </p>
            {!bankAccountsWithBalance?.length && (
              <p className="text-xs text-white/60 mt-1.5">
                Saldo inicial: {formatCurrency(initialBalance ?? 0)} + receitas − despesas
              </p>
            )}
          </div>
          {!bankAccountsWithBalance?.length && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-xs border-white/30 text-white hover:bg-white/20 bg-white/10"
              onClick={handleOpenBalanceModal}
            >
              <Pencil className="w-3 h-3" />
              Definir saldo
            </Button>
          )}
        </div>
        {bankAccountsWithBalance && bankAccountsWithBalance.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {bankAccountsWithBalance.map((acc: any) => (
              <div
                key={acc.id}
                className="rounded-xl p-3 flex items-center gap-3 hover-lift"
                style={{ background: 'oklch(1.0 0 0 / 0.15)', border: '1px solid oklch(1.0 0 0 / 0.25)', backdropFilter: 'blur(8px)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: (acc.color || '#6366f1') + '33' }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.color || '#6366f1' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{acc.name}</p>
                  {acc.bank && <p className="text-xs text-white/60 truncate">{acc.bank}</p>}
                  <p className={`text-sm font-bold ${acc.balance >= 0 ? 'text-white' : 'text-red-200'}`}>
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.title}
            className={`card-premium animate-fade-in-up delay-${[100, 150, 200, 300][i]} p-5 cursor-default`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: kpi.iconBg }}
              >
                <kpi.icon className="w-5 h-5" style={{ color: kpi.iconColor }} />
              </div>
              <div className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: kpi.accent }} />
            </div>
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{kpi.title}</p>
            <p className="text-2xl font-bold mt-1 number-display" style={{ color: kpi.valueColor }}>
              {kpi.isPercent ? `${(kpi.value as number).toFixed(1)}%` : formatCurrency(kpi.value as number)}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <div className="xl:col-span-2 card-premium animate-fade-in-up delay-200 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={evolution ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.48 0.18 145)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="oklch(0.48 0.18 145)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.55 0.20 25)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="oklch(0.55 0.20 25)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.008 240)" />
              <XAxis dataKey="monthLabel" tick={{ fill: 'oklch(0.52 0.022 255)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'oklch(0.52 0.022 255)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid oklch(0.88 0.010 240)', borderRadius: '10px', boxShadow: '0 4px 20px oklch(0.52 0.10 255 / 0.12)' }}
                labelStyle={{ color: 'oklch(0.18 0.025 255)', fontWeight: 600 }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Area type="monotone" dataKey="income" name="Receitas" stroke="oklch(0.48 0.18 145)" strokeWidth={2.5} fill="url(#incomeGrad)" />
              <Area type="monotone" dataKey="expense" name="Despesas" stroke="oklch(0.55 0.20 25)" strokeWidth={2.5} fill="url(#expenseGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ background: 'oklch(0.48 0.18 145)' }} />
              Receitas
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ background: 'oklch(0.55 0.20 25)' }} />
              Despesas
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card-premium animate-fade-in-up delay-300 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Despesas por Categoria</h3>
          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              <TrendingDown className="w-8 h-8 mb-2 opacity-20" />
              Sem despesas no período
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', border: '1px solid oklch(0.88 0.010 240)', borderRadius: '10px', boxShadow: '0 4px 20px oklch(0.52 0.10 255 / 0.12)' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="text-foreground font-semibold">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 50/30/20 */}
      {groupSummary && groupSummary.length > 0 && (
        <div className="card-premium animate-fade-in-up p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Método 50/30/20
            </h3>
            <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setLocation('/categorias')}>
              Ver detalhes <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {groupSummary.map((group: any) => {
              const pct = group.targetPercent ?? 0;
              const spent = group.spent ?? 0;
              const target = group.targetAmount ?? 0;
              const used = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
              const isOver = spent > target && target > 0;
              return (
                <div key={group.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color || '#6366f1' }} />
                      <span className="font-medium text-foreground">{group.name}</span>
                      <span className="text-xs text-muted-foreground">(meta {pct}%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={isOver ? 'text-red-500 font-semibold' : 'text-foreground font-medium'}>{formatCurrency(spent)}</span>
                      <span className="text-muted-foreground">/ {formatCurrency(target)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : ''}`}
                      style={{ width: `${used}%`, backgroundColor: isOver ? undefined : group.color || undefined }}
                    />
                  </div>
                  {isOver && (
                    <p className="text-xs text-red-500">Acima do limite em {formatCurrency(spent - target)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alertas de Vencimento */}
      {upcomingAlerts && upcomingAlerts.length > 0 && (
        <div
          className="card-premium animate-fade-in-up p-5"
          style={{ borderColor: 'oklch(0.65 0.16 60 / 0.25)', background: 'linear-gradient(135deg, white, oklch(0.97 0.015 60))' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'oklch(0.45 0.14 55)' }}>
              <BellRing className="w-4 h-4 animate-pulse" style={{ color: 'oklch(0.58 0.18 50)' }} />
              Alertas de Vencimento
              <Badge className="text-white text-xs ml-1" style={{ background: 'oklch(0.58 0.18 50)' }}>
                {upcomingAlerts.length}
              </Badge>
            </h3>
            <Button variant="ghost" size="sm" className="text-xs" style={{ color: 'oklch(0.58 0.18 50)' }} onClick={() => setLocation('/contas')}>
              Gerenciar <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {upcomingAlerts.map(({ bill, daysBeforeDue }: any) => {
              const isToday = daysBeforeDue === 0;
              const isTomorrow = daysBeforeDue === 1;
              const urgencyLabel = isToday ? 'HOJE' : isTomorrow ? 'Amanhã' : `${daysBeforeDue} dias`;
              const rowBg = isToday
                ? 'bg-red-50 border border-red-200'
                : daysBeforeDue <= 3
                ? 'bg-orange-50 border border-orange-200'
                : 'bg-amber-50 border border-amber-200';
              const badgeColor = isToday ? 'bg-red-500' : daysBeforeDue <= 3 ? 'bg-orange-500' : 'bg-amber-500';
              return (
                <div key={bill.id} className={`flex items-center justify-between p-3 rounded-xl ${rowBg} transition-colors`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Bell className={`w-4 h-4 shrink-0 ${isToday ? 'text-red-500' : daysBeforeDue <= 3 ? 'text-orange-500' : 'text-amber-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{bill.description}</p>
                      <p className="text-xs text-muted-foreground">Vence em {formatDate(bill.dueDate as string)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge className={`${badgeColor} text-white text-xs`}>{urgencyLabel}</Badge>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(bill.amount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contas Pendentes */}
      <div className="card-premium animate-fade-in-up p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" style={{ color: 'oklch(0.58 0.18 50)' }} />
            Contas Pendentes
          </h3>
          <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setLocation('/contas')}>
            Ver todas <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        <div>
          {!summary?.pendingBills?.length ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhuma conta pendente 🎉</p>
          ) : (
            <div className="space-y-2">
              {summary.pendingBills.map((bill: any) => {
                const days = getDaysUntilDue(bill.dueDate);
                const isOverdue = days < 0;
                const isUrgent = days >= 0 && days <= 3;
                return (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{bill.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Vence {formatDate(bill.dueDate)}
                          {isOverdue ? ` (${Math.abs(days)}d atraso)` : days === 0 ? ' (hoje)' : ` (${days}d)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant={isOverdue ? "destructive" : isUrgent ? "outline" : "secondary"} className="text-xs">
                        {bill.type === 'pagar' ? (
                          <ArrowDownRight className="w-3 h-3 mr-1 text-red-500" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-500" />
                        )}
                        {formatCurrency(bill.amount)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Definir Saldo Inicial */}
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Definir Saldo Inicial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Informe o valor que você já possui em conta antes de começar a usar o sistema. Esse valor será somado às suas receitas e subtraído das despesas para calcular o saldo acumulado total.
            </p>
            <div className="space-y-2">
              <Label htmlFor="balance-input">Saldo inicial (R$)</Label>
              <Input
                id="balance-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 5000.00"
                value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveBalance()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBalanceModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveBalance} disabled={setBalanceMutation.isPending}>
              {setBalanceMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
