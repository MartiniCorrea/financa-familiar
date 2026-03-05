import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Tag, TrendingDown, TrendingUp, Store, Trash2, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function PriceHistory() {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [supermarketOpen, setSupermarketOpen] = useState(false);
  const [form, setForm] = useState({ productName: "", supermarketId: "", price: "", unit: "un", recordedAt: new Date().toISOString().split("T")[0] });
  const [supermarketForm, setSupermarketForm] = useState({ name: "", address: "" });

  const { data: records = [], refetch } = trpc.priceHistory.list.useQuery(search ? { productName: search } : undefined);
  const { data: products = [] } = trpc.priceHistory.products.useQuery();
  const { data: supermarkets = [] } = trpc.shopping.supermarkets.list.useQuery();
  const { data: comparison = [] } = trpc.priceHistory.comparison.useQuery(
    { productName: selectedProduct! },
    { enabled: !!selectedProduct }
  );

  const createMutation = trpc.priceHistory.create.useMutation({
    onSuccess: () => { toast.success("Preço registrado!"); setOpen(false); setForm({ productName: "", supermarketId: "", price: "", unit: "un", recordedAt: new Date().toISOString().split("T")[0] as string }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.priceHistory.delete.useMutation({
    onSuccess: () => { toast.success("Registro removido"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const createSupermarketMutation = trpc.shopping.supermarkets.create.useMutation({
    onSuccess: () => { toast.success("Mercado cadastrado!"); setSupermarketOpen(false); setSupermarketForm({ name: "", address: "" }); },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productName || !form.supermarketId || !form.price) return toast.error("Preencha todos os campos obrigatórios");
    createMutation.mutate({ ...form, supermarketId: parseInt(form.supermarketId), recordedAt: form.recordedAt });
  }

  const cheapestComparison = comparison.length > 0 ? [...comparison].sort((a, b) => a.lastPrice - b.lastPrice) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Preços</h1>
          <p className="text-muted-foreground text-sm mt-1">Registre e compare preços entre supermercados</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={supermarketOpen} onOpenChange={setSupermarketOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Store className="w-4 h-4 mr-2" />Novo Mercado</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Supermercado</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createSupermarketMutation.mutate(supermarketForm); }} className="space-y-4">
                <div><Label>Nome *</Label><Input value={supermarketForm.name} onChange={e => setSupermarketForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Mercado Extra" /></div>
                <div><Label>Endereço</Label><Input value={supermarketForm.address} onChange={e => setSupermarketForm(f => ({ ...f, address: e.target.value }))} placeholder="Opcional" /></div>
                <Button type="submit" className="w-full" disabled={createSupermarketMutation.isPending}>Cadastrar</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Registrar Preço</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Preço de Produto</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Produto *</Label>
                  <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="Ex: Arroz 5kg" list="products-list" />
                  <datalist id="products-list">{products.map(p => <option key={p} value={p} />)}</datalist>
                </div>
                <div>
                  <Label>Supermercado *</Label>
                  <Select value={form.supermarketId} onValueChange={v => setForm(f => ({ ...f, supermarketId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{supermarkets.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0,00" /></div>
                  <div><Label>Unidade</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="un, kg, L..." /></div>
                </div>
                <div><Label>Data *</Label><Input type="date" value={form.recordedAt} onChange={e => setForm(f => ({ ...f, recordedAt: e.target.value }))} /></div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>Registrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Comparativo por produto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BarChart2 className="w-4 h-4 text-primary" />Comparativo de Preços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Select value={selectedProduct ?? ""} onValueChange={v => setSelectedProduct(v || null)}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
              <SelectContent>{products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            {selectedProduct && <Button variant="outline" size="sm" onClick={() => setSelectedProduct(null)}>Limpar</Button>}
          </div>
          {selectedProduct && comparison.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {cheapestComparison.map((c, i) => (
                  <div key={c.supermarketId} className={`p-3 rounded-lg border ${i === 0 ? 'border-green-300 bg-green-50' : 'border-border bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{c.supermarketName}</span>
                      {i === 0 && <Badge className="bg-green-500 text-white text-xs">Mais barato</Badge>}
                    </div>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(c.lastPrice)}</p>
                    <p className="text-xs text-muted-foreground">Última compra • {c.lastDate}</p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Mín: {formatCurrency(c.minPrice)}</span>
                      <span>Máx: {formatCurrency(c.maxPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cheapestComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="supermarketName" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v.toFixed(2)}`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="lastPrice" name="Último Preço" fill="var(--color-primary)" radius={[4,4,0,0]} />
                  <Bar dataKey="avgPrice" name="Preço Médio" fill="var(--color-chart-2)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : selectedProduct ? (
            <p className="text-muted-foreground text-sm">Nenhum registro para este produto.</p>
          ) : (
            <p className="text-muted-foreground text-sm">Selecione um produto para ver o comparativo entre mercados.</p>
          )}
        </CardContent>
      </Card>

      {/* Busca e listagem */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />Todos os Registros</CardTitle>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum registro encontrado.</p>
              <p className="text-sm mt-1">Comece registrando os preços das suas compras!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.productName}</p>
                      <p className="text-xs text-muted-foreground">{r.supermarketName} • {String(r.recordedAt)} • {r.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground">{formatCurrency(parseFloat(r.price as string))}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: r.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
