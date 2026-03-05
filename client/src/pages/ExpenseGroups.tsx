import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Layers, Tag, Trash2, ChevronDown, ChevronUp, Target } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const GROUP_TYPES = [
  { value: "necessario", label: "Gastos Necessários", color: "#3b82f6", target: 50, description: "Moradia, alimentação, saúde, transporte essencial" },
  { value: "nao_necessario", label: "Gastos Não Necessários", color: "#f97316", target: 30, description: "Lazer, restaurantes, assinaturas, compras" },
  { value: "investimento", label: "Investimentos", color: "#22c55e", target: 20, description: "Poupança, investimentos, fundo de emergência" },
];

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

export default function ExpenseGroups() {
  const [openGroup, setOpenGroup] = useState(false);
  const [openSubcat, setOpenSubcat] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [groupForm, setGroupForm] = useState({ name: "", groupType: "necessario" as any, targetPercent: "50", color: "#3b82f6" });
  const [subcatForm, setSubcatForm] = useState({ groupId: "", name: "", color: "#3b82f6" });

  const { data: groups = [], refetch: refetchGroups } = trpc.expenseGroups.list.useQuery();
  const { data: summary = [] } = trpc.expenseGroups.summary.useQuery({ month: CURRENT_MONTH, year: CURRENT_YEAR });

  const createGroupMutation = trpc.expenseGroups.create.useMutation({
    onSuccess: () => { toast.success("Grupo criado!"); setOpenGroup(false); refetchGroups(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGroupMutation = trpc.expenseGroups.delete.useMutation({
    onSuccess: () => { toast.success("Grupo removido"); refetchGroups(); },
    onError: (e) => toast.error(e.message),
  });
  const createSubcatMutation = trpc.expenseGroups.subcategories.create.useMutation({
    onSuccess: () => { toast.success("Subcategoria criada!"); setOpenSubcat(false); refetchGroups(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSubcatMutation = trpc.expenseGroups.subcategories.delete.useMutation({
    onSuccess: () => { toast.success("Subcategoria removida"); refetchGroups(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleExpand = (id: number) => setExpandedGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const totalSpent = summary.reduce((s, g) => s + g.spent, 0);
  const pieData = summary.filter(g => g.spent > 0).map(g => ({
    name: g.name,
    value: g.spent,
    color: g.color || "#6366f1",
  }));

  const METHOD_503020 = [
    { label: "50% Necessários", percent: 50, color: "#3b82f6" },
    { label: "30% Não Necessários", percent: 30, color: "#f97316" },
    { label: "20% Investimentos", percent: 20, color: "#22c55e" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Método 50/30/20</h1>
          <p className="text-muted-foreground text-sm mt-1">Organize seus gastos em grupos e conquiste o equilíbrio financeiro</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openSubcat} onOpenChange={setOpenSubcat}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Tag className="w-4 h-4 mr-2" />Nova Subcategoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Subcategoria</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (!subcatForm.groupId || !subcatForm.name) return toast.error("Preencha todos os campos"); createSubcatMutation.mutate({ groupId: parseInt(subcatForm.groupId), name: subcatForm.name, color: subcatForm.color }); }} className="space-y-4">
                <div>
                  <Label>Grupo *</Label>
                  <Select value={subcatForm.groupId} onValueChange={v => setSubcatForm(f => ({ ...f, groupId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o grupo..." /></SelectTrigger>
                    <SelectContent>{groups.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Nome *</Label><Input value={subcatForm.name} onChange={e => setSubcatForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Supermercado, Lanche..." /></div>
                <div><Label>Cor</Label><Input type="color" value={subcatForm.color} onChange={e => setSubcatForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-full" /></div>
                <Button type="submit" className="w-full" disabled={createSubcatMutation.isPending}>Criar Subcategoria</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openGroup} onOpenChange={setOpenGroup}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Novo Grupo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Grupo de Despesas</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (!groupForm.name) return toast.error("Informe o nome"); createGroupMutation.mutate(groupForm); }} className="space-y-4">
                <div><Label>Nome do Grupo *</Label><Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Gastos Necessários" /></div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={groupForm.groupType} onValueChange={v => { const t = GROUP_TYPES.find(g => g.value === v); setGroupForm(f => ({ ...f, groupType: v as any, targetPercent: String(t?.target || 0), color: t?.color || "#6366f1" })); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GROUP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Meta (% da renda)</Label><Input type="number" min="0" max="100" value={groupForm.targetPercent} onChange={e => setGroupForm(f => ({ ...f, targetPercent: e.target.value }))} /></div>
                <div><Label>Cor</Label><Input type="color" value={groupForm.color} onChange={e => setGroupForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-full" /></div>
                <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>Criar Grupo</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Explicação do método */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Método 50/30/20</p>
              <p className="text-xs text-muted-foreground mt-1">Divida sua renda em 3 grupos: <strong>50%</strong> para necessidades, <strong>30%</strong> para desejos e <strong>20%</strong> para investimentos e poupança.</p>
              <div className="flex gap-3 mt-3">
                {METHOD_503020.map(m => (
                  <div key={m.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo do mês */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Distribuição do Mês</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Progresso por Grupo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {summary.map(g => (
                <div key={g.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(g.spent)} / {formatCurrency(g.targetAmount)}</span>
                  </div>
                  <Progress value={Math.min(g.percentUsed, 100)} className="h-2" style={{ ["--progress-color" as any]: g.color || "var(--primary)" }} />
                  <p className="text-xs text-muted-foreground mt-0.5">{g.percentUsed.toFixed(1)}% da meta ({parseFloat(String(g.targetPercent)).toFixed(0)}% da renda)</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grupos e subcategorias */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum grupo criado ainda.</p>
              <p className="text-sm mt-1">Crie grupos para organizar suas despesas pelo método 50/30/20.</p>
            </CardContent>
          </Card>
        ) : groups.map(group => {
          const summaryGroup = summary.find(s => s.id === group.id);
          const isExpanded = expandedGroups.includes(group.id);
          const typeInfo = GROUP_TYPES.find(t => t.value === group.groupType);
          return (
            <Card key={group.id} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: group.color || "#6366f1" }} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${group.color}20` }}>
                      <Layers className="w-4 h-4" style={{ color: group.color || "#6366f1" }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{typeInfo?.label} • Meta: {parseFloat(group.targetPercent as string).toFixed(0)}% da renda</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {summaryGroup && <span className="text-sm font-semibold">{formatCurrency(summaryGroup.spent)}</span>}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleExpand(group.id)}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteGroupMutation.mutate({ id: group.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent>
                  <div className="space-y-2">
                    {(summaryGroup?.subcategories || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Nenhuma subcategoria. Clique em "Nova Subcategoria" para adicionar.</p>
                    ) : (summaryGroup?.subcategories || []).map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color || "#6366f1" }} />
                          <span className="text-sm">{sub.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.spent > 0 && <span className="text-sm font-medium">{formatCurrency(sub.spent)}</span>}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteSubcatMutation.mutate({ id: sub.id })}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
