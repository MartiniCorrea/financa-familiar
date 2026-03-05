import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MEMBER_ROLES = [
  { value: 'responsavel', label: 'Responsável' },
  { value: 'conjuge', label: 'Cônjuge' },
  { value: 'filho', label: 'Filho(a)' },
  { value: 'dependente', label: 'Dependente' },
  { value: 'outro', label: 'Outro' },
];

const AVATAR_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

type MemberForm = { name: string; role: string; birthDate: string; income: string; color: string; };
const emptyForm: MemberForm = { name: '', role: 'responsavel', birthDate: '', income: '', color: '#f59e0b' };

export default function FamilyMembers() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: members = [], isLoading } = trpc.familyMembers.list.useQuery();
  const createMutation = trpc.familyMembers.create.useMutation({
    onSuccess: () => { utils.familyMembers.list.invalidate(); setOpen(false); setForm(emptyForm); toast.success("Membro adicionado!"); },
    onError: () => toast.error("Erro ao adicionar membro"),
  });
  const deleteMutation = trpc.familyMembers.delete.useMutation({
    onSuccess: () => { utils.familyMembers.list.invalidate(); toast.success("Membro removido!"); },
    onError: () => toast.error("Erro ao remover membro"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast.error("Informe o nome do membro");
    createMutation.mutate({ name: form.name, relationship: form.role as any, color: form.color });
  }

  const roleLabel = (role: string) => MEMBER_ROLES.find(r => r.value === role)?.label ?? role;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Membros da Família</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os membros e suas informações financeiras</p>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Novo Membro da Família</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className="bg-input border-border text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-foreground">Papel</Label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>{MEMBER_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground">Data de Nascimento</Label>
                  <Input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} className="bg-input border-border text-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Renda Mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.income} onChange={e => setForm(f => ({ ...f, income: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Cor do Avatar</Label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(c => (
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
      ) : members.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum membro cadastrado</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Adicione os membros da sua família para categorizar receitas e despesas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((member: any) => (
            <Card key={member.id} className="bg-card border-border group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback className="text-lg font-semibold" style={{ backgroundColor: (member.color ?? '#f59e0b') + '30', color: member.color ?? '#f59e0b' }}>
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{member.name}</h3>
                      <Badge variant="outline" className="text-xs mt-0.5" style={{ borderColor: (member.color ?? '#f59e0b') + '40', color: member.color ?? '#f59e0b' }}>
                        {roleLabel(member.role)}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => deleteMutation.mutate({ id: member.id })}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                {member.monthlyIncome && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Renda Mensal</span>
                      <span className="font-semibold text-emerald-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(member.monthlyIncome))}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
