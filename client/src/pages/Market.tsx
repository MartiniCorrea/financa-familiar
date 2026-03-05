import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, ShoppingCart, Store, TrendingDown, TrendingUp, Search,
  CheckCircle2, Circle, Package, BarChart2, ChevronDown, ChevronUp, Tag, Pencil
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/finance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ITEM_UNITS = ["un", "kg", "g", "L", "ml", "cx", "pct", "dz"];

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TripItem = {
  id: string; // temporário (frontend)
  name: string;
  quantity: string;
  unit: string;
  actualPrice: string;
};

export default function Market() {
  const [tab, setTab] = useState("trips");
  const [openTrip, setOpenTrip] = useState(false);
  const [openSupermarket, setOpenSupermarket] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState<number | null>(null);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Formulário de nova ida ao mercado
  const [tripForm, setTripForm] = useState({
    supermarketId: "",
    shoppingDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [tripItems, setTripItems] = useState<TripItem[]>([
    { id: "1", name: "", quantity: "1", unit: "un", actualPrice: "" }
  ]);

  // Formulário de novo mercado
  const [supermarketForm, setSupermarketForm] = useState({ name: "", address: "" });

  const utils = trpc.useUtils();

  // Queries
  const { data: supermarkets = [] } = trpc.shopping.supermarkets.list.useQuery();
  const { data: lists = [], refetch: refetchLists } = trpc.shopping.lists.list.useQuery();
  const listsRef = { current: lists };
  listsRef.current = lists;
  const { data: products = [] } = trpc.priceHistory.products.useQuery();
  const { data: comparison = [] } = trpc.priceHistory.comparison.useQuery(
    { productName: selectedProduct! },
    { enabled: !!selectedProduct }
  );

  // Items de uma lista expandida
  const { data: expandedItems = [] } = trpc.shopping.items.list.useQuery(
    { listId: expandedTrip! },
    { enabled: !!expandedTrip }
  );

  // Mutations
  const createListMutation = trpc.shopping.lists.create.useMutation({
    onSuccess: () => { utils.shopping.lists.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createItemMutation = trpc.shopping.items.create.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const createPriceMutation = trpc.priceHistory.create.useMutation({
    onError: () => {}, // silencioso — é automático
  });
  const updateListMutation = trpc.shopping.lists.update.useMutation({
    onSuccess: () => { utils.shopping.lists.invalidate(); },
  });
  const deleteListMutation = trpc.shopping.lists.delete.useMutation({
    onSuccess: () => { utils.shopping.lists.invalidate(); toast.success("Ida removida!"); },
    onError: (e) => toast.error(e.message),
  });
  const createSupermarketMutation = trpc.shopping.supermarkets.create.useMutation({
    onSuccess: () => { utils.shopping.supermarkets.invalidate(); toast.success("Mercado cadastrado!"); setOpenSupermarket(false); setSupermarketForm({ name: "", address: "" }); },
    onError: (e) => toast.error(e.message),
  });

  // Adicionar item à lista temporária
  function addItem() {
    setTripItems(prev => [...prev, { id: Date.now().toString(), name: "", quantity: "1", unit: "un", actualPrice: "" }]);
  }
  function removeItem(id: string) {
    setTripItems(prev => prev.filter(i => i.id !== id));
  }
  function updateItem(id: string, field: keyof TripItem, value: string) {
    setTripItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  // Salvar ida ao mercado
  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault();
    const validItems = tripItems.filter(i => i.name.trim() && i.actualPrice);
    if (!tripForm.supermarketId) return toast.error("Selecione o supermercado");
    if (validItems.length === 0) return toast.error("Adicione pelo menos um item com nome e preço");

    const totalActual = validItems.reduce((sum, i) => sum + (parseFloat(i.actualPrice) * parseFloat(i.quantity || "1")), 0);
    const supermarketName = supermarkets.find(s => s.id === parseInt(tripForm.supermarketId))?.name || "";

    try {
      // 1. Criar a lista (ida ao mercado)
      const listResult = await createListMutation.mutateAsync({
        name: `${supermarketName} — ${new Date(tripForm.shoppingDate).toLocaleDateString("pt-BR")}`,
        supermarketId: parseInt(tripForm.supermarketId),
        shoppingDate: tripForm.shoppingDate,
        notes: tripForm.notes || undefined,
      });

      // 2. Pegar o id da lista criada (buscar a mais recente)
      // Aguardar um momento e usar refetch para obter a lista atualizada
      const refetchResult = await refetchLists();
      const newLists = refetchResult.data || [];
      const newList = newLists[0] ?? null; // mais recente
      if (!newList) throw new Error("Erro ao criar ida");

      // 3. Criar itens e salvar preços no histórico automaticamente
      for (const item of validItems) {
        const qty = parseFloat(item.quantity || "1");
        const unitPrice = parseFloat(item.actualPrice);
        const totalItemPrice = unitPrice * qty;

        // Criar item na lista
        await createItemMutation.mutateAsync({
          listId: newList.id,
          name: item.name.trim(),
          quantity: item.quantity,
          unit: item.unit,
          estimatedPrice: String(totalItemPrice.toFixed(2)),
        });

        // Salvar preço unitário no histórico automaticamente
        await createPriceMutation.mutateAsync({
          productName: item.name.trim(),
          supermarketId: parseInt(tripForm.supermarketId),
          price: String(unitPrice.toFixed(2)),
          unit: item.unit,
          recordedAt: tripForm.shoppingDate,
        });
      }

      // 4. Atualizar total da lista
      await updateListMutation.mutateAsync({
        id: newList.id,
        actualTotal: String(totalActual.toFixed(2)),
        status: "concluida",
      });

      toast.success(`Ida ao mercado salva! Total: ${formatCurrency(totalActual)}`);
      setOpenTrip(false);
      setTripForm({ supermarketId: "", shoppingDate: new Date().toISOString().split("T")[0], notes: "" });
      setTripItems([{ id: "1", name: "", quantity: "1", unit: "un", actualPrice: "" }]);
      utils.priceHistory.products.invalidate();
      utils.priceHistory.list.invalidate();
      refetchLists();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "tente novamente"));
    }
  }

  // Produtos filtrados para comparação
  const filteredProducts = useMemo(() => {
    if (!searchProduct) return products;
    return products.filter((p: string) => p.toLowerCase().includes(searchProduct.toLowerCase()));
  }, [products, searchProduct]);

  const cheapest = comparison.length > 0 ? [...comparison].sort((a, b) => a.lastPrice - b.lastPrice) : [];
  const mostExpensive = cheapest.length > 0 ? cheapest[cheapest.length - 1] : null;
  const cheapestItem = cheapest.length > 0 ? cheapest[0] : null;
  const savings = cheapestItem && mostExpensive ? mostExpensive.lastPrice - cheapestItem.lastPrice : 0;

  // Totais
  const completedLists = lists.filter(l => l.status === "concluida");
  const totalSpent = completedLists.reduce((sum, l) => sum + parseFloat(l.actualTotal || "0"), 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mercado</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registre suas compras e compare preços entre supermercados
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {/* Cadastrar mercado */}
          <Dialog open={openSupermarket} onOpenChange={setOpenSupermarket}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Store className="w-4 h-4 mr-2" /> Novo Mercado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Supermercado</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (!supermarketForm.name.trim()) return toast.error("Informe o nome"); createSupermarketMutation.mutate(supermarketForm); }} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input value={supermarketForm.name} onChange={e => setSupermarketForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Atacadão, Extra, Assaí..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Endereço</Label>
                  <Input value={supermarketForm.address} onChange={e => setSupermarketForm(f => ({ ...f, address: e.target.value }))} placeholder="Opcional" />
                </div>
                <Button type="submit" className="w-full" disabled={createSupermarketMutation.isPending}>Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Registrar ida ao mercado */}
          <Dialog open={openTrip} onOpenChange={v => { setOpenTrip(v); if (!v) { setTripItems([{ id: "1", name: "", quantity: "1", unit: "un", actualPrice: "" }]); } }}>
            <DialogTrigger asChild>
              <Button>
                <ShoppingCart className="w-4 h-4 mr-2" /> Registrar Compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Ida ao Mercado</DialogTitle>
                <p className="text-sm text-muted-foreground">Os preços serão salvos automaticamente no banco de dados para comparação futura.</p>
              </DialogHeader>
              <form onSubmit={handleSaveTrip} className="space-y-5 pt-2">
                {/* Dados gerais */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Supermercado *</Label>
                    <Select value={tripForm.supermarketId} onValueChange={v => setTripForm(f => ({ ...f, supermarketId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {supermarkets.length === 0 ? (
                          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                            Nenhum mercado cadastrado.<br />Cadastre um primeiro.
                          </div>
                        ) : supermarkets.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data da Compra *</Label>
                    <Input type="date" value={tripForm.shoppingDate} onChange={e => setTripForm(f => ({ ...f, shoppingDate: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Input value={tripForm.notes} onChange={e => setTripForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
                </div>

                {/* Itens comprados */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Itens Comprados *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Item
                    </Button>
                  </div>

                  {/* Cabeçalho da tabela */}
                  <div className="grid grid-cols-12 gap-1.5 text-xs font-medium text-muted-foreground px-1">
                    <div className="col-span-4">Produto</div>
                    <div className="col-span-2">Qtd</div>
                    <div className="col-span-2">Unid.</div>
                    <div className="col-span-3">Preço Unit. (R$)</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {tripItems.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center">
                        <div className="col-span-4">
                          <Input
                            value={item.name}
                            onChange={e => updateItem(item.id, "name", e.target.value)}
                            placeholder={`Item ${idx + 1}`}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, "quantity", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Select value={item.unit} onValueChange={v => updateItem(item.id, "unit", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ITEM_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.actualPrice}
                            onChange={e => updateItem(item.id, "actualPrice", e.target.value)}
                            placeholder="0,00"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeItem(item.id)}
                            disabled={tripItems.length === 1}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total calculado */}
                  {tripItems.some(i => i.actualPrice) && (
                    <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="text-sm font-medium">Total estimado:</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(
                          tripItems.reduce((sum, i) =>
                            sum + (parseFloat(i.actualPrice || "0") * parseFloat(i.quantity || "1")), 0
                          )
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenTrip(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1" disabled={createListMutation.isPending}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Salvar Compra
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Idas ao Mercado</p>
                <p className="text-xl font-bold">{completedLists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Gasto</p>
                <p className="text-xl font-bold text-destructive">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Supermercados</p>
                <p className="text-xl font-bold">{supermarkets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Produtos Rastreados</p>
                <p className="text-xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="trips">
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Idas ao Mercado
          </TabsTrigger>
          <TabsTrigger value="prices">
            <BarChart2 className="w-3.5 h-3.5 mr-1.5" /> Comparar Preços
          </TabsTrigger>
          <TabsTrigger value="supermarkets">
            <Store className="w-3.5 h-3.5 mr-1.5" /> Supermercados
          </TabsTrigger>
        </TabsList>

        {/* Aba: Idas ao Mercado */}
        <TabsContent value="trips" className="mt-4 space-y-3">
          {lists.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">Nenhuma compra registrada ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Registrar Compra" para começar a acompanhar seus gastos no mercado.
                </p>
              </CardContent>
            </Card>
          ) : (
            lists.map(list => {
              const market = supermarkets.find(s => s.id === list.supermarketId);
              const isExpanded = expandedTrip === list.id;
              const total = parseFloat(list.actualTotal || list.estimatedTotal || "0");

              return (
                <Card key={list.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/20 transition-colors"
                      onClick={() => setExpandedTrip(isExpanded ? null : list.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{list.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {market && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                <Store className="w-2.5 h-2.5 mr-1" />{market.name}
                              </Badge>
                            )}
                            {list.shoppingDate && (
                              <span className="text-xs text-muted-foreground">{formatDate(list.shoppingDate as any)}</span>
                            )}
                            <Badge
                              variant="secondary"
                              className={`text-xs px-1.5 py-0 ${list.status === "concluida" ? "bg-green-100 text-green-700" : ""}`}
                            >
                              {list.status === "concluida" ? "Concluída" : list.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {total > 0 && (
                          <span className="text-base font-bold text-destructive">{formatCurrency(total)}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); deleteListMutation.mutate({ id: list.id }); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4">
                        {expandedItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">Nenhum item registrado</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1 mb-1">
                              <div className="col-span-5">Produto</div>
                              <div className="col-span-2">Qtd</div>
                              <div className="col-span-2">Unid.</div>
                              <div className="col-span-3 text-right">Total</div>
                            </div>
                            {expandedItems.map(item => (
                              <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-background rounded-lg px-3 py-2">
                                <div className="col-span-5">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    <span className="text-sm font-medium truncate">{item.name}</span>
                                  </div>
                                </div>
                                <div className="col-span-2 text-sm text-muted-foreground">{item.quantity}</div>
                                <div className="col-span-2 text-sm text-muted-foreground">{item.unit}</div>
                                <div className="col-span-3 text-right">
                                  <span className="text-sm font-semibold">{formatCurrency(parseFloat(item.actualPrice || item.estimatedPrice || "0"))}</span>
                                </div>
                              </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 border-t border-border mt-2">
                              <span className="text-sm font-medium text-muted-foreground">{expandedItems.length} itens</span>
                              <span className="text-base font-bold text-destructive">{formatCurrency(total)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Aba: Comparar Preços */}
        <TabsContent value="prices" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Comparativo de Preços por Produto
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Selecione um produto para ver onde ele está mais barato com base no histórico de compras.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Busca de produto */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-9"
                />
              </div>

              {/* Lista de produtos */}
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">Nenhum produto no histórico ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">Registre compras para começar a comparar preços.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredProducts.map((product: string) => (
                    <button
                      key={product}
                      onClick={() => setSelectedProduct(selectedProduct === product ? null : product)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        selectedProduct === product
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      {product}
                    </button>
                  ))}
                </div>
              )}

              {/* Comparativo do produto selecionado */}
              {selectedProduct && comparison.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{selectedProduct}</h3>
                    {savings > 0 && (
                      <Badge className="bg-green-100 text-green-700 border-0">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Economize até {formatCurrency(savings)}
                      </Badge>
                    )}
                  </div>

                  {/* Gráfico de barras */}
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={cheapest} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="supermarketName" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                      <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                      <Bar dataKey="lastPrice" name="Último Preço" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="minPrice" name="Menor Preço" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Ranking */}
                  <div className="space-y-2">
                    {cheapest.map((item, idx) => (
                      <div
                        key={item.supermarketId}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          idx === 0 ? "border-green-200 bg-green-50" : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.supermarketName}</p>
                            <p className="text-xs text-muted-foreground">
                              Mín: {formatCurrency(item.minPrice)} · Máx: {formatCurrency(item.maxPrice)} · {item.count}x registrado
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold">{formatCurrency(item.lastPrice)}</p>
                          <p className="text-xs text-muted-foreground">último preço</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Supermercados */}
        <TabsContent value="supermarkets" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Supermercados Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {supermarkets.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">Nenhum supermercado cadastrado.</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Mercado" para adicionar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supermarkets.map(s => {
                    const tripsCount = lists.filter(l => l.supermarketId === s.id).length;
                    const totalAtMarket = lists
                      .filter(l => l.supermarketId === s.id && l.status === "concluida")
                      .reduce((sum, l) => sum + parseFloat(l.actualTotal || "0"), 0);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Store className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(totalAtMarket)}</p>
                          <p className="text-xs text-muted-foreground">{tripsCount} {tripsCount === 1 ? "visita" : "visitas"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
