import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getTodayString } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ShoppingCart, Trash2, CheckCircle2, Package, Store, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ITEM_CATEGORIES = [
  'Hortifruti', 'Carnes', 'Laticínios', 'Padaria', 'Bebidas', 'Limpeza', 'Higiene', 'Congelados', 'Mercearia', 'Outros'
];

type ListForm = { name: string; shoppingDate: string; };
type ItemForm = { name: string; quantity: string; unit: string; estimatedPrice: string; category: string; };
const emptyList: ListForm = { name: '', shoppingDate: getTodayString() };
const emptyItem: ItemForm = { name: '', quantity: '1', unit: 'un', estimatedPrice: '', category: 'Outros' };

export default function Shopping() {
  const [listOpen, setListOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [listForm, setListForm] = useState<ListForm>(emptyList);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);

  const utils = trpc.useUtils();
  const { data: lists = [], isLoading } = trpc.shopping.lists.list.useQuery();
  const { data: items = [] } = trpc.shopping.items.list.useQuery(
    { listId: selectedListId! },
    { enabled: !!selectedListId }
  );

  const createListMutation = trpc.shopping.lists.create.useMutation({
    onSuccess: () => { utils.shopping.lists.list.invalidate(); setListOpen(false); setListForm(emptyList); toast.success("Lista criada!"); },
    onError: () => toast.error("Erro ao criar lista"),
  });
  const deleteListMutation = trpc.shopping.lists.delete.useMutation({
    onSuccess: () => { utils.shopping.lists.list.invalidate(); if (selectedListId) setSelectedListId(null); toast.success("Lista removida!"); },
    onError: () => toast.error("Erro ao remover lista"),
  });
  const createItemMutation = trpc.shopping.items.create.useMutation({
    onSuccess: () => { utils.shopping.items.list.invalidate(); setItemOpen(false); setItemForm(emptyItem); toast.success("Item adicionado!"); },
    onError: () => toast.error("Erro ao adicionar item"),
  });
  const toggleItemMutation = trpc.shopping.items.update.useMutation({
    onSuccess: () => utils.shopping.items.list.invalidate(),
  });
  const deleteItemMutation = trpc.shopping.items.delete.useMutation({
    onSuccess: () => { utils.shopping.items.list.invalidate(); toast.success("Item removido!"); },
  });

  const selectedList = lists.find((l: any) => l.id === selectedListId);
  const checkedItems = items.filter((i: any) => i.isChecked);
  const totalEstimated = items.reduce((s: number, i: any) => s + (parseFloat(i.estimatedPrice ?? '0') * parseFloat(i.quantity)), 0);
  const totalActual = items.reduce((s: number, i: any) => s + (parseFloat(i.actualPrice ?? '0') * parseFloat(i.quantity)), 0);

  function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!listForm.name) return toast.error("Informe o nome da lista");
    createListMutation.mutate({ name: listForm.name, shoppingDate: listForm.shoppingDate });
  }

  function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.name || !selectedListId) return toast.error("Informe o nome do item");
    createItemMutation.mutate({ listId: selectedListId, ...itemForm, quantity: itemForm.quantity, estimatedPrice: itemForm.estimatedPrice || undefined });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Compras de Mercado</h1>
          <p className="text-muted-foreground text-sm mt-1">Listas de compras e controle de preços</p>
        </div>
        <Dialog open={listOpen} onOpenChange={v => { setListOpen(v); if (!v) setListForm(emptyList); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" /> Nova Lista
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nova Lista de Compras</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-foreground">Nome da Lista *</Label>
                <Input value={listForm.name} onChange={e => setListForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Compras da semana" className="bg-input border-border text-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground">Data da Compra</Label>
                <Input type="date" value={listForm.shoppingDate} onChange={e => setListForm(f => ({ ...f, shoppingDate: e.target.value }))} className="bg-input border-border text-foreground" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setListOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createListMutation.isPending}>Criar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists Panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Listas</h2>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">Carregando...</div>
          ) : lists.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-center">
                <ShoppingCart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma lista</p>
              </CardContent>
            </Card>
          ) : (
            lists.map((list: any) => (
              <Card
                key={list.id}
                className={`bg-card border-border cursor-pointer transition-all hover:border-primary/40 ${selectedListId === list.id ? 'border-primary/60 bg-primary/5' : ''}`}
                onClick={() => setSelectedListId(list.id === selectedListId ? null : list.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{list.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(list.shoppingDate ?? list.createdAt)}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant={list.status === 'concluida' ? 'default' : 'secondary'} className="text-xs">
                          {list.status === 'concluida' ? 'Concluída' : list.status === 'cancelada' ? 'Cancelada' : 'Ativa'}
                        </Badge>
                        {list.actualTotal && <span className="text-xs text-muted-foreground">{formatCurrency(list.actualTotal)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); deleteListMutation.mutate({ id: list.id }); }}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                      {selectedListId === list.id ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Items Panel */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedListId ? (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Selecione uma lista para ver os itens</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selectedList?.name}</h2>
                  <p className="text-xs text-muted-foreground">{checkedItems.length}/{items.length} itens marcados</p>
                </div>
                <div className="flex items-center gap-3">
                  {totalEstimated > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Estimado</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(totalEstimated)}</p>
                    </div>
                  )}
                  <Dialog open={itemOpen} onOpenChange={v => { setItemOpen(v); if (!v) setItemForm(emptyItem); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Adicionar Item</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateItem} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-foreground">Nome do Item *</Label>
                          <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Leite integral" className="bg-input border-border text-foreground" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-foreground">Qtd</Label>
                            <Input type="number" step="0.1" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} className="bg-input border-border text-foreground" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-foreground">Unidade</Label>
                            <Select value={itemForm.unit} onValueChange={v => setItemForm(f => ({ ...f, unit: v }))}>
                              <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct'].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-foreground">Preço Est.</Label>
                            <Input type="number" step="0.01" value={itemForm.estimatedPrice} onChange={e => setItemForm(f => ({ ...f, estimatedPrice: e.target.value }))} placeholder="0,00" className="bg-input border-border text-foreground" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-foreground">Categoria</Label>
                          <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                            <SelectTrigger className="bg-input border-border text-foreground"><SelectValue /></SelectTrigger>
                            <SelectContent>{ITEM_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button type="button" variant="outline" className="flex-1" onClick={() => setItemOpen(false)}>Cancelar</Button>
                          <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={createItemMutation.isPending}>Adicionar</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  {items.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhum item na lista</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {items.map((item: any) => (
                        <div key={item.id} className={`flex items-center gap-3 p-3 hover:bg-accent/20 transition-colors group ${item.isChecked ? 'opacity-60' : ''}`}>
                          <Checkbox
                            checked={item.isChecked}
                            onCheckedChange={() => toggleItemMutation.mutate({ id: item.id, isChecked: !item.isChecked })}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium text-foreground ${item.isChecked ? 'line-through' : ''}`}>{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                              {item.category && <Badge variant="outline" className="text-xs px-1.5 py-0">{item.category}</Badge>}
                              {item.estimatedPrice && <span className="text-xs text-muted-foreground">{formatCurrency(parseFloat(item.estimatedPrice) * parseFloat(item.quantity))}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => deleteItemMutation.mutate({ id: item.id })}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
