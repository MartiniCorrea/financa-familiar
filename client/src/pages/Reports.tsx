import { trpc } from "@/lib/trpc";
import { formatCurrency, getCurrentMonth, getCurrentYear, getMonthName } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BarChart3, FileDown, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }));
const _cy = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => _cy - 5 + i);

const tooltipStyle = {
  contentStyle: { backgroundColor: 'oklch(0.16 0.025 265)', border: '1px solid oklch(0.25 0.03 265)', borderRadius: '8px' },
  labelStyle: { color: 'oklch(0.96 0.005 265)', fontWeight: 600 },
};

export default function Reports() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [tab, setTab] = useState('overview');

  // PDF Export state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfMonth, setPdfMonth] = useState(getCurrentMonth());
  const [pdfYear, setPdfYear] = useState(getCurrentYear());
  const [pdfSections, setPdfSections] = useState({
    summary: true,
    expenses: true,
    incomes: true,
    bills: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: summary } = trpc.dashboard.summary.useQuery({ month, year });
  const { data: evolution } = trpc.dashboard.evolution.useQuery({ months: 12 });
  const { data: groupSummary } = trpc.expenseGroups.summary.useQuery({ month, year });

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

  const evolutionData = useMemo(() => {
    if (!evolution) return [];
    return evolution.map((e: any) => ({
      ...e,
      balance: parseFloat(e.income) - parseFloat(e.expense),
    }));
  }, [evolution]);

  const handleExportPdf = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        month: String(pdfMonth),
        year: String(pdfYear),
        summary: String(pdfSections.summary),
        expenses: String(pdfSections.expenses),
        incomes: String(pdfSections.incomes),
        bills: String(pdfSections.bills),
      });
      const response = await fetch(`/api/reports/pdf?${params}`, { credentials: "include" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-${pdfYear}-${String(pdfMonth).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowPdfModal(false);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const monthLabel = (m: number) => {
    const name = getMonthName(m);
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1">Análises e visualizações financeiras detalhadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-36 bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{monthLabel(m.value)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24 bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 rounded-xl shadow-sm bg-primary hover:bg-primary/90"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* PDF Export Modal */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5 text-primary" />
              Exportar Relatório em PDF
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Período */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Período do relatório</p>
              <div className="flex items-center gap-2">
                <Select value={String(pdfMonth)} onValueChange={v => setPdfMonth(Number(v))}>
                  <SelectTrigger className="flex-1 bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={String(m.value)}>{monthLabel(m.value)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(pdfYear)} onValueChange={v => setPdfYear(Number(v))}>
                  <SelectTrigger className="w-28 bg-card border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Seções */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Seções a incluir</p>
              <div className="space-y-3">
                {[
                  { key: "summary", label: "Resumo mensal", desc: "KPIs, saldo e despesas por categoria" },
                  { key: "incomes", label: "Lista de receitas", desc: "Todas as receitas do período" },
                  { key: "expenses", label: "Lista de despesas", desc: "Todas as despesas do período" },
                  { key: "bills", label: "Contas a pagar/receber", desc: "Contas do período com status" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setPdfSections(s => ({ ...s, [key]: !s[key as keyof typeof s] }))}>
                    <Checkbox
                      id={`pdf-${key}`}
                      checked={pdfSections[key as keyof typeof pdfSections]}
                      onCheckedChange={v => setPdfSections(s => ({ ...s, [key]: !!v }))}
                      className="mt-0.5"
                    />
                    <div>
                      <Label htmlFor={`pdf-${key}`} className="text-sm font-medium text-foreground cursor-pointer">{label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                O PDF será gerado com o relatório de <strong>{monthLabel(pdfMonth)} {pdfYear}</strong> e baixado automaticamente.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPdfModal(false)} disabled={isGenerating}>
              Cancelar
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={isGenerating || !Object.values(pdfSections).some(Boolean)}
              className="flex items-center gap-2 rounded-xl"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              ) : (
                <><FileDown className="w-4 h-4" /> Baixar PDF</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
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
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} paddingAngle={2} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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
                <CardTitle className="text-sm font-semibold text-foreground">Taxa de Poupança</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(0.25 0.03 265)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 40 * Math.min(summary?.savingsRate ?? 0, 100) / 100} ${2 * Math.PI * 40}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">{(summary?.savingsRate ?? 0).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">da renda foi poupada</p>
                </div>
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
