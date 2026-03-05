import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getCurrentMonth, getCurrentYear, getDaysUntilDue, getMonthName } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
const YEARS = [2023, 2024, 2025, 2026];

export default function Dashboard() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [, setLocation] = useLocation();

  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery({ month, year });
  const { data: evolution } = trpc.dashboard.evolution.useQuery({ months: 6 });
  const { data: groupSummary } = trpc.expenseGroups.summary.useQuery({ month, year });

  // Gráfico de pizza usando subcategorias 50/30/20 do usuário
  const pieData = useMemo(() => {
    if (!groupSummary?.length) return [];
    // Tenta mostrar por subcategoria primeiro
    const bySub: { name: string; value: number; color: string }[] = [];
    for (const group of groupSummary) {
      for (const sub of (group.subcategories ?? [])) {
        if ((sub as any).spent > 0) {
          bySub.push({ name: sub.name, value: (sub as any).spent, color: sub.color || '#6366f1' });
        }
      }
    }
    if (bySub.length > 0) return bySub.sort((a, b) => b.value - a.value);
    // Fallback: por grupo
    return groupSummary
      .filter(g => g.spent > 0)
      .map(g => ({ name: g.name, value: g.spent, color: g.color || '#6366f1' }))
      .sort((a, b) => b.value - a.value);
  }, [groupSummary]);

  const kpis = [
    {
      title: "Receitas",
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      trend: "+",
    },
    {
      title: "Despesas",
      value: summary?.totalExpense ?? 0,
      icon: TrendingDown,
      color: "text-red-400",
      bg: "bg-red-400/10",
      trend: "-",
    },
    {
      title: "Saldo",
      value: summary?.balance ?? 0,
      icon: Wallet,
      color: (summary?.balance ?? 0) >= 0 ? "text-primary" : "text-red-400",
      bg: (summary?.balance ?? 0) >= 0 ? "bg-primary/10" : "bg-red-400/10",
    },
    {
      title: "Taxa de Poupança",
      value: summary?.savingsRate ?? 0,
      icon: PiggyBank,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      isPercent: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36 bg-card border-border">
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
            <SelectTrigger className="w-24 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.title} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.title}</p>
                  <p className={`text-xl font-bold mt-2 ${kpi.color}`}>
                    {kpi.isPercent ? `${(kpi.value as number).toFixed(1)}%` : formatCurrency(kpi.value as number)}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0 ml-3`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <Card className="xl:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={evolution ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 265)" />
                <XAxis dataKey="monthLabel" tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'oklch(0.16 0.025 265)', border: '1px solid oklch(0.25 0.03 265)', borderRadius: '8px' }}
                  labelStyle={{ color: 'oklch(0.96 0.005 265)', fontWeight: 600 }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="income" name="Receitas" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expense" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                Receitas
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                Despesas
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense by Category Pie */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                <TrendingDown className="w-8 h-8 mb-2 opacity-30" />
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
                      contentStyle={{ backgroundColor: 'oklch(0.16 0.025 265)', border: '1px solid oklch(0.25 0.03 265)', borderRadius: '8px' }}
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
                      <span className="text-foreground font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Bills */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Contas Pendentes
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => setLocation('/contas')}>
            Ver todas <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {!summary?.pendingBills?.length ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhuma conta pendente</p>
          ) : (
            <div className="space-y-2">
              {summary.pendingBills.map((bill: any) => {
                const days = getDaysUntilDue(bill.dueDate);
                const isOverdue = days < 0;
                const isUrgent = days >= 0 && days <= 3;
                return (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-400' : isUrgent ? 'bg-amber-400' : 'bg-muted-foreground'}`} />
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
                          <ArrowDownRight className="w-3 h-3 mr-1 text-red-400" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 mr-1 text-emerald-400" />
                        )}
                        {formatCurrency(bill.amount)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
