import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Fuel, Trash2, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/finance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const FUEL_TYPES = [
  { value: "gasolina_comum", label: "Gasolina Comum" },
  { value: "gasolina_aditivada", label: "Gasolina Aditivada" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "diesel_s10", label: "Diesel S10" },
  { value: "gnv", label: "GNV" },
];

export default function FuelHistory() {
  const [open, setOpen] = useState(false);
  const [filterFuel, setFilterFuel] = useState<string>("");
  const [form, setForm] = useState({
    gasStationName: "", fuelType: "gasolina_comum" as any,
    pricePerLiter: "", liters: "", totalAmount: "", mileage: "",
    recordedAt: new Date().toISOString().split("T")[0], notes: "",
  });

  const { data: records = [], refetch } = trpc.fuelHistory.list.useQuery(filterFuel ? { fuelType: filterFuel } : undefined);
  const { data: stats = [] } = trpc.fuelHistory.stats.useQuery(filterFuel ? { fuelType: filterFuel } : undefined);
  const { data: stations = [] } = trpc.fuelHistory.stations.useQuery();

  const createMutation = trpc.fuelHistory.create.useMutation({
    onSuccess: () => { toast.success("Abastecimento registrado!"); setOpen(false); setForm({ gasStationName: "", fuelType: "gasolina_comum", pricePerLiter: "", liters: "", totalAmount: "", mileage: "", recordedAt: new Date().toISOString().split("T")[0], notes: "" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.fuelHistory.delete.useMutation({
    onSuccess: () => { toast.success("Registro removido"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gasStationName || !form.pricePerLiter) return toast.error("Preencha os campos obrigatórios");
    createMutation.mutate({
      ...form,
      liters: form.liters || undefined,
      totalAmount: form.totalAmount || undefined,
      mileage: form.mileage ? parseInt(form.mileage) : undefined,
      notes: form.notes || undefined,
    });
  }

  const cheapestByStation = [...stats].sort((a, b) => a.lastPrice - b.lastPrice);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Combustível</h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe os preços dos postos e economize</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Registrar Abastecimento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Abastecimento</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Posto *</Label>
                <Input value={form.gasStationName} onChange={e => setForm(f => ({ ...f, gasStationName: e.target.value }))} placeholder="Nome do posto" list="stations-list" />
                <datalist id="stations-list">{stations.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <Label>Combustível *</Label>
                <Select value={form.fuelType} onValueChange={v => setForm(f => ({ ...f, fuelType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FUEL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço/Litro (R$) *</Label><Input type="number" step="0.001" value={form.pricePerLiter} onChange={e => setForm(f => ({ ...f, pricePerLiter: e.target.value }))} placeholder="0,000" /></div>
                <div><Label>Litros</Label><Input type="number" step="0.01" value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} placeholder="0,00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Total (R$)</Label><Input type="number" step="0.01" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="0,00" /></div>
                <div><Label>Km do veículo</Label><Input type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} placeholder="Ex: 45000" /></div>
              </div>
              <div><Label>Data *</Label><Input type="date" value={form.recordedAt} onChange={e => setForm(f => ({ ...f, recordedAt: e.target.value }))} /></div>
              <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" /></div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Registrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={filterFuel === "" ? "default" : "outline"} size="sm" onClick={() => setFilterFuel("")}>Todos</Button>
        {FUEL_TYPES.map(t => (
          <Button key={t.value} variant={filterFuel === t.value ? "default" : "outline"} size="sm" onClick={() => setFilterFuel(t.value)}>{t.label}</Button>
        ))}
      </div>

      {/* Comparativo de postos */}
      {stats.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-primary" />Comparativo por Posto</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {cheapestByStation.slice(0, 3).map((s, i) => (
                <div key={`${s.gasStationName}-${s.fuelType}`} className={`p-3 rounded-lg border ${i === 0 ? 'border-green-300 bg-green-50' : 'border-border bg-muted/30'}`}>
                  <p className="font-medium text-sm">{s.gasStationName}</p>
                  <p className="text-xs text-muted-foreground mb-1">{FUEL_TYPES.find(t => t.value === s.fuelType)?.label}</p>
                  <p className="text-xl font-bold">R$ {s.lastPrice.toFixed(3)}/L</p>
                  <p className="text-xs text-muted-foreground">Média: R$ {s.avgPrice.toFixed(3)}/L</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cheapestByStation}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="gasStationName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v.toFixed(2)}`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toFixed(3)}/L`} />
                <Bar dataKey="lastPrice" name="Último Preço" fill="var(--color-chart-3)" radius={[4,4,0,0]} />
                <Bar dataKey="avgPrice" name="Preço Médio" fill="var(--color-chart-2)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Fuel className="w-4 h-4 text-primary" />Histórico de Abastecimentos</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Fuel className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum abastecimento registrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Fuel className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{r.gasStationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {FUEL_TYPES.find(t => t.value === r.fuelType)?.label} • {String(r.recordedAt)}
                        {r.liters ? ` • ${r.liters}L` : ""}
                        {r.mileage ? ` • ${r.mileage.toLocaleString('pt-BR')} km` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-sm">R$ {parseFloat(r.pricePerLiter as string).toFixed(3)}/L</p>
                      {r.totalAmount && <p className="text-xs text-muted-foreground">{formatCurrency(parseFloat(r.totalAmount as string))}</p>}
                    </div>
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
