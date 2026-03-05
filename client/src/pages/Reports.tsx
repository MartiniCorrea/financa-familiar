import { trpc } from "@/lib/trpc";
import { formatCurrency, getCategoryInfo, EXPENSE_CATEGORIES, getCurrentMonth, getCurrentYear, getMonthName, CHART_COLORS } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
const YEARS = [2023, 2024, 2025, 2026];

const tooltipStyle = {
  contentStyle: { backgroundColor: 'oklch(0.16 0.025 265)', border: '1px solid oklch(0.25 0.03 265)', borderRadius: '8px' },
  labelStyle: { color: 'oklch(0.96 0.005 265)', fontWeight: 600 },
};

export default function Reports() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [tab, setTab] = useState('overview');

  const { data: summary } = trpc.dashboard.summary.useQuery({ month, year });
  const { data: evolution } = trpc.dashboard.evolution.useQuery({ months: 12 });

  const pieData = useMemo(() => {
    if (!summary?.expenseByCategory) return [];
    return summary.expenseByCategory
      .filter((c: any) => parseFloat(c.total) > 0)
      .map((c: any) => ({
        name: getCategoryInfo(c.category ?? 'outros').label,
        value: parseFloat(c.total),
        color: getCategoryInfo(c.category ?? 'outros').color,
      }))
      .sort((a: any, b: any) => b.value - a.value);
  }, [summary]);

  const incomeData = useMemo(() => {
    // Use evolution data for income breakdown
    return [];
  }, [summary]);

  const evolutionData = useMemo(() => {
    if (!evolution) return [];
    return evolution.map((e: any) => ({
      ...e,
      balance: parseFloat(e.income) - parseFloat(e.expense),
    }));
  }, [evolution]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Análises e visualizações financeiras detalhadas</p>
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
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Visão Geral</TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Despesas</TabsTrigger>
          <TabsTrigger value="evolution" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Evolução</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Receitas', value: summary?.totalIncome ?? 0, color: 'text-emerald-400' },
              { label: 'Despesas', value: summary?.totalExpense ?? 0, color: 'text-red-400' },
              { label: 'Saldo', value: summary?.balance ?? 0, color: (summary?.balance ?? 0) >= 0 ? 'text-primary' : 'text-red-400' },
            ].map(item => (
              <Card key={item.label} className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${item.color}`}>{formatCurrency(item.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Receitas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={incomeData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 265)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), '']} />
                      <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-4 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Sem despesas no período</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pieData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 265)" />
                    <XAxis dataKey="name" tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), '']} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {pieData.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown table */}
          {pieData.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Detalhamento</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pieData.map((item: any, i: number) => {
                    const total = pieData.reduce((s: number, p: any) => s + p.value, 0);
                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolution" className="mt-4 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Evolução de Receitas e Despesas (12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 265)" />
                  <XAxis dataKey="monthLabel" tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), '']} />
                  <Legend wrapperStyle={{ color: 'oklch(0.60 0.02 265)', fontSize: 12 }} />
                  <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Saldo Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.03 265)" />
                  <XAxis dataKey="monthLabel" tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'oklch(0.60 0.02 265)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Saldo']} />
                  <Area type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={2} fill="url(#balanceGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
