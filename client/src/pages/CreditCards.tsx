import { trpc } from "@/lib/trpc";
import { formatCurrency, getTodayString } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CARD_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#d97706'];

type CardForm = { name: string; bank: string; lastFourDigits: string; creditLimit: string; closingDay: string; dueDay: string; color: string; };
const emptyForm: CardForm = { name: '', bank: '', lastFourDigits: '', creditLimit: '', closingDay: '1', dueDay: '10', color: '#6366f1' };

export default function CreditCards() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CardForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: cards = [], isLoading } = trpc.creditCards.list.useQuery();
  const createMutation = trpc.creditCards.create.useMutation({
    onSuccess: () => { utils.creditCards.list.invalidate(); setOpen(false); setForm(emptyForm); toast.success("Cartão adicionado!"); },
    onError: () => toast.error("Erro ao salvar cartão"),
  });
  const deleteMutation = trpc.creditCards.delete.useMutation({
    onSuccess: () => { utils.creditCards.list.invalidate(); toast.success("Cartão removido!"); },
    onError: () => toast.error("Erro ao remover cartão"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.creditLimit) return toast.error("Preencha os campos obrigatórios");
    createMutation.mutate({ ...form, creditLimit: form.creditLimit, closingDay: parseInt(form.closingDay), dueDay: parseInt(form.dueDay) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Cartões de Crédito</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus cartões e limites</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Novo Cartão</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Nome do Cartão *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Nubank Roxinho" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Banco/Emissor</Label>
                  <Input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} placeholder="Ex: Nubank" className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Últimos 4 dígitos</Label>
                  <Input maxLength={4} value={form.lastFourDigits} onChange={e => setForm(f => ({ ...f, lastFourDigits: e.target.value }))} placeholder="0000" className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Limite de Crédito (R$) *</Label>
                <Input type="number" step="0.01" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Dia de Fechamento</Label>
                  <Input type="number" min="1" max="31" value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))} className="bg-input border-border text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Dia de Vencimento</Label>
                  <Input type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createMutation.isPending}>Adicionar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : cards.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum cartão cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map(card => (
            <Card key={card.id} className="bg-card border-border overflow-hidden group">
              <div className="h-2" style={{ backgroundColor: card.color ?? '#6366f1' }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{card.name}</h3>
                    {card.bank && <p className="text-xs text-muted-foreground mt-0.5">{card.bank}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {card.lastFourDigits && (
                      <Badge variant="outline" className="text-xs font-mono">•••• {card.lastFourDigits}</Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMutation.mutate({ id: card.id })}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Limite</span>
                    <span className="font-semibold text-foreground">{formatCurrency(card.creditLimit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fechamento</span>
                    <span className="text-foreground">Dia {card.closingDay}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span className="text-foreground">Dia {card.dueDay}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
