import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Trash2, XCircle, RefreshCw, TrendingUp, TrendingDown, CreditCard, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  yearly: "Anual",
};

const TYPE_INFO: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  expense: { label: "Despesa", icon: TrendingDown, color: "text-rose-500" },
  income: { label: "Receita", icon: TrendingUp, color: "text-emerald-500" },
  credit_card_item: { label: "Cartão de Crédito", icon: CreditCard, color: "text-blue-500" },
};

function formatDateBR(dateVal: any): string {
  if (!dateVal) return "—";
  const s = String(dateVal);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(s + "T12:00:00").toLocaleDateString("pt-BR");
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default function Recurring() {
  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = trpc.recurring.list.useQuery();

  const cancelMutation = trpc.recurring.cancel.useMutation({
    onSuccess: () => {
      utils.recurring.list.invalidate();
      toast.success("Recorrência pausada!");
    },
    onError: (e) => toast.error(e.message || "Erro ao pausar recorrência"),
  });

  const deleteMutation = trpc.recurring.delete.useMutation({
    onSuccess: () => {
      utils.recurring.list.invalidate();
      toast.success("Recorrência removida!");
    },
    onError: (e) => toast.error(e.message || "Erro ao remover recorrência"),
  });

  const generateMutation = trpc.recurring.generatePending.useMutation({
    onSuccess: (result: any) => {
      utils.expenses.list.invalidate();
      utils.incomes.list.invalidate();
      utils.creditCardInvoices.list.invalidate();
      utils.dashboard.summary.invalidate();
      utils.recurring.list.invalidate();
      const count = result?.generated ?? 0;
      toast.success(count > 0 ? `${count} lançamento(s) gerado(s) com sucesso!` : "Nenhum lançamento pendente para gerar.");
    },
    onError: (e) => toast.error(e.message || "Erro ao gerar lançamentos"),
  });

  const activeRules = rules.filter((r: any) => r.isActive);
  const pausedRules = rules.filter((r: any) => !r.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recorrências</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus lançamentos automáticos recorrentes
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
          {generateMutation.isPending ? "Gerando..." : "Gerar Lançamentos Pendentes"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Repeat className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-foreground">{rules.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Ativas</p>
              <p className="text-2xl font-bold text-emerald-500">{activeRules.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pausadas</p>
              <p className="text-2xl font-bold text-amber-500">{pausedRules.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm text-violet-700 dark:text-violet-300">
        <Repeat className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          As recorrências geram lançamentos automaticamente. Clique em <strong>"Gerar Lançamentos Pendentes"</strong> para criar os lançamentos do mês atual que ainda não foram gerados.
        </p>
      </div>

      {/* Active Rules */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : activeRules.length === 0 && pausedRules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Repeat className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma recorrência cadastrada</p>
            <p className="text-muted-foreground/60 text-sm mt-1">
              Ao adicionar uma despesa, receita ou gasto no cartão, marque a opção "Recorrente" para criar uma regra automática.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeRules.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Recorrências Ativas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {activeRules.map((rule: any) => {
                    const typeInfo = TYPE_INFO[rule.type] ?? TYPE_INFO.expense;
                    const TypeIcon = typeInfo.icon;
                    return (
                      <div key={rule.id} className="flex items-center justify-between p-4 hover:bg-accent/10 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            rule.type === 'income' ? 'bg-emerald-500/10' :
                            rule.type === 'credit_card_item' ? 'bg-blue-500/10' : 'bg-rose-500/10'
                          }`}>
                            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{rule.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <Badge variant="outline" className="text-xs px-1.5 py-0">{typeInfo.label}</Badge>
                              <Badge className="text-xs px-1.5 py-0 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                                <Repeat className="w-2.5 h-2.5 mr-0.5" />
                                {FREQUENCY_LABELS[rule.frequency] ?? rule.frequency}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />
                                Início: {formatDateBR(rule.startDate)}
                              </span>
                              {rule.endDate && (
                                <span className="text-xs text-muted-foreground">
                                  Fim: {formatDateBR(rule.endDate)}
                                </span>
                              )}
                              {rule.lastGeneratedDate && (
                                <span className="text-xs text-muted-foreground">
                                  Último: {formatDateBR(rule.lastGeneratedDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className={`text-base font-semibold ${typeInfo.color}`}>
                            {formatCurrency(rule.amount)}
                          </span>
                          <div className="flex gap-1">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Pausar recorrência">
                                  <XCircle className="w-3.5 h-3.5 text-amber-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Pausar recorrência?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A recorrência "{rule.description}" será pausada e não gerará novos lançamentos. Você pode removê-la definitivamente se desejar.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => cancelMutation.mutate({ id: rule.id })} className="bg-amber-500 hover:bg-amber-600">
                                    Pausar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Remover recorrência">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover recorrência?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A recorrência "{rule.description}" será removida permanentemente. Os lançamentos já gerados não serão afetados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate({ id: rule.id })} className="bg-destructive hover:bg-destructive/90">
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {pausedRules.length > 0 && (
            <Card className="opacity-70">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Recorrências Pausadas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {pausedRules.map((rule: any) => {
                    const typeInfo = TYPE_INFO[rule.type] ?? TYPE_INFO.expense;
                    const TypeIcon = typeInfo.icon;
                    return (
                      <div key={rule.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-muted">
                            <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-muted-foreground truncate line-through">{rule.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">{typeInfo.label}</Badge>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">Pausada</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-sm text-muted-foreground">{formatCurrency(rule.amount)}</span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover recorrência?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  A recorrência "{rule.description}" será removida permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate({ id: rule.id })} className="bg-destructive hover:bg-destructive/90">
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
