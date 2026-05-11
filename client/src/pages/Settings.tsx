import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Settings() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=fechado, 1=aviso, 2=confirmação digitada
  const [typed, setTyped] = useState("");

  const utils = trpc.useUtils();

  const resetMutation = trpc.settings.resetAllData.useMutation({
    onSuccess: () => {
      toast.success("Dados resetados com sucesso! Começando do zero.");
      // Invalidar todos os caches
      utils.invalidate();
      setStep(0);
      setTyped("");
      navigate("/");
    },
    onError: (err) => {
      toast.error("Erro ao resetar dados: " + err.message);
      setStep(0);
      setTyped("");
    },
  });

  const handleConfirm = () => {
    if (typed !== "RESETAR TUDO") {
      toast.error("Texto de confirmação incorreto.");
      return;
    }
    resetMutation.mutate({ confirmation: "RESETAR TUDO" });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
      </div>

      {/* Zona de Perigo */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis. Tenha certeza antes de prosseguir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="space-y-1">
              <p className="font-medium text-sm">Resetar todos os dados</p>
              <p className="text-sm text-muted-foreground">
                Apaga <strong>todos os lançamentos</strong> (despesas, receitas, contas a pagar, faturas de cartão, transferências, importações) e zera o saldo inicial de todas as contas bancárias. As contas, cartões e categorias são mantidos.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => setStep(1)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog - Passo 1: Aviso */}
      <Dialog open={step === 1} onOpenChange={(open) => { if (!open) setStep(0); }}>
        <DialogContent translate="no">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Tem certeza absoluta?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>Esta ação é <strong>irreversível</strong>. Ao confirmar, serão apagados permanentemente:</p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                <li>Todas as despesas</li>
                <li>Todas as receitas</li>
                <li>Todas as contas a pagar/receber</li>
                <li>Todos os itens e faturas de cartão de crédito</li>
                <li>Todas as transferências entre contas</li>
                <li>Todas as importações de CSV</li>
                <li>Todas as regras de recorrência</li>
                <li>O saldo inicial de todas as contas bancárias será zerado</li>
              </ul>
              <p className="mt-2 font-medium">As contas bancárias, cartões e categorias serão mantidos.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => setStep(2)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Entendo, continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Passo 2: Digitar confirmação */}
      <Dialog open={step === 2} onOpenChange={(open) => { if (!open) { setStep(0); setTyped(""); } }}>
        <DialogContent translate="no">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmação final
            </DialogTitle>
            <DialogDescription>
              Para confirmar o reset, digite exatamente o texto abaixo:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded bg-muted text-center font-mono font-bold text-sm select-none">
              RESETAR TUDO
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-text">Digite a confirmação:</Label>
              <Input
                id="confirm-text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="RESETAR TUDO"
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setStep(0); setTyped(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={typed !== "RESETAR TUDO" || resetMutation.isPending}
              onClick={handleConfirm}
            >
              {resetMutation.isPending ? (
                <>Resetando...</>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar todos os dados
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
