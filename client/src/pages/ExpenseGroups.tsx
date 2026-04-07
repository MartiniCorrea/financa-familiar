import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Layers, Tag, Trash2, ChevronDown, ChevronUp, Target } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const GROUP_TYPES = [
  { value: "necessario", label: "Gastos Necessários", color: "#3b82f6", target: 50 },
  { value: "nao_necessario", label: "Gastos Não Necessários", color: "#f97316", target: 30 },
  { value: "investimento", label: "Investimentos", color: "#22c55e", target: 20 },
];

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();

export default function ExpenseGroups() {
  const [openGroup, setOpenGroup] = useState(false);
  const [openSubcat, setOpenSubcat] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [groupForm, setGroupForm] = useState({ name: "", groupType: "necessario" as "necessario" | "nao_necessario" | "investimento", targetPercent: "50", color: "#3b82f6" });
  const EXPENSE_CATEGORIES_OPTIONS = [
    { value: "alimentacao", label: "Alimentação" },
    { value: "habitacao", label: "Habitação" },
    { value: "saude", label: "Saúde" },
    { value: "educacao", label: "Educação" },
    { value: "transporte", label: "Transporte" },
    { value: "vestuario", label: "Vestuário" },
    { value: "lazer", label: "Lazer" },
    { value: "financeiro", label: "Financeiro" },
    { value: "utilidades", label: "Utilidades" },
    { value: "pessoal", label: "Pessoal" },
    { value: "outros", label: "Outros" },
  ];
  const [subcatForm, setSubcatForm] = useState({ groupId: "", name: "", color: "#3b82f6", parentCategory: "outros" });

  // Busca grupos e subcategorias separadamente para garantir que subcategorias apareçam sempre
  const { data: groups = [], refetch: refetchGroups } = trpc.expenseGroups.list.useQuery();
  const { data: allSubcats = [], refetch: refetchSubcats } = trpc.expenseGroups.subcategories.list.useQuery({});
  const { data: summary = [] } = trpc.expenseGroups.summary.useQuery({ month: CURRENT_MONTH, year: CURRENT_YEAR });

  const utils = trpc.useUtils();

  const refetchAll = () => {
    refetchGroups();
    refetchSubcats();
    utils.expenseGroups.summary.invalidate();
  };

  const createGroupMutation = trpc.expenseGroups.create.useMutation({
    onSuccess: () => { toast.success("Grupo criado!"); setOpenGroup(false); setGroupForm({ name: "", groupType: "necessario", targetPercent: "50", color: "#3b82f6" }); refetchAll(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGroupMutation = trpc.expenseGroups.delete.useMutation({
    onSuccess: () => { toast.success("Grupo removido"); refetchAll(); },
    onError: (e) => toast.error(e.message),
  });
  const createSubcatMutation = trpc.expenseGroups.subcategories.create.useMutation({
    onSuccess: () => { toast.success("Subcategoria criada!"); setOpenSubcat(false); setSubcatForm({ groupId: "", name: "", color: "#3b82f6", parentCategory: "outros" }); refetchAll(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteSubcatMutation = trpc.expenseGroups.subcategories.delete.useMutation({
    onSuccess: () => { toast.success("Subcategoria removida"); refetchAll(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleExpand = (id: number) => setExpandedGroups(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const pieData = summary.filter(g => g.spent > 0).map(g => ({
    name: g.name,
    value: g.spent,
    color: g.color || "#6366f1",
  }));

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Método 50/30/20</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize seus gastos em grupos e conquiste o equilíbrio financeiro
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {/* Dialog: Nova Subcategoria */}
          <Dialog open={openSubcat} onOpenChange={setOpenSubcat}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="w-4 h-4 mr-2" />
                Nova Subcategoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Subcategoria</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!subcatForm.groupId) return toast.error("Selecione um grupo");
                  if (!subcatForm.name.trim()) return toast.error("Informe o nome da subcategoria");
                  createSubcatMutation.mutate({
                    groupId: parseInt(subcatForm.groupId),
                    name: subcatForm.name.trim(),
                    color: subcatForm.color,
                  });
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <Label>Grupo *</Label>
                  <Select value={subcatForm.groupId} onValueChange={v => setSubcatForm(f => ({ ...f, groupId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grupo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input
                    value={subcatForm.name}
                    onChange={e => setSubcatForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Supermercado, Lanche, Farmácia..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria Principal *</Label>
                  <Select value={subcatForm.parentCategory} onValueChange={v => setSubcatForm(f => ({ ...f, parentCategory: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES_OPTIONS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={subcatForm.color}
                      onChange={e => setSubcatForm(f => ({ ...f, color: e.target.value }))}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{subcatForm.color}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createSubcatMutation.isPending}>
                  {createSubcatMutation.isPending ? "Criando..." : "Criar Subcategoria"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog: Novo Grupo */}
          <Dialog open={openGroup} onOpenChange={setOpenGroup}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Grupo de Despesas</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!groupForm.name.trim()) return toast.error("Informe o nome do grupo");
                  createGroupMutation.mutate({ ...groupForm, name: groupForm.name.trim() });
                }}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <Label>Nome do Grupo *</Label>
                  <Input
                    value={groupForm.name}
                    onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Gastos Necessários"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo *</Label>
                  <Select
                    value={groupForm.groupType}
                    onValueChange={v => {
                      const t = GROUP_TYPES.find(g => g.value === v);
                      setGroupForm(f => ({ ...f, groupType: v as any, targetPercent: String(t?.target || 0), color: t?.color || "#6366f1" }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GROUP_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Meta (% da renda)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={groupForm.targetPercent}
                    onChange={e => setGroupForm(f => ({ ...f, targetPercent: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={groupForm.color}
                      onChange={e => setGroupForm(f => ({ ...f, color: e.target.value }))}
                      className="h-10 w-16 p-1 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{groupForm.color}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
                  {createGroupMutation.isPending ? "Criando..." : "Criar Grupo"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Explicação do método */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground">O que é o Método 50/30/20?</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Divida sua renda em 3 grupos: <strong>50%</strong> para necessidades básicas,{" "}
                <strong>30%</strong> para desejos e lazer, e <strong>20%</strong> para investimentos e poupança.
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                {GROUP_TYPES.map(m => (
                  <div key={m.value} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-xs text-muted-foreground">{m.target}% — {m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo do mês (só aparece se houver grupos com gastos) */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Sem gastos registrados neste mês
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Progresso por Grupo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.map(g => (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate mr-2">{g.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatCurrency(g.spent)} / {formatCurrency(g.targetAmount)}
                    </span>
                  </div>
                  <Progress value={Math.min(g.percentUsed, 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {g.percentUsed.toFixed(1)}% da meta · {parseFloat(String(g.targetPercent)).toFixed(0)}% da renda
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de grupos */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">Nenhum grupo criado ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Novo Grupo" para começar a organizar suas despesas pelo método 50/30/20.
              </p>
            </CardContent>
          </Card>
        ) : (
          groups.map(group => {
            const summaryGroup = summary.find(s => s.id === group.id);
            const isExpanded = expandedGroups.includes(group.id);
            const typeInfo = GROUP_TYPES.find(t => t.value === group.groupType);
            // Subcategorias buscadas diretamente da query separada (não do summary)
            const groupSubcats = allSubcats.filter(s => s.groupId === group.id);

            return (
              <Card key={group.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: group.color || "#6366f1" }} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${group.color}20` }}
                      >
                        <Layers className="w-5 h-5" style={{ color: group.color || "#6366f1" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeInfo?.label} · Meta: {parseFloat(String(group.targetPercent)).toFixed(0)}% da renda
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {summaryGroup && summaryGroup.spent > 0 && (
                        <span className="text-sm font-semibold mr-1">{formatCurrency(summaryGroup.spent)}</span>
                      )}
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 mr-1">
                        {groupSubcats.length} subcategorias
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleExpand(group.id)}
                        title={isExpanded ? "Recolher" : "Expandir"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteGroupMutation.mutate({ id: group.id })}
                        title="Excluir grupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="border-t border-border pt-3 space-y-2">
                      {groupSubcats.length === 0 ? (
                        <div className="text-center py-4">
                          <Tag className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">Nenhuma subcategoria neste grupo.</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Clique em "Nova Subcategoria" e selecione este grupo.
                          </p>
                        </div>
                      ) : (
                        groupSubcats.map(sub => {
                          const summarySubcat = summaryGroup?.subcategories?.find((s: any) => s.id === sub.id);
                          return (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: sub.color || "#6366f1" }}
                                />
                                <span className="text-sm font-medium truncate">{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {summarySubcat && summarySubcat.spent > 0 && (
                                  <span className="text-sm font-medium text-foreground">
                                    {formatCurrency(summarySubcat.spent)}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteSubcatMutation.mutate({ id: sub.id })}
                                  title="Excluir subcategoria"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
