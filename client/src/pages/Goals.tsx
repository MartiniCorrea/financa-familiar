import { trpc } from "@/lib/trpc";
import { formatCurrency, calcProgress, formatDate, getTodayString } from "@/lib/finance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Trash2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const GOAL_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#d97706'];

type GoalForm = { name: string; description: string; targetAmount: string; currentAmount: string; deadline: string; type: string; color: string; };
const emptyGoal: GoalForm = { name: '', description: '', targetAmount: '', currentAmount: '0', deadline: '', type: 'medio_prazo', color: '#f59e0b' };

export default function Goals() {
  const [open, setOpen] = useState(false);
  const [contribOpen, setContribOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyGoal);
  const [contribAmount, setContribAmount] = useState('');
  const [contribDate, setContribDate] = useState(getTodayString());

  const utils = trpc.useUtils();
  const { data: goals = [], isLoading } = trpc.goals.list.useQuery();
  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => { utils.goals.list.invalidate(); setOpen(false); setForm(emptyGoal); toast.success("Meta criada!"); },
    onError: () => toast.error("Erro ao criar meta"),
  });
  const deleteMutation = trpc.goals.delete.useMutation({
    onSuccess: () => { utils.goals.list.invalidate(); toast.success("Meta removida!"); },
    onError: () => toast.error("Erro ao remover meta"),
  });
  const contribMutation = trpc.goals.addContribution.useMutation({
    onSuccess: () => { utils.goals.list.invalidate(); setContribOpen(false); setContribAmount(''); toast.success("Contribuição adicionada!"); },
    onError: () => toast.error("Erro ao adicionar contribuição"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.targetAmount) return toast.error("Preencha os campos obrigatórios");
    createMutation.mutate({ ...form, targetAmount: form.targetAmount, type: form.type as any, deadline: form.deadline || undefined });
  }

  function handleContrib(e: React.FormEvent) {
    e.preventDefault();
    if (!contribAmount || !selectedGoalId) return toast.error("Informe o valor");
    contribMutation.mutate({ goalId: selectedGoalId, amount: contribAmount, date: contribDate });
  }

  const typeLabels: Record<string, string> = { curto_prazo: 'Curto Prazo', medio_prazo: 'Médio Prazo', longo_prazo: 'Longo Prazo' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Metas Financeiras</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe seu progresso rumo aos seus objetivos</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm(emptyGoal); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nova Meta Financeira</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Nome da Meta *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Viagem para Europa" className="bg-input border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Valor Alvo (R$) *</Label>
                  <Input type="number" step="0.01" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Valor Atual (R$)</Label>
                  <Input type="number" step="0.01" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Prazo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curto_prazo">Curto Prazo</SelectItem>
                      <SelectItem value="medio_prazo">Médio Prazo</SelectItem>
                      <SelectItem value="longo_prazo">Longo Prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Data Limite</Label>
                  <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createMutation.isPending}>Criar Meta</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contribution Dialog */}
      <Dialog open={contribOpen} onOpenChange={v => { setContribOpen(v); if (!v) { setContribAmount(''); setSelectedGoalId(null); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Contribuição</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContrib} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-foreground">Valor (R$) *</Label>
              <Input type="number" step="0.01" value={contribAmount} onChange={e => setContribAmount(e.target.value)} placeholder="0,00" className="bg-input border-border text-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Data</Label>
              <Input type="date" value={contribDate} onChange={e => setContribDate(e.target.value)} className="bg-input border-border text-foreground" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setContribOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={contribMutation.isPending}>Adicionar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : goals.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma meta definida</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Crie sua primeira meta financeira</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal: any) => {
            const pct = calcProgress(goal.currentAmount, goal.targetAmount);
            const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount);
            return (
              <Card key={goal.id} className="bg-card border-border overflow-hidden group">
                <div className="h-1.5" style={{ backgroundColor: goal.color ?? '#f59e0b' }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{goal.name}</h3>
                        <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: (goal.color ?? '#f59e0b') + '40', color: goal.color ?? '#f59e0b' }}>
                          {typeLabels[goal.type] ?? goal.type}
                        </Badge>
                        {goal.isCompleted && <Badge className="bg-emerald-400/20 text-emerald-400 border-0 text-xs">Concluída</Badge>}
                      </div>
                      {goal.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{goal.description}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedGoalId(goal.id); setContribOpen(true); }}>
                        <PlusCircle className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ id: goal.id })}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold" style={{ color: goal.color ?? '#f59e0b' }}>{pct.toFixed(1)}%</span>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatCurrency(goal.currentAmount)} acumulado</span>
                      <span>Meta: {formatCurrency(goal.targetAmount)}</span>
                    </div>
                    {remaining > 0 && (
                      <p className="text-xs text-muted-foreground">Faltam {formatCurrency(remaining)}</p>
                    )}
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">Prazo: {formatDate(goal.deadline)}</p>
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
